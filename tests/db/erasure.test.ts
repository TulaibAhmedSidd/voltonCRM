/** Privacy erasure: an admin permanently erases one customer; old data does not come back; a new enquiry still can. */
import mongoose, { type Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it } from 'vitest'

const { ALL_MODELS, Activity, AuditLog, Contact, ContactAttempt, Department, Erasure, Lead, Message, Quotation, User, WhatsAppNumber } = await import('@/server/db/models')
const { ingestLead } = await import('@/server/services/ingest')
const { eraseCustomer } = await import('@/server/services/erasure')
type SessionUser = import('@/server/auth/session').SessionUser

const asSession = (u: { _id: Types.ObjectId; name: string; email: string; role: string; departmentId?: Types.ObjectId | null }): SessionUser =>
  ({ id: String(u._id), name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ? String(u.departmentId) : null, departmentCode: 'INSTALLATION', managerId: null, mustChangePassword: false }) as SessionUser

let admin: SessionUser
let manager: SessionUser
let leadId = ''
let otherLeadId = ''
const PHONE = '+923006600001'

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_erasure_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
  const [inst] = await Department.create([
    { code: 'INSTALLATION', name: 'Installation', stages: [], routingKeywords: [] },
    { code: 'TRADING', name: 'Trading', stages: [], routingKeywords: [] },
  ])
  const [a, m, ag] = await User.create([
    { name: 'Admin', email: 'ad@e.test', role: 'admin' },
    { name: 'Mgr', email: 'mg@e.test', role: 'manager', departmentId: inst._id },
    { name: 'Agent', email: 'ag@e.test', role: 'agent', departmentId: inst._id },
  ])
  admin = asSession(a)
  manager = asSession(m)
  const r1 = await ingestLead({ name: 'Erase Me', phone: PHONE, whatsapp: '+923006600002', department: 'INSTALLATION', channel: 'meta_webhook', source: { metaLeadId: 'er-1', submittedAt: new Date(Date.now() - 5 * 86_400_000) }, agentId: String(ag._id), quiet: true })
  const r2 = await ingestLead({ name: 'Erase Me', phone: PHONE, department: 'TRADING', channel: 'manual', quiet: true })
  leadId = 'leadId' in r1 ? r1.leadId : ''
  otherLeadId = 'leadId' in r2 ? r2.leadId : ''
  const lead = await Lead.findById(leadId).lean()
  const n = await WhatsAppNumber.create({ phoneNumberId: '900', number: '+923000000900', ownerType: 'department', status: 'connected' })
  await Message.create({ waMessageId: 'wamid.er1', contactId: lead!.contactId, leadId, numberId: n._id, direction: 'in', type: 'text', text: 'my address is ...', sentFrom: 'customer', status: 'received', at: new Date() })
  await ContactAttempt.create({ leadId, agentId: ag._id, channel: 'phone_call', serverTapAt: new Date(), result: 'connected', remarks: 'lives in DHA' })
  await Quotation.create({ quotationNo: 'VO-9999', leadId, contactId: lead!.contactId, leadNo: 'VL-1', customer: { name: 'Erase Me', phone: PHONE }, preparedBy: { userId: ag._id, name: 'Agent', role: 'Sales' }, input: {}, subtotal: 1, total: 1, issuedAt: new Date(), validUntil: new Date() })
})
afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  globalThis.__voltonMongoose = undefined
})

describe('erase customer data', () => {
  it('only admins, and only with the right last 4 digits', async () => {
    await expect(eraseCustomer(manager, leadId, '0001')).rejects.toThrow(/Only an admin/)
    await expect(eraseCustomer(admin, leadId, '1234')).rejects.toThrow(/last 4 digits/)
    expect(await Contact.countDocuments({ phones: PHONE })).toBe(1)
  })

  it('removes the customer and everything linked, in every department; the log has counts only', async () => {
    const contactId = (await Lead.findById(leadId).lean())!.contactId
    const r = await eraseCustomer(admin, leadId, '0002') // the WhatsApp number's last 4 also works
    expect(r).toMatchObject({ leads: 2, messages: 1 })
    expect(await Lead.collection.countDocuments({ _id: { $in: [new mongoose.Types.ObjectId(leadId), new mongoose.Types.ObjectId(otherLeadId)] } })).toBe(0)
    expect(await Contact.collection.countDocuments({ _id: contactId })).toBe(0)
    expect(await Message.countDocuments({ contactId })).toBe(0)
    expect(await ContactAttempt.countDocuments({ leadId })).toBe(0)
    expect(await Quotation.countDocuments({ leadId })).toBe(0)
    expect(await Activity.collection.countDocuments({ leadId: new mongoose.Types.ObjectId(leadId) })).toBe(0)
    expect(await Erasure.countDocuments()).toBe(2) // both numbers, hashed
    const log = await AuditLog.findOne({ action: 'erase' }).lean()
    expect(JSON.stringify(log)).not.toContain('Erase Me')
    expect(JSON.stringify(log)).not.toContain('6600001')
  })

  it('old data (e.g. a Meta catch-up of the same form) is not imported again; a NEW enquiry is', async () => {
    const old = await ingestLead({ name: 'Erase Me', phone: PHONE, department: 'INSTALLATION', channel: 'meta_webhook', source: { metaLeadId: 'er-1', submittedAt: new Date(Date.now() - 5 * 86_400_000) }, quiet: true })
    expect(old.status).toBe('duplicate_row')
    const fresh = await ingestLead({ name: 'Back Again', phone: PHONE, department: 'INSTALLATION', channel: 'whatsapp', quiet: true })
    expect(fresh.status).toBe('created')
  })
})
