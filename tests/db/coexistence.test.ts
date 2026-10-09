/**
 * WhatsApp Coexistence: connecting a number that stays in the WhatsApp Business app,
 * importing old chats / contact names, and replying from the right number.
 */
import mongoose from 'mongoose'
import { afterAll, afterEach, beforeAll, describe, expect, inject, it, vi } from 'vitest'

process.env.AUTH_SECRET = 'test-auth-secret-0123456789-abcdefghijklmnop'
process.env.META_APP_ID = '1410000000000001'
process.env.META_ES_CONFIG_ID = '2220000000000002'
process.env.WHATSAPP_APP_SECRET = 'app-secret'

const { ALL_MODELS, AuditLog, Contact, Lead, Message, WhatsAppNumber } = await import('@/server/db/models')
const { processWebhook } = await import('@/server/services/whatsapp')
const { completeEmbeddedSignup, senderFor } = await import('@/server/services/whatsapp-onboarding')
const { open, seal } = await import('@/server/services/secret-box')

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_coexistence_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
})
afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  globalThis.__voltonMongoose = undefined
})
afterEach(() => vi.unstubAllGlobals())

const actor = new mongoose.Types.ObjectId().toHexString()

describe('secret box', () => {
  it('round-trips and never stores the plain token', () => {
    const sealed = seal('EAA-secret-token')
    expect(sealed).not.toContain('EAA-secret-token')
    expect(open(sealed)).toBe('EAA-secret-token')
    expect(() => open(sealed.slice(0, -2) + 'xx')).toThrow()
  })
})

describe('Connect WhatsApp number (Embedded Signup + Coexistence)', () => {
  it('code → business token (encrypted), account subscribed, contacts + history asked; replies use that number', async () => {
    const calls: { method: string; path: string; auth: string | null; body?: string }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: URL | string, init?: RequestInit) => {
        const url = new URL(String(input))
        const path = url.pathname.replace('/v23.0/', '')
        calls.push({ method: init?.method ?? 'GET', path, auth: new Headers(init?.headers).get('authorization'), body: init?.body as string | undefined })
        if (path === 'oauth/access_token') return Response.json(url.searchParams.get('client_secret') === 'app-secret' ? { access_token: 'BIZ-TOKEN' } : { error: { message: 'bad secret' } })
        if (path === '555666777/phone_numbers') return Response.json({ data: [{ id: '777000111' }] })
        if (path === '777000111') return Response.json({ display_phone_number: '+92 300 1234567', verified_name: 'Volt On' })
        if (path === '555666777/subscribed_apps' || path === '777000111/smb_app_data') return Response.json({ success: true })
        return Response.json({ error: { message: `unexpected ${path}` } }, { status: 400 })
      }),
    )
    const r = await completeEmbeddedSignup({ code: 'one-time-code-1234567890', wabaId: '555666777', coexistence: true }, actor)
    expect(r).toMatchObject({ number: '+923001234567', displayName: 'Volt On', coexistence: true, warnings: [] })

    const n = await WhatsAppNumber.findOne({ phoneNumberId: '777000111' }).select('+tokenEnc').lean()
    expect(n).toMatchObject({ number: '+923001234567', wabaId: '555666777', coexistence: true, status: 'connected', ownerType: 'department' })
    expect(n?.tokenEnc).toBeTruthy()
    expect(n?.tokenEnc).not.toContain('BIZ-TOKEN')
    expect(await WhatsAppNumber.findOne({ phoneNumberId: '777000111' }).lean()).not.toHaveProperty('tokenEnc') // hidden by default

    expect(calls.some((c) => c.method === 'POST' && c.path === '555666777/subscribed_apps' && c.auth === 'Bearer BIZ-TOKEN')).toBe(true)
    const syncs = calls.filter((c) => c.path === '777000111/smb_app_data').map((c) => JSON.parse(c.body ?? '{}').sync_type)
    expect(syncs).toEqual(['smb_app_state_sync', 'history'])
    expect(await AuditLog.exists({ entity: 'whatsapp_number' })).toBeTruthy()

    expect(await senderFor(n!._id)).toEqual({ token: 'BIZ-TOKEN', phoneNumberId: '777000111' })
  })

  it('a refused code changes nothing', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ error: { message: 'code expired' } }, { status: 400 })))
    const before = await WhatsAppNumber.countDocuments()
    await expect(completeEmbeddedSignup({ code: 'one-time-code-expired-000', wabaId: '555666999', coexistence: true }, actor)).rejects.toThrow(/code expired/)
    expect(await WhatsAppNumber.countDocuments()).toBe(before)
  })
})

