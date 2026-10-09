/** Phone / PC notifications: every new alert is pushed once to each device; dead devices are removed. */
import mongoose from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'

process.env.WEB_PUSH_PUBLIC_KEY = 'test-public-key'
process.env.WEB_PUSH_PRIVATE_KEY = 'test-private-key'

const sendNotification = vi.fn(async (sub: { endpoint: string }) => {
  if (sub.endpoint.includes('gone')) throw Object.assign(new Error('Gone'), { statusCode: 410 })
  return { statusCode: 201 }
})
vi.mock('web-push', () => ({ default: { setVapidDetails: vi.fn(), sendNotification: (...a: unknown[]) => sendNotification(...(a as [{ endpoint: string }])) } }))

const { ALL_MODELS, Notification, PushSubscription, User } = await import('@/server/db/models')
const { notify } = await import('@/server/services/common')
const { savePushSubscription } = await import('@/server/services/push')

let userId = ''
beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_push_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
  const u = await User.create({ name: 'Push Agent', email: 'pa@p.test', role: 'agent' })
  userId = String(u._id)
  await savePushSubscription(userId, { endpoint: 'https://push.example/phone', keys: { p256dh: 'p256dh-key-123', auth: 'auth-key-1' } }, 'Android')
  await savePushSubscription(userId, { endpoint: 'https://push.example/gone-laptop', keys: { p256dh: 'p256dh-key-456', auth: 'auth-key-2' } }, 'Windows')
})
afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  globalThis.__voltonMongoose = undefined
})

describe('push notifications', () => {
  it('a ping is pushed to every device, once; a dead device is removed', async () => {
    const ping = { userIds: [userId], type: 'manager_ping' as const, title: 'Bilal: Please call VL-00012 now', body: 'VL-00012', link: '/leads/x', dedupeKey: 'ping:test:1' }
    await notify(ping)
    expect(sendNotification).toHaveBeenCalledTimes(2)
    const [sub, payload] = sendNotification.mock.calls[0] as unknown as [{ endpoint: string }, string]
    expect(sub.endpoint).toBe('https://push.example/phone')
    expect(JSON.parse(payload)).toMatchObject({ title: 'Bilal: Please call VL-00012 now', body: 'VL-00012', link: '/leads/x' })
    expect(await PushSubscription.countDocuments({ userId })).toBe(1) // the 410 one is gone

    await notify(ping) // same alert again (dedupe) → no second push
    expect(sendNotification).toHaveBeenCalledTimes(2)
    expect(await Notification.countDocuments({ userId })).toBe(1)
  })

  it('a device that signs in as someone else now belongs to that person', async () => {
    const other = await User.create({ name: 'Other', email: 'o@p.test', role: 'agent' })
    await savePushSubscription(String(other._id), { endpoint: 'https://push.example/phone', keys: { p256dh: 'p256dh-key-123', auth: 'auth-key-1' } }, 'Android')
    expect(await PushSubscription.countDocuments({ userId })).toBe(0)
    expect(await PushSubscription.countDocuments({ userId: other._id })).toBe(1)
  })
})
