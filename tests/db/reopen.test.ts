/**
 * A lead closed by mistake (agent marked it Lost): the manager re-opens it as New with 3 fresh tries and gives it
 * straight back to the same agent (no Accept), another agent, or the queue. The pending close review is settled.
 */
import mongoose, { type Types } from 'mongoose'
import { afterAll, beforeAll, beforeEach, describe, expect, inject, it, vi } from 'vitest'

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()), cache: <T,>(fn: T) => fn }))

const { ALL_MODELS, ContactAttempt, Department, Lead, Team, User } = await import('@/server/db/models')
const { ingestLead } = await import('@/server/services/ingest')
const { reopenLead, reopenStages } = await import('@/server/services/leads')
type SessionUser = import('@/server/auth/session').SessionUser

const asSession = (u: { _id: Types.ObjectId; name: string; email: string; role: string; departmentId?: Types.ObjectId | null }): SessionUser =>
  ({ id: String(u._id), name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ? String(u.departmentId) : null, departmentCode: 'INSTALLATION', managerId: null, mustChangePassword: false }) as SessionUser

let mgr: SessionUser
let ifran: { _id: Types.ObjectId; name: string }
let bilal: { _id: Types.ObjectId; name: string }
let gone: { _id: Types.ObjectId }
let n = 0

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_reopen_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
  const inst = await Department.create({ code: 'INSTALLATION', name: 'Installation', stages: [], routingKeywords: [] })
  const [m, a, b, g] = await User.create([
    { name: 'Manager M', email: 'm@r.test', role: 'manager', departmentId: inst._id },
    { name: 'Ifran Ahmed', email: 'i@r.test', role: 'agent', departmentId: inst._id },
    { name: 'Bilal Khan', email: 'b@r.test', role: 'agent', departmentId: inst._id },
    { name: 'Gone Agent', email: 'g@r.test', role: 'agent', departmentId: inst._id, isActive: false },
  ])
  await Team.create({ departmentId: inst._id, managerId: m._id, name: 'Installation', memberOrder: [a._id, b._id], requireCheckIn: false })
  mgr = asSession(m)
  ifran = a
  bilal = b
  gone = g
})

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase()
  await mongoose.disconnect()
})

/** A lead Ifran worked 3 times and then closed as Lost, waiting for the manager's review. */
async function lostByMistake(agentId = ifran._id) {
  const r = await ingestLead({ name: `Customer ${++n}`, phone: `+92300700${String(1000 + n)}`, department: 'INSTALLATION', channel: 'manual', agentId: String(agentId), quiet: true })
  const id = 'leadId' in r ? r.leadId : ''
  await Lead.updateOne({ _id: id }, { $set: { status: 'lost', stage: 'lost', lostReason: 'not_interested', closedAt: new Date(), attemptCount: 3, noAnswerStreak: 2, closeReview: { status: 'pending' }, 'assignment.state': 'accepted', 'assignment.agentId': agentId } })
  await ContactAttempt.create({ leadId: id, agentId, channel: 'phone_call', serverTapAt: new Date(), outcomeAt: new Date(), result: 'connected', response: 'not_interested', flags: ['lead_closed'], review: { status: 'pending' } })
  return id
}

describe('re-open a lead closed by mistake', () => {
  beforeEach(() => {
    n += 10
  })

  it('back to the SAME agent as New: already accepted, 3 fresh tries, review settled', async () => {
    const id = await lostByMistake()
    const r = await reopenLead(mgr, id, { giveTo: 'same', note: 'Marked lost by mistake' })
    expect(r).toEqual({ agentName: 'Ifran Ahmed', stage: 'new' })
    const lead = await Lead.findById(id).lean()
    expect(lead).toMatchObject({ status: 'open', stage: 'new', attemptCount: 0, noAnswerStreak: 0, lostReason: null, closedAt: null })
    expect(lead?.reopenedAt).toBeInstanceOf(Date)
    expect(lead?.closeReview?.status).toBe('rejected') // no longer waiting in Proof review
    expect(lead?.assignment).toMatchObject({ state: 'accepted', method: 'manual' })
    expect(String(lead?.assignment?.agentId)).toBe(String(ifran._id))
    expect(await ContactAttempt.countDocuments({ leadId: id, 'review.status': 'pending' })).toBe(0)
  })

  it('to another agent, at another stage', async () => {
    const id = await lostByMistake()
    const r = await reopenLead(mgr, id, { giveTo: String(bilal._id), stage: 'interested' })
    expect(r).toEqual({ agentName: 'Bilal Khan', stage: 'interested' })
    expect(String((await Lead.findById(id).lean())?.assignment?.agentId)).toBe(String(bilal._id))
  })

  it('or to the next agent in order (round-robin)', async () => {
    const id = await lostByMistake()
    const r = await reopenLead(mgr, id, { giveTo: 'queue' })
    expect(r.agentName).toBeNull()
    expect((await Lead.findById(id).lean())?.status).toBe('open')
  })

  it('refuses won/lost as the new stage, an inactive agent, and an already open lead', async () => {
    const id = await lostByMistake()
    await expect(reopenLead(mgr, id, { stage: 'lost' })).rejects.toThrow(/stage/)
    await expect(reopenLead(mgr, id, { giveTo: String(gone._id) })).rejects.toThrow(/not active/)
    await reopenLead(mgr, id)
    await expect(reopenLead(mgr, id)).rejects.toThrow(/already open/)
    expect(reopenStages('TRADING')).not.toContain('site_survey')
    expect(reopenStages('INSTALLATION')).not.toContain('won')
  })
})
