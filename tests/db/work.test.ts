/** Custom roles, work instructions (statuses + who may change what), and the per-employee "gets leads" switch. */
import mongoose, { type Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'

const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ 'x-forwarded-for': '10.9.9.6' }),
}))
vi.mock('next/cache', () => ({ refresh: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()), cache: <T,>(fn: T) => fn }))

const { ALL_MODELS, Department, Instruction, Notification, Team, User } = await import('@/server/db/models')
const work = await import('@/server/services/work')
const { startSession } = await import('@/server/auth/session')
const { setAutoLeadsAction, createUserAction } = await import('@/server/actions')
type SessionUser = import('@/server/auth/session').SessionUser

const asSession = (u: { _id: Types.ObjectId; name: string; email: string; role: string; departmentId?: Types.ObjectId | null }, code = 'INSTALLATION'): SessionUser =>
  ({ id: String(u._id), name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ? String(u.departmentId) : null, departmentCode: code, managerId: null, mustChangePassword: false }) as SessionUser

let mgr: SessionUser
let agent: SessionUser
let otherDeptAgentId = ''
let teamId: Types.ObjectId

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_work_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
  const [inst, trad] = await Department.create([
    { code: 'INSTALLATION', name: 'Installation', stages: [], routingKeywords: [] },
    { code: 'TRADING', name: 'Trading', stages: [], routingKeywords: [] },
  ])
  const [m, a, o] = await User.create([
    { name: 'Work Mgr', email: 'wm@w.test', role: 'manager', departmentId: inst._id },
    { name: 'Work Agent', email: 'wa@w.test', role: 'agent', departmentId: inst._id },
    { name: 'Trading Agent', email: 'ta@w.test', role: 'agent', departmentId: trad._id },
  ])
  mgr = asSession(m)
  agent = asSession(a)
  otherDeptAgentId = String(o._id)
  teamId = (await Team.create({ departmentId: inst._id, managerId: m._id, name: 'Inst', memberOrder: [a._id] }))._id
})
afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  globalThis.__voltonMongoose = undefined
})

describe('custom roles', () => {
  it('a manager makes roles; a role without leads makes the person "staff", with leads a call agent', async () => {
    await work.createJobRole(mgr, { name: 'Installer', autoLeads: false, instructions: true })
    await work.createJobRole(mgr, { name: 'Senior Caller', autoLeads: true, instructions: true })
    await expect(work.createJobRole(mgr, { name: 'installer', autoLeads: true, instructions: true })).rejects.toThrow(/already exists/)
    await expect(work.createJobRole(mgr, { name: 'Manager', autoLeads: true, instructions: true })).rejects.toThrow(/built-in/)
    await expect(work.createJobRole(agent, { name: 'X Role', autoLeads: true, instructions: true })).rejects.toThrow(/Only a manager/)
    const roles = await work.listJobRoles(mgr)
    const installer = roles.find((r) => r.name === 'Installer')!
    expect(await work.resolveJobRole(mgr, installer.id)).toMatchObject({ role: 'staff', jobTitle: 'Installer' })

    jar.clear()
    await startSession(mgr.id)
    const fd = new FormData()
    for (const [k, v] of Object.entries({ name: 'Imran Installer', username: 'imran.installer', password: 'Strong-pass-77', role: `job:${installer.id}` })) fd.set(k, v)
    expect(await createUserAction(null, fd)).toMatchObject({ ok: true })
    expect(await User.findOne({ username: 'imran.installer' }).lean()).toMatchObject({ role: 'staff', jobTitle: 'Installer' })
  })
})

describe('work instructions', () => {
  it('manager gives work → assignee notified → assignee moves it to review → manager completes', async () => {
    const id = await work.createInstruction(mgr, { assigneeId: agent.id, title: 'Visit the Gulshan site', priority: 'urgent' })
    expect(await Notification.exists({ userId: agent.id, type: 'instruction' })).toBeTruthy()
    await work.updateInstruction(agent, id, { status: 'in_progress' })
    await expect(work.updateInstruction(agent, id, { status: 'completed' })).rejects.toThrow(/marks it Completed/)
    await work.updateInstruction(agent, id, { status: 'review', note: 'Done, photos sent' })
    expect(await Notification.countDocuments({ userId: mgr.id, type: 'instruction' })).toBe(2)
    await work.updateInstruction(mgr, id, { status: 'completed', note: 'Checked, thanks' })
    const doc = await Instruction.findById(id).lean()
    expect(doc?.status).toBe('completed')
    expect(doc?.completedAt).toBeTruthy()
    expect(doc?.updates.map((u: { status?: string | null }) => u.status)).toEqual(['todo', 'in_progress', 'review', 'completed'])
    const mine = await work.listInstructions(agent, 'mine')
    expect(mine.rows[0]).toMatchObject({ title: 'Visit the Gulshan site', priority: 'urgent', status: 'completed', mine: true })
  })

  it('cannot give work outside the department; outsiders cannot see or change it', async () => {
    await expect(work.createInstruction(mgr, { assigneeId: otherDeptAgentId, title: 'Not allowed' })).rejects.toThrow(/Choose a person/)
    const id = await work.createInstruction(agent, { assigneeId: mgr.id, title: 'Please approve my leave' })
    const outsider = asSession((await User.findById(otherDeptAgentId).lean())!, 'TRADING')
    await expect(work.updateInstruction(outsider, id, { note: 'hi' })).rejects.toThrow(/not found/)
  })
})

describe('gets leads automatically (Team page)', () => {
  it('turns a person on / off in the lead order; a staff member becomes a call agent', async () => {
    jar.clear()
    await startSession(mgr.id)
    const staff = await User.findOne({ username: 'imran.installer' }).lean()
    const set = (userId: string, on: boolean) => {
      const fd = new FormData()
      fd.set('userId', userId)
      fd.set('on', String(on))
      return setAutoLeadsAction(null, fd)
    }
    expect(await set(String(staff!._id), true)).toMatchObject({ ok: true })
    expect((await User.findById(staff!._id).lean())?.role).toBe('agent')
    expect((await Team.findById(teamId).lean())?.memberOrder.map(String)).toContain(String(staff!._id))
    expect(await set(agent.id, false)).toMatchObject({ ok: true })
    expect((await Team.findById(teamId).lean())?.memberOrder.map(String)).not.toContain(agent.id)
    expect(await set(otherDeptAgentId, true)).toMatchObject({ ok: false }) // other department
  })
})
