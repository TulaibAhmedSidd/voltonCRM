import 'server-only'
import webpush from 'web-push'
import { Types } from 'mongoose'
import { connectDb } from '@/server/db/connection'
import { PushSubscription } from '@/server/db/models'

/**
 * Phone / PC notifications (Web Push). Works on Android Chrome, desktop Chrome / Edge / Firefox, and iPhone when the
 * CRM is added to the Home Screen (iOS 16.4+). Every notify() also sends a push to the person's devices.
 */
let configured: boolean | null = null
function ready(): boolean {
  if (configured !== null) return configured
  const pub = process.env.WEB_PUSH_PUBLIC_KEY
  const priv = process.env.WEB_PUSH_PRIVATE_KEY
  configured = !!(pub && priv)
  if (configured) webpush.setVapidDetails(process.env.WEB_PUSH_SUBJECT || 'mailto:voltonsolarenergy@gmail.com', pub!, priv!)
  return configured
}

export const pushPublicKey = () => process.env.WEB_PUSH_PUBLIC_KEY || null

export interface PushPayload {
  title: string
  body?: string
  link?: string | null
  tag?: string
}

/** Send to every device of these users. Dead subscriptions (unsubscribed / expired) are removed. Never throws. */
export async function sendPush(userIds: string[], payload: PushPayload): Promise<number> {
  if (!ready() || !userIds.length) return 0
  try {
    await connectDb()
    const subs = await PushSubscription.find({ userId: { $in: userIds.map((id) => new Types.ObjectId(id)) } }).lean()
    const body = JSON.stringify({ title: payload.title.slice(0, 120), body: (payload.body ?? '').slice(0, 240), link: payload.link ?? '/dashboard', tag: payload.tag })
    let sent = 0
    await Promise.allSettled(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, body, { TTL: 60 * 60, urgency: 'high' })
          sent++
        } catch (error) {
          const status = (error as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) await PushSubscription.deleteOne({ _id: s._id })
          else console.error('[push]', status, (error as Error).message)
        }
      }),
    )
    return sent
  } catch (error) {
    console.error('[push]', error)
    return 0
  }
}

export async function savePushSubscription(userId: string, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent: string | null): Promise<void> {
  await connectDb()
  // One device = one endpoint. If someone else signed in on this device before, the device now belongs to this user.
  await PushSubscription.updateOne({ endpoint: sub.endpoint }, { $set: { userId: new Types.ObjectId(userId), keys: sub.keys, userAgent: userAgent?.slice(0, 300) ?? null } }, { upsert: true })
}

export async function removePushSubscription(userId: string, endpoint: string): Promise<void> {
  await connectDb()
  await PushSubscription.deleteOne({ endpoint, userId: new Types.ObjectId(userId) })
}
