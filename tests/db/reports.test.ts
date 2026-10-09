/**
 * Manager Excel report: what is in it, period, department scope, filters — and the download route's access rules.
 */
import mongoose, { type Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { sheetRows, unzip } from '../helpers/unzip'

const jar = new Map<string, string>()
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
  headers: async () => new Headers({ 'x-forwarded-for': '10.9.9.8' }),
}))
vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()), cache: <T,>(fn: T) => fn }))

const { ALL_MODELS, AuditLog, ContactAttempt, Department, User } = await import('@/server/db/models')
const { ingestLead } = await import('@/server/services/ingest')
const { buildLeadsReport } = await import('@/server/services/reports')
const { startSession } = await import('@/server/auth/session')
const route = await import('@/app/api/exports/leads/route')
type SessionUser = import('@/server/auth/session').SessionUser

const asSession = (u: { _id: Types.ObjectId; name: string; email: string; role: string; departmentId?: Types.ObjectId | null }, code = 'INSTALLATION'): SessionUser =>
  ({ id: String(u._id), name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ? String(u.departmentId) : null, departmentCode: code, managerId: null, mustChangePassword: false }) as SessionUser

let mgr: SessionUser
let agentUser: { _id: Types.ObjectId }
const DAY = 86_400_000

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_reports_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
  const [inst, trad] = await Department.create([
    { code: 'INSTALLATION', name: 'Installation', stages: [], routingKeywords: [] },
    { code: 'TRADING', name: 'Trading', stages: [], routingKeywords: [] },
  ])
  const [m, a, b] = await User.create([
    { name: 'Report Mgr', email: 'rm@r.test', role: 'manager', departmentId: inst._id },
    { name: 'Asad Agent', email: 'aa@r.test', role: 'agent', departmentId: inst._id },
    { name: 'Trading Agent', email: 'ta@r.test', role: 'agent', departmentId: trad._id },
  ])
  mgr = asSession(m)
  agentUser = a

  const today = await ingestLead({ name: 'Today Customer', phone: '+923007000001', city: 'Lahore', department: 'INSTALLATION', channel: 'meta_webhook', source: { platform: 'facebook', metaLeadId: 'rep-1', formName: 'Solar form' }, agentId: String(a._id), quiet: true })
  const old = await ingestLead({ name: 'Old Customer', phone: '+923007000002', department: 'INSTALLATION', channel: 'sheet', receivedAt: new Date(Date.now() - 40 * DAY), agentId: String(a._id), quiet: true })
  const oldUntouched = await ingestLead({ name: 'Untouched Old', phone: '+923007000003', department: 'INSTALLATION', channel: 'sheet', receivedAt: new Date(Date.now() - 40 * DAY), quiet: true })
  const otherDept = await ingestLead({ name: 'Trading Customer', phone: '+923007000004', department: 'TRADING', channel: 'manual', agentId: String(b._id), quiet: true })
  const id = (r: Awaited<ReturnType<typeof ingestLead>>) => ('leadId' in r ? r.leadId : '')
  void oldUntouched
  const now = new Date()
  await ContactAttempt.create([
    { leadId: id(today), agentId: a._id, channel: 'phone_call', serverTapAt: now, leftAt: new Date(now.getTime() - 95_000), returnedAt: now, result: 'connected', response: 'interested', remarks: 'Wants 10 kW', followUpNo: 1 },
    { leadId: id(old), agentId: a._id, channel: 'whatsapp_chat', serverTapAt: now, result: 'no_answer', proofStatus: 'flagged', flags: ['never_left_app'], followUpNo: 2 },
    { leadId: id(today), agentId: a._id, channel: 'whatsapp_chat', serverTapAt: now, cancelled: true },
    { leadId: id(otherDept), agentId: b._id, channel: 'phone_call', serverTapAt: now, result: 'connected' },
  ])
})
afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  globalThis.__voltonMongoose = undefined
})

const read = (file: Buffer) => {
  const parts = unzip(file)
  return { summary: sheetRows(parts.get('xl/worksheets/sheet1.xml')!), leads: sheetRows(parts.get('xl/worksheets/sheet2.xml')!), activity: sheetRows(parts.get('xl/worksheets/sheet3.xml')!) }
}

describe('Excel report', () => {
  it('today: leads received OR worked today, current status, per-employee summary, every try — own department only', async () => {
    const r = await buildLeadsReport(mgr, { period: { preset: 'today' }, filters: {}, baseUrl: 'https://crm.test' })
    const { summary, leads, activity } = read(r.file)
    expect(leads.map((row) => row[2]).slice(1).sort()).toEqual(['Old Customer', 'Today Customer']) // untouched old lead and the Trading lead are not in it
    const todayRow = leads.find((row) => row[2] === 'Today Customer')!
    expect(todayRow).toEqual(expect.arrayContaining(['Lahore', 'Installation', 'Facebook form', 'Solar form', 'Asad Agent', 'Connected', 'Interested', 'Wants 10 kW']))
    expect(todayRow.at(-1)).toMatch(/^https:\/\/crm\.test\/leads\/[a-f0-9]{24}$/)
    // Employee | assigned | tries | calls | WhatsApp | connected | not reached | interested | call back | not interested | won | flagged | mistaken
    expect(summary[1]).toEqual(['Asad Agent', '1', '2', '1', '1', '1', '1', '1', '0', '0', '0', '1', '1'])
    expect(summary.at(-1)?.[0]).toBe('TOTAL')
    expect(activity).toHaveLength(4) // header + 3 tries of this department (incl. the mistaken tap)
    expect(activity.some((row) => row.includes('Tapped by mistake (not a try)'))).toBe(true)
    expect(activity.find((row) => row.includes('Wants 10 kW'))).toContain('1:35')
  })

  it('a date range and the page filters narrow it', async () => {
    const older = await buildLeadsReport(mgr, { period: { from: '2000-01-01' }, filters: { source: 'sheet' }, baseUrl: 'https://crm.test' })
    expect(read(older.file).leads.map((row) => row[2]).slice(1).sort()).toEqual(['Old Customer', 'Untouched Old'])
  })
})

describe('GET /api/exports/leads', () => {
  const req = (q: string) => new NextRequest(new URL(`/api/exports/leads?${q}`, 'https://crm.test'))
  it('needs a manager / admin login', async () => {
    jar.clear()
    expect((await route.GET(req('period=today'))).status).toBe(401)
    await startSession(String(agentUser._id))
    expect((await route.GET(req('period=today'))).status).toBe(403)
  })
  it('returns an .xlsx download and writes the export in the audit log', async () => {
    jar.clear()
    await startSession(mgr.id)
    const res = await route.GET(req('period=this_week&source=facebook'))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('spreadsheetml')
    expect(res.headers.get('content-disposition')).toMatch(/attachment; filename="volton-leads-this-week-\d{4}-\d{2}-\d{2}\.xlsx"/)
    const { leads } = read(Buffer.from(await res.arrayBuffer()))
    expect(leads.map((row) => row[2]).slice(1)).toEqual(['Today Customer'])
    expect(await AuditLog.exists({ entity: 'lead', action: 'export' })).toBeTruthy()
  })
})
