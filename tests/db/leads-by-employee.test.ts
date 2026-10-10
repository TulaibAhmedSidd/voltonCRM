/**
 * Leads page → "Leads by employee": per-person counts (department scope, people with 0 leads, period),
 * and one person's list (Everything view, counts for that person only).
 */
import mongoose, { type Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()), cache: <T,>(fn: T) => fn }))

const { ALL_MODELS, Attendance, Department, Lead, User } = await import('@/server/db/models')
const { ingestLead } = await import('@/server/services/ingest')
const { employeeLeadStats, listLeads } = await import('@/server/services/queries')
const { pktDateKey } = await import('@/lib/dates-pkt')
type SessionUser = import('@/server/auth/session').SessionUser

const asSession = (u: { _id: Types.ObjectId; name: string; email: string; role: string; departmentId?: Types.ObjectId | null }, code = 'INSTALLATION'): SessionUser =>
  ({ id: String(u._id), name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ? String(u.departmentId) : null, departmentCode: code, managerId: null, mustChangePassword: false }) as SessionUser

let mgr: SessionUser
let admin: SessionUser
let ifran: { _id: Types.ObjectId }
let bilal: { _id: Types.ObjectId }
const DAY = 86_400_000

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_people_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
  const [inst, trad] = await Department.create([
    { code: 'INSTALLATION', name: 'Installation', stages: [], routingKeywords: [] },
    { code: 'TRADING', name: 'Trading', stages: [], routingKeywords: [] },
  ])
  const [m, ad, a, b, t] = await User.create([
    { name: 'People Mgr', email: 'pm@p.test', role: 'manager', departmentId: inst._id },
    { name: 'People Admin', email: 'pa@p.test', role: 'admin' },
    { name: 'Ifran Ahmed', email: 'if@p.test', role: 'agent', departmentId: inst._id },
    { name: 'Bilal Khan', email: 'bk@p.test', role: 'agent', departmentId: inst._id },
    { name: 'Trading Agent', email: 'tr@p.test', role: 'agent', departmentId: trad._id },
  ])
  mgr = asSession(m)
  admin = asSession(ad)
  ifran = a
  bilal = b
  const lead = async (phone: string, agentId: Types.ObjectId, extra: Record<string, unknown> = {}, department = 'INSTALLATION', receivedAt?: Date) => {
    const r = await ingestLead({ name: `C ${phone}`, phone, department: department as 'INSTALLATION', channel: 'manual', agentId: String(agentId), quiet: true, receivedAt })
    const id = 'leadId' in r ? r.leadId : ''
    if (Object.keys(extra).length) await Lead.updateOne({ _id: id }, { $set: extra })
    return id
  }
  await lead('+923008000001', a._id) // open, not contacted
  await lead('+923008000002', a._id, { attemptCount: 1, stage: 'interested', nextFollowUpAt: new Date(Date.now() - 3_600_000) }) // open, interested, overdue
  await lead('+923008000003', a._id, { status: 'won', stage: 'won', attemptCount: 2 })
  await lead('+923008000004', a._id, { status: 'unreachable', attemptCount: 3 }, 'INSTALLATION', new Date(Date.now() - 40 * DAY))
  await lead('+923008000005', t._id, {}, 'TRADING')
  await Attendance.create({ userId: a._id, date: pktDateKey(new Date()), status: 'checked_in', checkInAt: new Date() })
})

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase()
  await mongoose.disconnect()
})

describe('Leads by employee', () => {
  it('a manager sees the people of their department (also with 0 leads) with counts and check-in', async () => {
    const people = await employeeLeadStats(mgr)
    expect(people.map((p) => p.name)).toEqual(['Ifran Ahmed', 'Bilal Khan'])
    expect(people[0]).toMatchObject({ total: 4, open: 2, notContacted: 1, interested: 1, won: 1, closed: 1, overdueFollowUps: 1, onDuty: true })
    expect(people[1]).toMatchObject({ total: 0, open: 0, onDuty: false })
  })

  it('admins see every department; a period counts only leads received in it', async () => {
    expect((await employeeLeadStats(admin)).map((p) => p.name).sort()).toEqual(['Bilal Khan', 'Ifran Ahmed', 'Trading Agent'])
    const lastWeek = await employeeLeadStats(mgr, { range: { from: new Date(Date.now() - 7 * DAY) } })
    expect(lastWeek.find((p) => p.name === 'Ifran Ahmed')).toMatchObject({ total: 3, closed: 0 })
  })

  it("one person's page lists all their leads (Everything) and the view counts are theirs only", async () => {
    const r = await listLeads(mgr, { view: 'any', personId: String(ifran._id) })
    expect(r.total).toBe(4)
    expect(r.counts).toMatchObject({ any: 4, all: 2, won: 1, unreachable: 1 })
    const none = await listLeads(mgr, { view: 'any', personId: String(bilal._id) })
    expect(none.total).toBe(0)
    // agents cannot use it to see someone else's leads
    const asAgent = await listLeads(asSession({ _id: bilal._id, name: 'Bilal Khan', email: 'bk@p.test', role: 'agent', departmentId: null }), { view: 'any', personId: String(ifran._id) })
    expect(asAgent.total).toBe(0)
    expect(await employeeLeadStats(asSession({ _id: bilal._id, name: 'Bilal Khan', email: 'bk@p.test', role: 'agent' }))).toEqual([])
  })
})
