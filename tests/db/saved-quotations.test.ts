/** Saved quotations: kept from every quotation (one per setup per department), saved by hand, who sees them, removing, and the API. */
import mongoose, { type Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

let sessionUser: unknown = null
vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()), cache: <T,>(fn: T) => fn }))
vi.mock('@/server/auth/session', async (importOriginal) => ({ ...(await importOriginal<typeof import('@/server/auth/session')>()), getSessionUser: async () => sessionUser }))

const { ALL_MODELS, AuditLog, Department, SavedQuotation, User } = await import('@/server/db/models')
const { ingestLead } = await import('@/server/services/ingest')
const { createQuotation, createStandaloneQuotation } = await import('@/server/services/quotations')
const { countSavedQuotations, deleteSavedQuotation, getSavedQuotationFor, listSavedQuotations, saveQuotationSetup, savedQuotationsPage } = await import('@/server/services/saved-quotations')
const { defaultQuotation } = await import('@/domain/quotation')
const listRoute = await import('@/app/api/quotations/saved/route')
const oneRoute = await import('@/app/api/quotations/saved/[id]/route')
const pdfRoute = await import('@/app/api/quotations/saved/[id]/pdf/route')
type SessionUser = import('@/server/auth/session').SessionUser

const asSession = (u: { _id: Types.ObjectId; name: string; email: string; role: string; departmentId?: Types.ObjectId | null }): SessionUser =>
  ({ id: String(u._id), name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ? String(u.departmentId) : null, departmentCode: null, managerId: null, mustChangePassword: false }) as SessionUser

let agent: SessionUser
let mate: SessionUser
let manager: SessionUser
let otherDept: SessionUser
let admin: SessionUser
let leadId = ''
const quote = { ...defaultQuotation(10), panelQty: 16, panelPrice: 24_500, inverterModel: 'GoodWe 12kW SP', inverterPrice: 365_000 }
const customer = { name: 'Walk-in Customer', phone: '03001234567' }

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_saved_quotations_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
  const [inst, trad] = await Department.create([
    { code: 'INSTALLATION', name: 'Installation', stages: [], routingKeywords: [] },
    { code: 'TRADING', name: 'Trading', stages: [], routingKeywords: [] },
  ])
  const [a, b, m, t, s] = await User.create([
    { name: 'Saver Agent', email: 'sa@s.test', role: 'agent', departmentId: inst._id },
    { name: 'Team Mate', email: 'tm@s.test', role: 'agent', departmentId: inst._id },
    { name: 'Inst Manager', email: 'im@s.test', role: 'manager', departmentId: inst._id },
    { name: 'Trading Agent', email: 'ta@s.test', role: 'agent', departmentId: trad._id },
    { name: 'Boss', email: 'boss@s.test', role: 'admin' },
  ])
  ;[agent, mate, manager, otherDept, admin] = [a, b, m, t, s].map(asSession)
  const r = await ingestLead({ name: 'Saved Customer', phone: '+923007700002', city: 'Karachi', department: 'INSTALLATION', channel: 'meta_webhook', agentId: agent.id, quiet: true })
  leadId = 'leadId' in r ? r.leadId : ''
})
afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  globalThis.__voltonMongoose = undefined
})

