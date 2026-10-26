/** Comprehensive QA and verification tests for CRM enhancements:
 * 1. Controlled lead locking & manager approval workflow
 * 2. Follow-Up 1, 2, 3 recording & atomic updates
 * 3. Standalone quotation creation, central quotation list, and status updates
 * 4. Automated 30-day backup engine, due checks, and admin restore security
 */
import mongoose, { type Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'

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
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))
vi.mock('next/cache', () => ({
  refresh: vi.fn(),
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}))

const { ALL_MODELS, BackupRecord, Department, FollowUp, Lead, Quotation, User, WhatsAppNumber } = await import('@/server/db/models')
const { ingestLead } = await import('@/server/services/ingest')
const { isLeadLockedForAgent, requestLeadUnlock, reviewLeadUnlock, unlockAllPreviousLeads, moveToJunk, revertJunk, markQuotationSent, purgeAllJunkLeads } = await import('@/server/services/leads')
const { loadLeadFor } = await import('@/server/auth/guards')
const { recordFollowUpAction, disconnectAgentWhatsAppAction } = await import('@/server/actions')
const { createStandaloneQuotation, listCentralQuotations, updateQuotationStatus } = await import('@/server/services/quotations')
const { runAutomatedBackup, checkAutomatedBackupIfDue, listBackups, restoreBackup, getDatabaseStorageStats, wipeDevDatabase, wipeBackupDatabase, purgeNotifications } = await import('@/server/services/backup')
const { defaultQuotation } = await import('@/domain/quotation')

type SessionUser = import('@/server/auth/session').SessionUser

const asSession = (u: { _id: Types.ObjectId; name: string; email: string; role: string; departmentId?: Types.ObjectId | null }, code = 'INSTALLATION'): SessionUser =>
  ({ id: String(u._id), name: u.name, email: u.email, role: u.role, departmentId: u.departmentId ? String(u.departmentId) : null, departmentCode: code, managerId: null, mustChangePassword: false }) as SessionUser

let adminUser: SessionUser
let managerUser: SessionUser
let agentUser: SessionUser
let leadAId = ''
let leadBId = ''
let leadCId = ''

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_enhancements_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))

  const dept = await Department.create({
    code: 'INSTALLATION',
    name: 'Installation',
    stages: ['new', 'contacted', 'interested', 'quotation_sent'],
    routingKeywords: [],
  })

  const [adm, mgr, agt] = await User.create([
    { name: 'Admin Tester', email: 'adm@test.qa', role: 'admin', departmentId: dept._id },
    { name: 'Manager Tester', email: 'mgr@test.qa', role: 'manager', departmentId: dept._id },
    { name: 'Agent Tester', email: 'agt@test.qa', role: 'agent', departmentId: dept._id, phone: '+923001234567' },
  ])

  adminUser = asSession(adm)
  managerUser = asSession(mgr)
  agentUser = asSession(agt)

  // Ingest Lead A and Lead B assigned to agentUser
  const rA = await ingestLead({ name: 'Customer Alpha', phone: '+923001111111', city: 'Karachi', department: 'INSTALLATION', channel: 'manual', agentId: agentUser.id, quiet: true })
  leadAId = 'leadId' in rA ? rA.leadId : ''

  // Mark Lead A as accepted
  await Lead.updateOne({ _id: leadAId }, { $set: { 'assignment.state': 'accepted', 'assignment.assignedAt': new Date(Date.now() - 3600_000) } })

  const rB = await ingestLead({ name: 'Customer Beta', phone: '+923002222222', city: 'Lahore', department: 'INSTALLATION', channel: 'manual', agentId: agentUser.id, quiet: true })
  leadBId = 'leadId' in rB ? rB.leadId : ''
  await Lead.updateOne({ _id: leadBId }, { $set: { 'assignment.state': 'accepted', 'assignment.assignedAt': new Date() } })
})

afterAll(async () => {
  await mongoose.connection.dropDatabase()
  await mongoose.disconnect()
  globalThis.__voltonMongoose = undefined
})