describe('Coexistence webhooks', () => {
  const value = (field: string, extra: object) => ({ entry: [{ changes: [{ field, value: { metadata: { phone_number_id: '777000111', display_phone_number: '923001234567' }, ...extra } }] }] })
  const ts = String(Math.floor(Date.now() / 1000) - 86_400)

  it('old chats are saved on the customer without opening a lead; replays are ignored; phone contact names fill in', async () => {
    const history = value('history', {
      history: [
        {
          metadata: { phase: 0, progress: 100 },
          threads: [
            {
              id: '923009922222',
              messages: [
                { id: 'wamid.h1', from: '923009922222', timestamp: ts, type: 'text', text: { body: 'Old question' }, history_context: { status: 'READ' } },
                { id: 'wamid.h2', from: '923001234567', timestamp: ts, type: 'text', text: { body: 'Old answer' }, history_context: { status: 'DELIVERED' } },
              ],
            },
          ],
        },
      ],
    })
    await processWebhook(history)
    await processWebhook(history) // Meta retry
    const contact = await Contact.findOne({ phones: '+923009922222' }).lean()
    expect(contact?.name).toBe('+923009922222')
    expect(await Lead.countDocuments({ contactId: contact!._id })).toBe(0)
    const msgs = await Message.find({ contactId: contact!._id }).sort({ waMessageId: 1 }).lean()
    expect(msgs.map((m) => [m.direction, m.sentFrom, m.status])).toEqual([
      ['in', 'customer', 'received'],
      ['out', 'app', 'delivered'],
    ])
    expect((await WhatsAppNumber.findOne({ phoneNumberId: '777000111' }).lean())?.historyMessages).toBe(2)

    await processWebhook(value('smb_app_state_sync', { state_sync: [{ type: 'contact', action: 'add', contact: { full_name: 'Old Customer', phone_number: '923009922222' } }] }))
    expect((await Contact.findOne({ phones: '+923009922222' }).lean())?.name).toBe('Old Customer')
  })

  it('the customer writing again later opens a lead with the old chat still there', async () => {
    await processWebhook(value('messages', { contacts: [{ wa_id: '923009922222', profile: { name: 'Old Customer' } }], messages: [{ id: 'wamid.new1', from: '923009922222', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'Still interested' } }] }))
    const contact = await Contact.findOne({ phones: '+923009922222' }).lean()
    expect(await Lead.countDocuments({ contactId: contact!._id, 'source.channel': 'whatsapp' })).toBe(1)
    expect(await Message.countDocuments({ contactId: contact!._id })).toBe(3)
  })

  it('a declined history share is shown on the number', async () => {
    await processWebhook(value('history', { history: [{ errors: [{ code: 2593109, message: 'Business declined to share chat history' }] }] }))
    expect((await WhatsAppNumber.findOne({ phoneNumberId: '777000111' }).lean())?.lastSyncError).toMatch(/declined/)
  })
})

describe('which customer a WhatsApp chat belongs to', () => {
  const value = (extra: object) => ({ entry: [{ changes: [{ field: 'messages', value: { metadata: { phone_number_id: '777000111', display_phone_number: '923001234567' }, ...extra } }] }] })
  it('a customer with a separate WhatsApp number: their chat goes on their lead (no duplicate customer or lead)', async () => {
    const { ingestLead } = await import('@/server/services/ingest')
    const r = await ingestLead({ name: 'Two Numbers', phone: '+923008800001', whatsapp: '+923008800002', department: null, channel: 'meta_webhook', quiet: true })
    if (r.status !== 'created') throw new Error(r.status)
    await processWebhook(value({ messages: [{ id: 'wamid.two1', from: '923008800002', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'Hi from my WhatsApp' } }] }))
    expect(await Contact.countDocuments({ $or: [{ phones: '+923008800002' }, { whatsappE164: '+923008800002' }] })).toBe(1)
    expect(await Lead.countDocuments({ 'source.channel': 'whatsapp', contactId: (await Contact.findOne({ phones: '+923008800001' }).lean())!._id })).toBe(0)
    expect(String((await Message.findOne({ waMessageId: 'wamid.two1' }).lean())?.leadId)).toBe(r.leadId)
    // a reply typed on the company phone to that WhatsApp number is matched too
    await processWebhook(value({ message_echoes: [{ id: 'wamid.two2', to: '923008800002', timestamp: String(Math.floor(Date.now() / 1000)), type: 'text', text: { body: 'Salam' } }] }))
    expect(String((await Message.findOne({ waMessageId: 'wamid.two2' }).lean())?.leadId)).toBe(r.leadId)
  })
})
