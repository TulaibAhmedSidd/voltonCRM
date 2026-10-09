import 'server-only'
import { normalizePhone } from '@/lib/phone'
import { connectDb } from '@/server/db/connection'
import { AuditLog, User, WhatsAppNumber } from '@/server/db/models'
import { oid, UserError } from '@/server/services/common'
import { open, seal } from '@/server/services/secret-box'

/**
 * WhatsApp Coexistence: connect a number that already runs in the WhatsApp Business app, without moving it.
 * Flow: admin presses "Connect WhatsApp number" → Meta's Embedded Signup window (featureType
 * whatsapp_business_app_onboarding) → the phone confirms in the Business app → the browser gets a one-time code
 * → here: code → business token, subscribe the WhatsApp account to our app, save the number, ask Meta to send
 * the contacts and up to 6 months of chat history (must be asked within 24 h of onboarding).
 */
const GRAPH = 'https://graph.facebook.com/v23.0'

export function embeddedSignupConfig(): { appId: string; configId: string } | null {
  const appId = process.env.META_APP_ID
  const configId = process.env.META_ES_CONFIG_ID
  return appId && configId ? { appId, configId } : null
}

async function graph<T>(method: 'GET' | 'POST', path: string, token: string, params: Record<string, string> = {}, json?: unknown): Promise<T> {
  const url = new URL(`${GRAPH}/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url, {
    method,
    cache: 'no-store',
    headers: { Authorization: `Bearer ${token}`, ...(json ? { 'Content-Type': 'application/json' } : {}) },
    body: json ? JSON.stringify(json) : undefined,
  })
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } }
  if (!res.ok || body.error) throw new UserError(`Meta said: ${body.error?.message ?? `HTTP ${res.status}`}`)
  return body
}

export interface SignupResult {
  number: string
  displayName: string
  coexistence: boolean
  warnings: string[]
}

export async function completeEmbeddedSignup(input: { code: string; phoneNumberId?: string; wabaId?: string; agentId?: string | null; coexistence: boolean }, actorId: string): Promise<SignupResult> {
  await connectDb()
  const cfg = embeddedSignupConfig()
  const secret = process.env.META_APP_SECRET || process.env.WHATSAPP_APP_SECRET
  if (!cfg || !secret) throw new UserError('Embedded Signup is not set up yet — META_APP_ID and META_ES_CONFIG_ID are needed in Vercel.')
  if (!input.wabaId) throw new UserError('Meta did not return the WhatsApp account. Please try again and finish every step in the Meta window.')

  // 1. One-time code → business token (valid for this customer's WhatsApp account only).
  const url = new URL(`${GRAPH}/oauth/access_token`)
  url.searchParams.set('client_id', cfg.appId)
  url.searchParams.set('client_secret', secret)
  url.searchParams.set('code', input.code)
  const exchange = (await (await fetch(url, { cache: 'no-store' })).json()) as { access_token?: string; error?: { message?: string } }
  if (!exchange.access_token) throw new UserError(`Meta did not accept the sign-up code: ${exchange.error?.message ?? 'unknown error'}. Press Connect again.`)
  const token = exchange.access_token

  // 2. Which number? (the Business-app flow does not always send it to the browser)
  let phoneNumberId = input.phoneNumberId
  if (!phoneNumberId) {
    const list = await graph<{ data?: { id: string }[] }>('GET', `${input.wabaId}/phone_numbers`, token, { fields: 'id' })
    phoneNumberId = list.data?.[0]?.id
    if (!phoneNumberId) throw new UserError('No phone number was found in the connected WhatsApp account.')
  }
  const phone = await graph<{ display_phone_number?: string; verified_name?: string }>('GET', phoneNumberId, token, { fields: 'display_phone_number,verified_name' })
  const e164 = normalizePhone(`+${(phone.display_phone_number ?? '').replace(/\D/g, '')}`)
  if (!e164) throw new UserError('Meta returned a phone number the CRM cannot read.')

  // 3. Send this WhatsApp account's webhooks (messages, echoes, history) to our app.
  await graph('POST', `${input.wabaId}/subscribed_apps`, token)

  const agent = input.agentId ? await User.findOne({ _id: oid(input.agentId), role: { $in: ['agent', 'field_agent', 'manager'] }, deletedAt: null }).select('_id departmentId').lean() : null
  await WhatsAppNumber.updateOne(
    { phoneNumberId },
    {
      $set: {
        number: e164,
        displayName: phone.verified_name ?? null,
        wabaId: input.wabaId,
        coexistence: input.coexistence,
        tokenEnc: seal(token),
        status: 'connected',
        connectedAt: new Date(),
        ownerType: agent ? 'agent' : 'department',
        agentId: agent?._id ?? null,
        departmentId: agent?.departmentId ?? null,
        lastSyncError: null,
      },
    },
    { upsert: true },
  )

  // 4. Coexistence: ask for contacts + chat history now (Meta allows this only within 24 h of onboarding).
  const warnings: string[] = []
  if (input.coexistence) {
    for (const syncType of ['smb_app_state_sync', 'history'] as const) {
      try {
        await graph('POST', `${phoneNumberId}/smb_app_data`, token, {}, { messaging_product: 'whatsapp', sync_type: syncType })
      } catch (error) {
        warnings.push(`${syncType === 'history' ? 'Chat history' : 'Contacts'}: ${error instanceof Error ? error.message : 'failed'}`)
      }
    }
    await WhatsAppNumber.updateOne({ phoneNumberId }, { $set: { historySyncRequestedAt: new Date(), lastSyncError: warnings.join(' · ') || null } })
  }
  await AuditLog.create({ entity: 'whatsapp_number', entityId: null, action: 'create', after: { number: e164, phoneNumberId, wabaId: input.wabaId, coexistence: input.coexistence }, actorId: oid(actorId) })
  return { number: e164, displayName: phone.verified_name ?? e164, coexistence: input.coexistence, warnings }
}

/** Token + phone number id to send from. A connected (Embedded Signup) number uses its own token; else the env test number. */
export async function senderFor(numberId: unknown): Promise<{ token: string; phoneNumberId: string } | null> {
  if (numberId) {
    const n = await WhatsAppNumber.findById(numberId).select('+tokenEnc phoneNumberId status').lean()
    if (n?.tokenEnc && n.status === 'connected') return { token: open(n.tokenEnc), phoneNumberId: n.phoneNumberId }
  }
  const token = process.env.WHATSAPP_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  return token && phoneNumberId ? { token, phoneNumberId } : null
}