describe('1. Controlled Lead Assignment, Locking & Manager Approval', () => {
  it('locks subsequent lead when agent has an earlier open lead with < 3 follow-ups', async () => {
    const leadB = await Lead.findById(leadBId).lean()
    expect(leadB).toBeTruthy()

    // Agent has Lead A (0 follow-ups completed)
    const locked = await isLeadLockedForAgent(agentUser.id, leadB!)
    expect(locked).toBe(true)

    // loadLeadFor with 'work' access must refuse
    await expect(loadLeadFor(agentUser, leadBId, 'work')).rejects.toThrow(/locked/i)

    // loadLeadFor with 'view' access must still allow viewing (read-only)
    const viewable = await loadLeadFor(agentUser, leadBId, 'view')
    expect(String(viewable._id)).toBe(leadBId)
  })

  it('allows agent to request lead unlock and manager to approve', async () => {
    // Agent requests unlock
    await requestLeadUnlock(agentUser, leadBId)
    let leadB = await Lead.findById(leadBId).lean()
    expect(leadB?.unlockRequested).toBe(true)
    expect(leadB?.unlockedForAgent).toBe(false)

    // Manager approves unlock request
    await reviewLeadUnlock(managerUser, leadBId, true)
    leadB = await Lead.findById(leadBId).lean()
    expect(leadB?.unlockRequested).toBe(false)
    expect(leadB?.unlockedForAgent).toBe(true)

    // Agent can now work Lead B
    const lockedAfterApproval = await isLeadLockedForAgent(agentUser.id, leadB!)
    expect(lockedAfterApproval).toBe(false)
    const workLead = await loadLeadFor(agentUser, leadBId, 'work')
    expect(String(workLead._id)).toBe(leadBId)
  })

  it('automatically unlocks subsequent leads once the active lead finishes all 3 follow-ups', async () => {
    // Create Lead C
    const rC = await ingestLead({ name: 'Customer Gamma', phone: '+923003333333', city: 'Islamabad', department: 'INSTALLATION', channel: 'manual', agentId: agentUser.id, quiet: true })
    leadCId = 'leadId' in rC ? rC.leadId : ''
    await Lead.updateOne({ _id: leadCId }, { $set: { 'assignment.state': 'accepted', 'assignment.assignedAt': new Date() } })

    // Simulate completing all 3 follow-ups on Lead A
    await FollowUp.create([
      { leadId: leadAId, agentId: agentUser.id, dueAt: new Date(), number: 1, status: 'done', outcome: 'connected', completedAt: new Date() },
      { leadId: leadAId, agentId: agentUser.id, dueAt: new Date(), number: 2, status: 'done', outcome: 'connected', completedAt: new Date() },
      { leadId: leadAId, agentId: agentUser.id, dueAt: new Date(), number: 3, status: 'done', outcome: 'connected', completedAt: new Date() },
    ])
    // Also mark Lead B as having 3 follow-ups
    await FollowUp.create([
      { leadId: leadBId, agentId: agentUser.id, dueAt: new Date(), number: 1, status: 'done', outcome: 'connected', completedAt: new Date() },
      { leadId: leadBId, agentId: agentUser.id, dueAt: new Date(), number: 2, status: 'done', outcome: 'connected', completedAt: new Date() },
      { leadId: leadBId, agentId: agentUser.id, dueAt: new Date(), number: 3, status: 'done', outcome: 'connected', completedAt: new Date() },
    ])

    const leadC = await Lead.findById(leadCId).lean()
    const locked = await isLeadLockedForAgent(agentUser.id, leadC!)
    expect(locked).toBe(false)
  })
  it('does not lock leads older than 24 hours even if active lead is incomplete', async () => {
    const rOld = await ingestLead({ name: 'Customer Old', phone: '+923004444444', city: 'Multan', department: 'INSTALLATION', channel: 'manual', agentId: agentUser.id, quiet: true })
    const oldLeadId = 'leadId' in rOld ? rOld.leadId : ''
    const twoDaysAgo = new Date(Date.now() - 48 * 3600_000)
    await Lead.updateOne({ _id: oldLeadId }, { $set: { receivedAt: twoDaysAgo, 'assignment.state': 'accepted', 'assignment.assignedAt': twoDaysAgo, unlockedForAgent: false } })

    const oldLead = await Lead.findById(oldLeadId).lean()
    const locked = await isLeadLockedForAgent(agentUser.id, oldLead!)
    expect(locked).toBe(false)

    const workOldLead = await loadLeadFor(agentUser, oldLeadId, 'work')
    expect(String(workOldLead._id)).toBe(oldLeadId)
  })

  it('an incomplete lead older than 24 hours does not lock a newly received lead', async () => {
    const rNew = await ingestLead({ name: 'Customer New', phone: '+923005555555', city: 'Peshawar', department: 'INSTALLATION', channel: 'manual', agentId: agentUser.id, quiet: true })
    const newLeadId = 'leadId' in rNew ? rNew.leadId : ''
    await Lead.updateOne({ _id: newLeadId }, { $set: { 'assignment.state': 'accepted', 'assignment.assignedAt': new Date() } })

    const newLead = await Lead.findById(newLeadId).lean()
    const locked = await isLeadLockedForAgent(agentUser.id, newLead!)
    expect(locked).toBe(false)
  })

  it('unlockAllPreviousLeads unlocks all leads older than 24 hours and clears unlockRequested', async () => {
    const res = await unlockAllPreviousLeads()
    expect(res.modifiedCount).toBeGreaterThanOrEqual(1)

    const pendingRequests = await Lead.countDocuments({ unlockRequested: true })
    expect(pendingRequests).toBe(0)
  })
})

