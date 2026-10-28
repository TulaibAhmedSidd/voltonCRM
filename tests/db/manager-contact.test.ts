/**
 * "Send to manager" on quotations: who an employee's manager is, and the /api/me/manager answer.
 */
import mongoose from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()), cache: <T,>(fn: T) => fn }))

const { ALL_MODELS, Department, Team, User } = await import('@/server/db/models')
const { managerFor } = await import('@/server/services/manager-contact')

const ids: Record<string, string> = {}

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_manager_contact_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
  const sales = await Department.create({ code: 'TRADING', name: 'Trading', stages: [], routingKeywords: [] })
  const [boss, sara, noPhone, gone] = await User.create([
    { name: 'Ahsan Boss', email: 'boss@m.test', role: 'super_admin', phone: '+923001110000' },
    { name: 'Sara Manager', email: 'sara@m.test', role: 'manager', departmentId: sales._id, phone: '+923002220000' },
    { name: 'Nadia Manager', email: 'nadia@m.test', role: 'manager', departmentId: sales._id },
    { name: 'Old Manager', email: 'old@m.test', role: 'manager', departmentId: sales._id, phone: '+923003330000', isActive: false },
  ])
  const [inTeam, ownMgr, deptOnly, lone, withGone] = await User.create([
    { name: 'Team Agent', email: 'a1@m.test', role: 'agent', departmentId: sales._id },
    { name: 'Own Manager Agent', email: 'a2@m.test', role: 'agent', departmentId: sales._id, managerId: noPhone._id },
    { name: 'Dept Agent', email: 'a3@m.test', role: 'agent', departmentId: sales._id },
    { name: 'Lone Agent', email: 'a4@m.test', role: 'agent' },
    { name: 'Gone Mgr Agent', email: 'a5@m.test', role: 'agent', managerId: gone._id },
  ])
  await Team.create({ departmentId: sales._id, managerId: sara._id, name: 'Sales', memberOrder: [inTeam._id] })
  Object.assign(ids, { boss: String(boss._id), sara: String(sara._id), inTeam: String(inTeam._id), ownMgr: String(ownMgr._id), deptOnly: String(deptOnly._id), lone: String(lone._id), withGone: String(withGone._id) })
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
})

describe('managerFor', () => {
  it("finds the team's manager with their WhatsApp number", async () => {
    expect(await managerFor(ids.inTeam)).toEqual({ id: ids.sara, name: 'Sara Manager', phone: '+923002220000' })
  })

  it('prefers the manager set on the person, even without a number (the button then stays hidden)', async () => {
    expect(await managerFor(ids.ownMgr)).toMatchObject({ name: 'Nadia Manager', phone: null })
  })

  it("falls back to the department team's manager", async () => {
    expect(await managerFor(ids.deptOnly)).toMatchObject({ name: 'Sara Manager' })
  })

  it('never returns the person themselves, skips inactive managers, and is null when nobody is set', async () => {
    expect(await managerFor(ids.sara)).toBeNull()
    expect(await managerFor(ids.withGone)).toBeNull()
    expect(await managerFor(ids.lone)).toBeNull()
  })
})
