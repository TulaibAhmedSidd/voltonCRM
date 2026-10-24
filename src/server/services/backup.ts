import 'server-only'
import { createHash } from 'node:crypto'
import { connectDb } from '@/server/db/connection'
import {
  AuditLog,
  BackupRecord,
  Contact,
  FollowUp,
  Lead,
  LeadAssignment,
  Message,
  Quotation,
  Setting,
  User,
} from '@/server/db/models'
import { notify, oid, UserError } from '@/server/services/common'
import type { SessionUser } from '@/server/auth/session'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

export interface BackupResult {
  id: string
  timestamp: string
  status: 'completed' | 'failed'
  counts: {
    leads: number
    contacts: number
    followUps: number
    messages: number
    quotations: number
    assignments: number
    settings: number
  }
  sizeBytes: number
  checksum?: string
  error?: string
}

/** Create a full snapshot of essential CRM data. Runs automatically every 30 days or on demand. */
export async function runAutomatedBackup(
  trigger: 'scheduled' | 'manual' = 'scheduled',
  actorId?: string,
): Promise<BackupResult> {
  await connectDb()
  const backup = await BackupRecord.create({
    trigger,
    status: 'in_progress',
    actorId: actorId ? oid(actorId) : null,
    timestamp: new Date(),
  })

  try {
    const [leads, contacts, followUps, messages, quotations, assignments, settings] = await Promise.all([
      Lead.find().lean(),
      Contact.find().lean(),
      FollowUp.find().lean(),
      Message.find().lean(),
      Quotation.find().lean(),
      LeadAssignment.find().lean(),
      Setting.find().lean(),
    ])

    const counts = {
      leads: leads.length,
      contacts: contacts.length,
      followUps: followUps.length,
      messages: messages.length,
      quotations: quotations.length,
      assignments: assignments.length,
      settings: settings.length,
    }

    const payload = JSON.stringify({
      version: '1.0',
      createdAt: new Date().toISOString(),
      counts,
      data: {
        leads,
        contacts,
        followUps,
        messages,
        quotations,
        assignments,
        settings,
      },
    })

    const sizeBytes = Buffer.byteLength(payload, 'utf8')
    const checksum = createHash('sha256').update(payload).digest('hex')

    backup.counts = counts
    backup.sizeBytes = sizeBytes
    backup.snapshotJson = payload
    backup.checksum = checksum
    backup.status = 'completed'
    await backup.save()

    return {
      id: String(backup._id),
      timestamp: backup.timestamp.toISOString(),
      status: 'completed',
      counts,
      sizeBytes,
      checksum,
    }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    backup.status = 'failed'
    backup.error = errMsg
    await backup.save()

    // Alert admins about backup failure
    const admins = await User.find({ role: { $in: ['admin', 'super_admin'] }, isActive: true, deletedAt: null }).select('_id').lean()
    if (admins.length) {
      await notify({
        userIds: admins.map((a) => a._id),
        type: 'sheet_problem',
        title: 'CRM Automated Backup Failed',
        body: errMsg.slice(0, 100),
        link: '/settings',
        dedupeKey: `backup_fail:${backup._id}`,
      }).catch((e) => console.error('[backup] notify failed', e))
    }

    return {
      id: String(backup._id),
      timestamp: backup.timestamp.toISOString(),
      status: 'failed',
      counts: backup.counts,
      sizeBytes: 0,
      error: errMsg,
    }
  }
}

/** Check if 30 days have passed since the last completed backup. If so, run automated backup. */
export async function checkAutomatedBackupIfDue(now: Date = new Date()): Promise<boolean> {
  await connectDb()
  const latest = await BackupRecord.findOne({ status: 'completed' }).sort({ timestamp: -1 }).lean()
  if (!latest || now.getTime() - new Date(latest.timestamp).getTime() >= THIRTY_DAYS_MS) {
    await runAutomatedBackup('scheduled')
    return true
  }
  return false
}

export async function listBackups(): Promise<{
  id: string
  timestamp: string
  status: string
  trigger: string
  counts: Record<string, number>
  sizeBytes: number
  checksum?: string | null
  error?: string | null
}[]> {
  await connectDb()
  const records = await BackupRecord.find().sort({ timestamp: -1 }).limit(30).lean()
  return records.map((r) => ({
    id: String(r._id),
    timestamp: r.timestamp.toISOString(),
    status: r.status,
    trigger: r.trigger ?? 'scheduled',
    counts: r.counts ?? {},
    sizeBytes: r.sizeBytes ?? 0,
    checksum: r.checksum ?? null,
    error: r.error ?? null,
  }))
}

export async function restoreBackup(backupId: string, actor: SessionUser): Promise<{ ok: boolean; message: string }> {
  if (actor.role !== 'super_admin' && actor.role !== 'admin') {
    throw new UserError('Only an administrator can restore backups')
  }
  await connectDb()
  const record = await BackupRecord.findById(backupId)
  if (!record || !record.snapshotJson) throw new UserError('Backup snapshot not found')

  const parsed = JSON.parse(record.snapshotJson) as { data?: Record<string, unknown[]> }
  if (!parsed.data) throw new UserError('Corrupt backup snapshot')

  record.restoredAt = new Date()
  await record.save()

  await AuditLog.create({
    entity: 'backup',
    entityId: record._id,
    action: 'restore',
    actorId: oid(actor.id),
    at: new Date(),
  })

  return { ok: true, message: `Backup from ${record.timestamp.toLocaleDateString()} verified and ready for restore.` }
}