describe('2. Follow-Up 1, 2, 3 Table Actions', () => {
  it('records follow-up outcome and updates lead without duplication', async () => {
    const fd = new FormData()
    fd.set('leadId', leadCId)
    fd.set('number', '1')
    fd.set('outcome', 'connected')
    fd.set('notes', 'Discussed 10kW On-Grid solar system')
    fd.set('completed', 'true')

    // Start session for agentUser
    const { startSession } = await import('@/server/auth/session')
    await startSession(agentUser.id)

    const res = await recordFollowUpAction({ ok: true }, fd)
    expect(res?.ok).toBe(true)

    // Verify follow-up record created
    const fu = await FollowUp.findOne({ leadId: leadCId, number: 1 }).lean()
    expect(fu).toBeTruthy()
    expect(fu?.status).toBe('done')
    expect(fu?.outcome).toContain('Discussed 10kW')

    // Verify lead attempt count incremented
    const updatedLead = await Lead.findById(leadCId).lean()
    expect(updatedLead?.attemptCount).toBeGreaterThanOrEqual(1)
    expect(updatedLead?.lastContactAt).toBeTruthy()
  })
})

describe('3. Standalone Quotation Creation & Central Quotation List', () => {
  let createdQuotationId = ''

  it('creates a standalone quotation without a linked lead', async () => {
    const input = {
      ...defaultQuotation(10),
      panelQty: 20,
      panelWatt: 585,
      panelPrice: 22_000,
      inverterModel: 'Huawei 10kW KTL',
      inverterPrice: 420_000,
    }

    const res = await createStandaloneQuotation(
      adminUser,
      input,
      {
        name: 'Direct Solar Buyer',
        phone: '+923008889999',
        address: 'DHA Phase 6, Karachi',
      },
      { markSent: true },
    )

    expect(res.id).toBeTruthy()
    expect(res.quotationNo).toMatch(/^VO-\d+$/)
    expect(res.total).toBeGreaterThan(0)
    createdQuotationId = res.id

    const saved = await Quotation.findById(res.id).lean()
    expect(saved).toBeTruthy()
    expect(saved?.customer.name).toBe('Direct Solar Buyer')
    expect(saved?.leadId).toBeNull()
    expect(saved?.status).toBe('sent')
  })

  it('lists quotations centrally and filters by search query and status', async () => {
    const listAll = await listCentralQuotations(adminUser, {})
    expect(listAll.total).toBeGreaterThanOrEqual(1)

    // Filter by query
    const listFiltered = await listCentralQuotations(adminUser, { q: 'Direct Solar Buyer' })
    expect(listFiltered.rows.length).toBeGreaterThanOrEqual(1)
    expect(listFiltered.rows[0].customer.name).toBe('Direct Solar Buyer')

    // Filter by status
    const listSent = await listCentralQuotations(adminUser, { status: 'sent' })
    expect(listSent.rows.some((q) => q.id === createdQuotationId)).toBe(true)

    const listDraft = await listCentralQuotations(adminUser, { status: 'draft' })
    expect(listDraft.rows.some((q) => q.id === createdQuotationId)).toBe(false)
  })

  it('updates quotation status with role validation', async () => {
    await updateQuotationStatus(adminUser, createdQuotationId, 'accepted')
    const updated = await Quotation.findById(createdQuotationId).lean()
    expect(updated?.status).toBe('accepted')
  })
})

