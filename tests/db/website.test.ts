/**
 * Website connection: voltonsolar.com asks the CRM to check a login (shared secret), and reads the team tree.
 */
import mongoose from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()), cache: <T,>(fn: T) => fn }))

const SECRET = 's'.repeat(40)
process.env.WEBSITE_SSO_SECRET = SECRET

const { ALL_MODELS, Department, Team, User } = await import('@/server/db/models')
const { hashPassword } = await import('@/server/auth/password')
const login = await import('@/app/api/website/login/route')
const team = await import('@/app/api/website/team/route')

const post = (body: unknown, auth = `Bearer ${SECRET}`) =>
  login.POST(new NextRequest('http://crm.test/api/website/login', { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(body) }))

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_website_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
  const inst = await Department.create({ code: 'INSTALLATION', name: 'Installation', stages: [], routingKeywords: [] })
  const passwordHash = await hashPassword('Correct#Pass1')
  const late = new Date('2027-01-01T00:00:00Z')
  const [owner, mgr] = await User.create([
    { name: 'Owner', email: 'owner@w.test', username: 'owner', role: 'super_admin', passwordHash },
    { name: 'Bilal Manager', email: 'bilal@w.test', username: 'bilal', role: 'manager', departmentId: inst._id, passwordHash },
  ])
  await User.create([
    { name: 'Ifran Agent', email: 'ifran@w.test', username: 'ifran', role: 'agent', departmentId: inst._id, passwordHash, jobTitle: null },
    { name: 'New Field', email: 'field@w.test', username: 'field', role: 'field_agent', departmentId: inst._id, passwordHash },
    { name: 'Gone Person', email: 'gone@w.test', username: 'gone', role: 'agent', departmentId: inst._id, passwordHash, isActive: false },
  ])
  // "New Field" joined after the website was connected → no website access by default
  await User.collection.updateOne({ username: 'field' }, { $set: { createdAt: late } })
  await User.collection.updateOne({ username: 'ifran' }, { $set: { createdAt: late } })
  await Team.create({ departmentId: inst._id, managerId: mgr._id, name: 'Installation', memberOrder: [] })
  void owner
})

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase()
  await mongoose.disconnect()
})

describe('POST /api/website/login', () => {
  it('needs the shared secret', async () => {
    expect((await post({ login: 'bilal', password: 'Correct#Pass1' }, 'Bearer wrong')).status).toBe(401)
  })
  it('right password → who they are and their website access (username or email)', async () => {
    const r = await post({ login: 'bilal', password: 'Correct#Pass1' })
    expect(r.status).toBe(200)
    expect((await r.json()).user).toMatchObject({ name: 'Bilal Manager', email: 'bilal@w.test', access: 'admin' })
    expect((await (await post({ login: 'IFRAN@w.test', password: 'Correct#Pass1' })).json()).user.access).toBe('editor')
  })
  it('wrong password, unknown person, inactive person, or no website access are refused', async () => {
    const wrong = await post({ login: 'bilal', password: 'nope' })
    expect(wrong.status).toBe(401)
    expect((await wrong.json()).unknown).toBe(false)
    expect((await (await post({ login: 'nobody@w.test', password: 'x' })).json()).unknown).toBe(true)
    expect((await post({ login: 'gone', password: 'Correct#Pass1' })).status).toBe(401)
    expect((await post({ login: 'field', password: 'Correct#Pass1' })).status).toBe(403)
  })
})

describe('GET /api/website/team', () => {
  it('lists active people as a tree, without phones or emails', async () => {
    const r = await team.GET(new NextRequest('http://crm.test/api/website/team', { headers: { authorization: `Bearer ${SECRET}` } }))
    const { team: people } = (await r.json()) as { team: { id: string; name: string; title: string; reportsTo: string | null; email?: string }[] }
    const by = (n: string) => people.find((p) => p.name === n)!
    expect(people.map((p) => p.name)).not.toContain('Gone Person')
    expect(by('Owner').reportsTo).toBeNull()
    expect(by('Bilal Manager').reportsTo).toBe(by('Owner').id)
    expect(by('Ifran Agent')).toMatchObject({ title: 'Call agent', reportsTo: by('Bilal Manager').id })
    expect(JSON.stringify(people)).not.toContain('@w.test')
    expect((await team.GET(new NextRequest('http://crm.test/api/website/team'))).status).toBe(401)
  })
})