describe('saved quotations', () => {
  it('every quotation is kept once per setup: the same setup again counts a use, a different one is a new saved quotation', async () => {
    const first = await createQuotation(agent, leadId, { ...quote, notes: 'Customer wants it before Eid' }, { markSent: false })
    await createStandaloneQuotation(agent, { ...quote, notes: 'another note' }, customer)
    const rows = await SavedQuotation.find().lean()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      name: '10 kW Hybrid · 16 × LONGi Hi-MO X10 645W · GoodWe 12kW SP · Rs 852,000',
      total: 852_000,
      useCount: 2,
      sourceQuotationNo: first.quotationNo,
      madeBy: { name: 'Saver Agent', role: 'Sales Consultant' },
      lastUsedBy: 'Saver Agent',
    })
    // the note was written for one customer — not kept
    expect((rows[0].input as { notes: string }).notes).toBe('')

    await createStandaloneQuotation(agent, { ...quote, discount: 2_000 }, customer)
    expect(await SavedQuotation.countDocuments()).toBe(2)
  })

  it('a setup can be saved by hand with a name; saving it again only renames it', async () => {
    const setup = { ...quote, systemKw: 6, panelQty: 10, inverterModel: 'iTel 6kW Pro Hybrid IP54' }
    const r = await saveQuotationSetup(mate, setup, 'Gulshan 6 kW standard')
    expect(r).toMatchObject({ name: 'Gulshan 6 kW standard', existed: false })
    const again = await saveQuotationSetup(mate, setup, 'Gulshan 6 kW — best seller')
    expect(again).toMatchObject({ id: r.id, existed: true, name: 'Gulshan 6 kW — best seller' })
    expect(await SavedQuotation.findById(r.id).lean()).toMatchObject({ useCount: 0, sourceQuotationNo: null, madeBy: { name: 'Team Mate' } })
    const empty = { ...defaultQuotation(), panelModel: '', structurePrice: 0, wiringPrice: 0, labourPrice: 0, structureDetails: '', wiringDetails: '', protectionDetails: '', labourDetails: '' }
    await expect(saveQuotationSetup(mate, empty)).rejects.toThrow(/at least one item/)
    await expect(saveQuotationSetup(mate, { ...quote, panelQty: -1 })).rejects.toThrow(/Check the quotation/)
  })

  it('the department shares its saved quotations; another department does not see them; admins see all', async () => {
    expect((await listSavedQuotations(mate)).length).toBe(3)
    expect(await countSavedQuotations(agent)).toBe(3)
    expect(await listSavedQuotations(otherDept)).toEqual([])
    expect(await countSavedQuotations(admin)).toBe(3)
    const [one] = await listSavedQuotations(agent, { q: 'gulshan' })
    expect(one).toMatchObject({ name: 'Gulshan 6 kW — best seller', madeBy: 'Team Mate', canDelete: false })
    expect(await getSavedQuotationFor(otherDept, one.id)).toBeNull()
    const detail = await getSavedQuotationFor(agent, one.id)
    expect(detail?.input).toMatchObject({ systemKw: 6, panelQty: 10, inverterModel: 'iTel 6kW Pro Hybrid IP54' })
    const page = await savedQuotationsPage(agent)
    expect(page.total).toBe(3)
    expect(page.rows[0].input.panelPrice).toBe(24_500)
  })

  it('only the person who saved it, their manager or an admin can remove it; the same setup can then be saved again', async () => {
    const [one] = await listSavedQuotations(agent, { q: 'gulshan' })
    await expect(deleteSavedQuotation(agent, one.id)).rejects.toThrow(/Only the person who saved it/)
    await expect(deleteSavedQuotation(otherDept, one.id)).rejects.toThrow(/not found/)
    await deleteSavedQuotation(manager, one.id)
    expect(await listSavedQuotations(agent, { q: 'gulshan' })).toEqual([])
    expect(await AuditLog.countDocuments({ entity: 'saved_quotation', action: 'soft_delete' })).toBe(1)
    const back = await saveQuotationSetup(mate, { ...quote, systemKw: 6, panelQty: 10, inverterModel: 'iTel 6kW Pro Hybrid IP54' })
    expect(back.existed).toBe(false)
  })

  it('API: list, one with its form, and a sample PDF — only when signed in and allowed', async () => {
    sessionUser = null
    expect((await listRoute.GET(new NextRequest('http://crm.test/api/quotations/saved'))).status).toBe(401)
    sessionUser = agent
    const list = (await (await listRoute.GET(new NextRequest('http://crm.test/api/quotations/saved'))).json()) as { rows: { id: string; name: string }[] }
    expect(list.rows.length).toBe(3)
    const id = list.rows[0].id
    const one = await oneRoute.GET(new Request(`http://crm.test/api/quotations/saved/${id}`), { params: Promise.resolve({ id }) })
    expect(((await one.json()) as { saved: { input: { template: string } } }).saved.input.template).toBe('classic')
    const pdf = await pdfRoute.GET(new NextRequest(`http://crm.test/api/quotations/saved/${id}/pdf`), { params: Promise.resolve({ id }) })
    expect(pdf.headers.get('content-type')).toBe('application/pdf')
    expect(Buffer.from(await pdf.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-')
    sessionUser = otherDept
    expect((await oneRoute.GET(new Request(`http://crm.test/api/quotations/saved/${id}`), { params: Promise.resolve({ id }) })).status).toBe(404)
    expect((await pdfRoute.GET(new NextRequest(`http://crm.test/api/quotations/saved/${id}/pdf`), { params: Promise.resolve({ id }) })).status).toBe(404)
  })
})