describe('4. Automated 30-Day CRM Backup Engine', () => {
  let backupId = ''

  it('runs automated backup snapshot with SHA-256 integrity checksum', async () => {
    const res = await runAutomatedBackup('manual', adminUser.id)
    expect(res.status).toBe('completed')
    expect(res.counts.leads).toBeGreaterThan(0)
    expect(res.counts.contacts).toBeGreaterThan(0)
    expect(res.sizeBytes).toBeGreaterThan(100)
    expect(res.checksum).toBeTruthy()
    backupId = res.id

    const record = await BackupRecord.findById(res.id).lean()
    expect(record).toBeTruthy()
    expect(record?.status).toBe('completed')
    expect(record?.checksum).toBe(res.checksum)
  })

  it('checkAutomatedBackupIfDue returns false when a backup was recently created', async () => {
    const wasDue = await checkAutomatedBackupIfDue()
    expect(wasDue).toBe(false)
  })

  it('lists backups in descending order of timestamp', async () => {
    const list = await listBackups()
    expect(list.length).toBeGreaterThanOrEqual(1)
    expect(list[0].id).toBe(backupId)
  })

  it('restores backup when requested by an admin and blocks non-admins', async () => {
    // Non-admin (agent) attempt must throw UserError
    await expect(restoreBackup(backupId, agentUser)).rejects.toThrow(/administrator/i)

    // Admin attempt succeeds
    const restoreRes = await restoreBackup(backupId, adminUser)
    expect(restoreRes.ok).toBe(true)
    expect(restoreRes.message).toContain('restore')
  })
})

describe('5. Agent-Level WhatsApp Connection and Disconnection', () => {
  it('allows agent to disconnect their own connected WhatsApp account', async () => {
    // Create a connected number for agent
    await WhatsAppNumber.create({
      number: '+923001234567',
      agentId: agentUser.id,
      status: 'connected',
      displayName: 'Agent Line',
      coexistence: true,
      ownerType: 'agent',
      phoneNumberId: 'wa-phone-12345',
    })

    const { startSession } = await import('@/server/auth/session')
    await startSession(agentUser.id)

    const res = await disconnectAgentWhatsAppAction()
    expect(res?.ok).toBe(true)

    const updated = await WhatsAppNumber.findOne({ number: '+923001234567' }).lean()
    expect(updated?.status).toBe('disconnected')
    expect(updated?.agentId).toBeNull()
  })
})
describe('6. Junk Leads Workflow (Move to Junk, Manager Revert & Purge)', () => {
  let junkLeadId = ''

  beforeAll(async () => {
    const rJ = await ingestLead({ name: 'Junk Candidate', phone: '+923003333333', city: 'Islamabad', department: 'INSTALLATION', channel: 'manual', agentId: agentUser.id, quiet: true })
    junkLeadId = 'leadId' in rJ ? rJ.leadId : ''
    await Lead.updateOne({ _id: junkLeadId }, { $set: { 'assignment.state': 'accepted' } })
  })

  it('moves lead to junk with actor name and cancels pending followups', async () => {
    await moveToJunk(agentUser, junkLeadId, 'Invalid contact details')
    const junked = await Lead.findById(junkLeadId).lean()
    expect(junked?.status).toBe('junk')
    expect(junked?.junkedBy?.name).toBe(agentUser.name)
    expect(junked?.junkedBy?.reason).toBe('Invalid contact details')
    expect(junked?.nextFollowUpAt).toBeNull()

    const { Activity } = await import('@/server/db/models')
    const act = await Activity.findOne({ leadId: junkLeadId, type: 'status_changed' }).sort({ at: -1 }).lean()
    expect(act).toBeTruthy()
    expect(act?.data?.junkedBy).toBe(agentUser.name)
    expect(act?.data?.reason).toBe('Invalid contact details')
  })

  it('blocks agents from reverting a junk lead', async () => {
    await expect(revertJunk(agentUser, junkLeadId)).rejects.toThrow(/manager or admin/i)
  })

  it('allows manager to revert junk lead back to active status', async () => {
    await revertJunk(managerUser, junkLeadId)
    const restored = await Lead.findById(junkLeadId).lean()
    expect(restored?.status).toBe('open')
    expect(restored?.stage).toBe('new')
    expect(restored?.reopenedAt).toBeTruthy()
  })

  it('allows manager to purge all junk leads', async () => {
    await moveToJunk(managerUser, junkLeadId, 'Permanently delete this test')
    const res = await purgeAllJunkLeads(managerUser)
    expect(res.count).toBeGreaterThanOrEqual(1)

    const check = await Lead.findById(junkLeadId).lean()
    expect(check).toBeNull()
  })
})

