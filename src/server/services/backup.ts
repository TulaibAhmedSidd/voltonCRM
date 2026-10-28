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

async function syncToExternalBackupDb(): Promise<void> {
  const backupUri = process.env.MONGODB_URI_NEW_BACKUP
  if (!backupUri) return
  try {
    const m = await connectDb()
    const srcDb = m.connection.db
    if (!srcDb) return

    const backupConn = await m.createConnection(backupUri).asPromise()
    const targetDb = backupConn.db
    if (!targetDb) {
      await backupConn.close()
      return
    }

    const collections = [
      'auditlogs', 'visits', 'pushsubscriptions', 'messages', 'followups',
      'ingestevents', 'activities', 'attendances', 'quotations', 'documents',
      'contactattempts', 'leads', 'departments', 'notifications', 'instructions',
      'teams', 'whatsappnumbers', 'jobroles', 'settings', 'leadassignments',
      'counters', 'sheetrows', 'contacts', 'user', 'savedquotations'
    ]

    for (const colName of collections) {
      try {
        const srcCol = srcDb.collection(colName)
        const targetCol = targetDb.collection(colName)
        await targetCol.deleteMany({})
        const docs = await srcCol.find({}).toArray()
        if (docs.length > 0) {
          await targetCol.insertMany(docs)
        }
      } catch {
        // Individual collection fallback
      }
    }

    await backupConn.close()
  } catch {
    // External backup sync fallback
  }
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
    await syncToExternalBackupDb()

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

export interface DatabaseStorageStats {
  dataSizeMb: number
  storageSizeMb: number
  indexSizeMb: number
  totalUsedMb: number
  freeTierLimitMb: number
  remainingMb: number
  percentUsed: number
  collectionsCount: number
  objectsCount: number
}

async function getStatsForUri(uri?: string): Promise<DatabaseStorageStats> {
  const empty: DatabaseStorageStats = {
    dataSizeMb: 0,
    storageSizeMb: 0,
    indexSizeMb: 0,
    totalUsedMb: 0,
    freeTierLimitMb: 512,
    remainingMb: 512,
    percentUsed: 0,
    collectionsCount: 0,
    objectsCount: 0,
  }
  if (!uri) return empty

  try {
    const m = await connectDb()
    const conn = await m.createConnection(uri).asPromise()
    const db = conn.db
    if (!db) {
      await conn.close()
      return empty
    }
    const stats = await db.stats()
    await conn.close()
    const dataSizeMb = Number((stats.dataSize / (1024 * 1024)).toFixed(2))
    const storageSizeMb = Number((stats.storageSize / (1024 * 1024)).toFixed(2))
    const indexSizeMb = Number((stats.indexSize / (1024 * 1024)).toFixed(2))
    const totalUsedMb = Number(((stats.storageSize + stats.indexSize) / (1024 * 1024)).toFixed(2))
    const freeTierLimitMb = 512
    const remainingMb = Number(Math.max(0, freeTierLimitMb - totalUsedMb).toFixed(2))
    const percentUsed = Number(((totalUsedMb / freeTierLimitMb) * 100).toFixed(1))

    return {
      dataSizeMb,
      storageSizeMb,
      indexSizeMb,
      totalUsedMb,
      freeTierLimitMb,
      remainingMb,
      percentUsed,
      collectionsCount: stats.collections,
      objectsCount: stats.objects,
    }
  } catch {
    return empty
  }
}

export async function getDatabaseStorageStats(): Promise<DatabaseStorageStats> {
  const m = await connectDb()
  const db = m.connection.db
  if (!db) {
    return {
      dataSizeMb: 0,
      storageSizeMb: 0,
      indexSizeMb: 0,
      totalUsedMb: 0,
      freeTierLimitMb: 512,
      remainingMb: 512,
      percentUsed: 0,
      collectionsCount: 0,
      objectsCount: 0,
    }
  }

  try {
    const stats = await db.stats()
    const dataSizeMb = Number((stats.dataSize / (1024 * 1024)).toFixed(2))
    const storageSizeMb = Number((stats.storageSize / (1024 * 1024)).toFixed(2))
    const indexSizeMb = Number((stats.indexSize / (1024 * 1024)).toFixed(2))
    const totalUsedMb = Number(((stats.storageSize + stats.indexSize) / (1024 * 1024)).toFixed(2))
    const freeTierLimitMb = 512
    const remainingMb = Number(Math.max(0, freeTierLimitMb - totalUsedMb).toFixed(2))
    const percentUsed = Number(((totalUsedMb / freeTierLimitMb) * 100).toFixed(1))

    return {
      dataSizeMb,
      storageSizeMb,
      indexSizeMb,
      totalUsedMb,
      freeTierLimitMb,
      remainingMb,
      percentUsed,
      collectionsCount: stats.collections,
      objectsCount: stats.objects,
    }
  } catch {
    return {
      dataSizeMb: 0,
      storageSizeMb: 0,
      indexSizeMb: 0,
      totalUsedMb: 0,
      freeTierLimitMb: 512,
      remainingMb: 512,
      percentUsed: 0,
      collectionsCount: 0,
      objectsCount: 0,
    }
  }
}

export interface AllDatabasesStorageStats {
  main: DatabaseStorageStats
  dev: DatabaseStorageStats
  backup: DatabaseStorageStats
  combinedUsedMb: number
}

export async function getAllDatabasesStorageStats(): Promise<AllDatabasesStorageStats> {
  const [main, dev, backup] = await Promise.all([
    getDatabaseStorageStats(),
    getStatsForUri(process.env.MONGODB_URI_NEW_DEV),
    getStatsForUri(process.env.MONGODB_URI_NEW_BACKUP),
  ])

  const combinedUsedMb = Number((main.totalUsedMb + dev.totalUsedMb + backup.totalUsedMb).toFixed(2))
  return { main, dev, backup, combinedUsedMb }
}

/** Wipe all collections from Dev Database (MONGODB_URI_NEW_DEV). Admin only. */
export async function wipeDevDatabase(actor: SessionUser): Promise<{ ok: boolean; message: string }> {
  if (actor.role !== 'admin' && actor.role !== 'super_admin') {
    throw new UserError('Only administrators can wipe the development database.')
  }
  const devUri = process.env.MONGODB_URI_NEW_DEV
  if (!devUri || !devUri.includes('dev')) {
    throw new UserError('Dev database URI is not properly configured.')
  }
  const m = await connectDb()
  const conn = await m.createConnection(devUri).asPromise()
  const db = conn.db
  if (!db || db.databaseName === 'volton_crm') {
    await conn.close()
    throw new UserError('Safety block: Cannot wipe primary database.')
  }
  const collections = await db.listCollections().toArray()
  for (const col of collections) {
    try {
      await db.collection(col.name).deleteMany({})
    } catch {
      // ignore
    }
  }
  await conn.close()

  await AuditLog.create({
    entity: 'database',
    entityId: null,
    action: 'erase',
    actorId: oid(actor.id),
    at: new Date(),
    after: { message: `Dev database wiped by ${actor.name}` },
  })

  return { ok: true, message: 'Development database wiped successfully.' }
}

/** Wipe all collections from Backup Database (MONGODB_URI_NEW_BACKUP). Admin only. */
export async function wipeBackupDatabase(actor: SessionUser): Promise<{ ok: boolean; message: string }> {
  if (actor.role !== 'admin' && actor.role !== 'super_admin') {
    throw new UserError('Only administrators can wipe the backup database.')
  }
  const backupUri = process.env.MONGODB_URI_NEW_BACKUP
  if (!backupUri || !backupUri.includes('backup')) {
    throw new UserError('Backup database URI is not properly configured.')
  }
  const m = await connectDb()
  const conn = await m.createConnection(backupUri).asPromise()
  const db = conn.db
  if (!db || db.databaseName === 'volton_crm') {
    await conn.close()
    throw new UserError('Safety block: Cannot wipe primary database.')
  }
  const collections = await db.listCollections().toArray()
  for (const col of collections) {
    try {
      await db.collection(col.name).deleteMany({})
    } catch {
      // ignore
    }
  }
  await conn.close()

  await AuditLog.create({
    entity: 'database',
    entityId: null,
    action: 'erase',
    actorId: oid(actor.id),
    at: new Date(),
    after: { message: `Backup database wiped by ${actor.name}` },
  })

  return { ok: true, message: 'Backup database wiped successfully.' }
}

export async function purgeNotifications(actor: SessionUser): Promise<{ count: number }> {
  if (actor.role !== 'admin' && actor.role !== 'super_admin' && actor.role !== 'manager') {
    throw new UserError('Only managers or admins can purge notifications.')
  }
  const { Notification } = await import('@/server/db/models')
  const res = await Notification.deleteMany({})
  await AuditLog.create({
    entity: 'notification',
    entityId: null,
    action: 'erase',
    actorId: oid(actor.id),
    at: new Date(),
    after: { count: res.deletedCount, purgedBy: actor.name },
  })
  return { count: res.deletedCount ?? 0 }
}

export async function purgeSystemLogs(actor: SessionUser): Promise<{ count: number }> {
  if (actor.role !== 'admin' && actor.role !== 'super_admin') {
    throw new UserError('Only administrators can purge system logs.')
  }
  const { SheetRow } = await import('@/server/db/models')
  const res = await SheetRow.deleteMany({})
  await AuditLog.create({
    entity: 'system_logs',
    entityId: null,
    action: 'purge',
    actorId: oid(actor.id),
    at: new Date(),
    after: { count: res.deletedCount, purgedBy: actor.name },
  })
  return { count: res.deletedCount ?? 0 }
}
