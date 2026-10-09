/** Quotations from the lead page: who can make / see them, numbering, stage move, and the PDF route. */
import mongoose, { type Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ 'x-forwarded-for': '10.9.9.7' }),
}))
process.env.WHATSAPP_TOKEN = 'wa-test-token'
process.env.WHATSAPP_PHONE_NUMBER_ID = '700100200'
vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()), cache: <T,>(fn: T) => fn }))

const { ALL_MODELS, Activity, Department, Lead, Message, Quotation, User, WhatsAppNumber } = await import('@/server/db/models')
const { sendWhatsAppDocument } = await import('@/server/services/whatsapp')
const { ingestLead } = await import('@/server/services/ingest')
const { createQuotation, listQuotations, getQuotationFor } = await import('@/server/services/quotations')
const { defaultQuotation } = await import('@/domain/quotation')
const { startSession } = await import('@/server/auth/session')
const route = await import('@/app/api/quotations/[id]/pdf/route')
type SessionUser = import('@/server/auth/session').SessionUser

const asSession = (u: { _id: Types.ObjectId; name: string; email: string; role: string; departmentId?: Types.ObjectId | null }, code = 'INSTALLATION'): SessionUser =>
  ({ id: String(u._id), name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ? String(u.departmentId) : null, departmentCode: code, managerId: null, mustChangePassword: false }) as SessionUser

let agent: SessionUser
let otherAgent: SessionUser
let tradingMgr: SessionUser
let leadId = ''
const quote = { ...defaultQuotation(10), panelQty: 16, panelPrice: 24_500, inverterModel: 'GoodWe 12kW SP', inverterPrice: 365_000 }

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_quotations_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
  const [inst, trad] = await Department.create([
    { code: 'INSTALLATION', name: 'Installation', stages: [], routingKeywords: [] },
    { code: 'TRADING', name: 'Trading', stages: [], routingKeywords: [] },
  ])
  const [a, b, t] = await User.create([
    { name: 'Quote Agent', email: 'qa@q.test', role: 'agent', departmentId: inst._id, phone: '+923001112223' },
    { name: 'Other Agent', email: 'oa@q.test', role: 'agent', departmentId: inst._id },
    { name: 'Trading Mgr', email: 'tm@q.test', role: 'manager', departmentId: trad._id },
  ])
  agent = asSession(a)
  otherAgent = asSession(b)
  tradingMgr = asSession(t, 'TRADING')
  const r = await ingestLead({ name: 'Quote Customer', phone: '+923007700001', city: 'Karachi', department: 'INSTALLATION', channel: 'meta_webhook', agentId: agent.id, quiet: true })
  leadId = 'leadId' in r ? r.leadId : ''
})
afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  globalThis.__voltonMongoose = undefined
})

describe('quotations', () => {
  it('the lead agent issues numbered quotations; the lead moves to "Quotation sent"; it is in the timeline', async () => {
    const first = await createQuotation(agent, leadId, quote, { markSent: true })
    const second = await createQuotation(agent, leadId, { ...quote, discount: 10_000 }, { markSent: true })
    expect(first.quotationNo).toBe('VO-1001')
    expect(second.quotationNo).toBe('VO-1002')
    expect(second.total).toBe(first.total - 10_000)
    expect((await Lead.findById(leadId).lean())?.stage).toBe('quotation_sent')
    expect(await Activity.countDocuments({ leadId, type: 'quotation_issued' })).toBe(2)
    const saved = await Quotation.findById(first.id).lean()
    expect(saved).toMatchObject({ customer: { name: 'Quote Customer', phone: '+923007700001', address: 'Karachi' }, preparedBy: { name: 'Quote Agent', role: 'Sales Consultant', phone: '+923001112223' } })
    expect((await listQuotations(agent, leadId)).map((q) => q.quotationNo)).toEqual(['VO-1002', 'VO-1001'])
  })

  it('another agent / another department cannot make or see them; an empty or invalid quotation is refused', async () => {
    await expect(createQuotation(otherAgent, leadId, quote, { markSent: true })).rejects.toThrow(/not found|no longer yours/)
    const empty = { ...defaultQuotation(), panelModel: '', structurePrice: 0, wiringPrice: 0, labourPrice: 0, structureDetails: '', wiringDetails: '', protectionDetails: '', labourDetails: '' }
    await expect(createQuotation(agent, leadId, empty, { markSent: false })).rejects.toThrow(/at least one item/)
    await expect(createQuotation(agent, leadId, { ...quote, panelQty: -5 }, { markSent: false })).rejects.toThrow(/Check the quotation/)
    const any = await Quotation.findOne({ leadId }).lean()
    expect(await getQuotationFor(tradingMgr, String(any!._id))).toBeNull()
    expect(await listQuotations(otherAgent, leadId)).toEqual([])
  })

  it('PDF route: login needed, other department gets 404, the owner gets the PDF file', async () => {
    const id = String((await Quotation.findOne({ leadId }).lean())!._id)
    const req = (q = '') => new NextRequest(new URL(`/api/quotations/${id}/pdf${q}`, 'https://crm.test'))
    const params = { params: Promise.resolve({ id }) }
    jar.clear()
    expect((await route.GET(req(), params)).status).toBe(401)
    await startSession(tradingMgr.id)
    expect((await route.GET(req(), params)).status).toBe(404)
    jar.clear()
    await startSession(agent.id)
    const res = await route.GET(req('?download=1'), params)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
    expect(res.headers.get('content-disposition')).toMatch(/^attachment; filename="Volton-Quotation-VO-100\d-Quote-Customer\.pdf"$/)
    expect(Buffer.from(await res.arrayBuffer()).subarray(0, 8).toString()).toBe('%PDF-1.4')
  })
})

describe('send the quotation PDF on WhatsApp', () => {
  it('outside the 24-hour window it explains what to do; inside it uploads the PDF and sends it as a document', async () => {
    const lead = await Lead.findById(leadId).lean()
    const file = { data: Buffer.from('%PDF-1.4 test'), filename: 'Volton-Quotation-VO-1001.pdf', caption: 'Your quotation' }
    await expect(sendWhatsAppDocument(leadId, file, agent)).rejects.toThrow(/24 hours/)

    const number = await WhatsAppNumber.create({ phoneNumberId: '700100200', number: '+923000000099', ownerType: 'department', status: 'connected' })
    await Message.create({ waMessageId: 'wamid.q-in', contactId: lead!.contactId, leadId, numberId: number._id, direction: 'in', type: 'text', text: 'Please send the quote', sentFrom: 'customer', status: 'received', at: new Date() })
    const calls: { url: string; body: unknown }[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        calls.push({ url: String(url), body: init.body })
        if (String(url).endsWith('/media')) return Response.json({ id: 'MEDIA-1' })
        return Response.json({ messages: [{ id: 'wamid.q-doc' }] })
      }),
    )
    await sendWhatsAppDocument(leadId, file, agent)
    vi.unstubAllGlobals()
    expect(calls[0].url).toBe('https://graph.facebook.com/v23.0/700100200/media')
    expect(calls[0].body).toBeInstanceOf(FormData)
    expect(JSON.parse(String(calls[1].body))).toMatchObject({ to: '923007700001', type: 'document', document: { id: 'MEDIA-1', filename: 'Volton-Quotation-VO-1001.pdf', caption: 'Your quotation' } })
    expect(await Message.findOne({ waMessageId: 'wamid.q-doc' }).lean()).toMatchObject({ direction: 'out', type: 'document', sentFrom: 'api' })
  })
})