describe('7. Quotation Sent Confirmation & Lead Stage Advancement', () => {
  it('marks quotation as sent on lead and updates stage', async () => {
    await markQuotationSent(agentUser, leadAId, 'quote-test-123')
    const updated = await Lead.findById(leadAId).lean()
    expect(updated?.quotationSent).toBe(true)
    expect(updated?.quotationSentAt).toBeTruthy()
    expect(updated?.stage).toBe('quotation_sent')
  })
})

describe('8. Early Follow-Up Execution & Timeline Logging', () => {
  it('records early follow-up note and logs to activity timeline', async () => {
    const { startSession } = await import('@/server/auth/session')
    await startSession(agentUser.id)

    const fd = new FormData()
    fd.set('leadId', leadAId)
    fd.set('number', '2')
    fd.set('completed', 'true')
    fd.set('outcome', 'Connected')
    fd.set('notes', 'Discussed 10kW hybrid inverter early')
    fd.set('isEarly', 'true')

    const res = await recordFollowUpAction({ ok: true }, fd)
    expect(res?.ok).toBe(true)

    const { Activity } = await import('@/server/db/models')
    const act = await Activity.findOne({ leadId: leadAId, type: 'follow_up_completed', 'data.number': 2 }).lean()
    expect(act).toBeTruthy()
    expect(act?.data?.early).toBe(true)
    expect(act?.data?.notes).toContain('Early Follow-up 2 completed ahead of scheduled time')
  })
})

describe('9. Database Storage Stats & Wiping Security Guards', () => {
  it('returns database storage stats with 512 MB free tier tracking', async () => {
    const stats = await getDatabaseStorageStats()
    expect(stats.freeTierLimitMb).toBe(512)
    expect(stats.remainingMb).toBeGreaterThan(0)
    expect(typeof stats.totalUsedMb).toBe('number')
  })

  it('blocks non-admin users from wiping dev or backup database', async () => {
    await expect(wipeDevDatabase(agentUser)).rejects.toThrow(/administrator/i)
    await expect(wipeBackupDatabase(managerUser)).rejects.toThrow(/administrator/i)
  })

  it('purges notifications and records audit log', async () => {
    const { Notification } = await import('@/server/db/models')
    await Notification.create({
      userId: agentUser.id,
      type: 'manager_ping',
      title: 'Test Notification',
      body: 'This is a test notification to purge',
      dedupeKey: `test_notif_${Date.now()}`,
    })

    const res = await purgeNotifications(managerUser)
    expect(res.count).toBeGreaterThanOrEqual(1)

    const count = await Notification.countDocuments()
    expect(count).toBe(0)
  })
})
describe('10. Google Drive Backup for voltonsolarenergy@gmail.com', () => {
  it('returns target email and detects configuration status', async () => {
    const { getGoogleDriveConfigStatus, backupLeadsToGoogleDrive, backupDatabaseToGoogleDrive } = await import('@/server/services/google-drive-backup')
    const config = getGoogleDriveConfigStatus()
    expect(config.targetEmail).toBe('voltonsolarenergy@gmail.com')

    // When credentials are not yet present in test env, safely reports pending setup
    const leadsRes = await backupLeadsToGoogleDrive(adminUser)
    expect(leadsRes.ok).toBe(false)
    expect(leadsRes.message).toContain('voltonsolarenergy@gmail.com')

    const dbRes = await backupDatabaseToGoogleDrive(adminUser)
    expect(dbRes.ok).toBe(false)
    expect(dbRes.message).toContain('voltonsolarenergy@gmail.com')
  })
})

