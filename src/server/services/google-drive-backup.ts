import 'server-only'
import { createSign } from 'node:crypto'
import { AuditLog, Contact, FollowUp, Lead, Quotation, User } from '@/server/db/models'
import { connectDb } from '@/server/db/connection'
import { oid, UserError } from '@/server/services/common'
import type { SessionUser } from '@/server/auth/session'
import { runAutomatedBackup } from '@/server/services/backup'

export interface GoogleDriveConfigStatus {
  targetEmail: string
  isConfigured: boolean
  hasServiceAccount: boolean
  folderId?: string
}

export function getGoogleDriveConfigStatus(): GoogleDriveConfigStatus {
  const targetEmail = process.env.GOOGLE_DRIVE_BACKUP_EMAIL || 'voltonsolarenergy@gmail.com'
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  const isConfigured = Boolean(serviceEmail && privateKey)
  return {
    targetEmail,
    isConfigured,
    hasServiceAccount: Boolean(serviceEmail),
    folderId,
  }
}

/** Generate a signed Google OAuth2 JWT for Google Drive API v3 without third-party dependencies */
async function getGoogleDriveAccessToken(): Promise<string> {
  const serviceEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY

  if (!serviceEmail || !privateKey) {
    throw new UserError('Google Service Account credentials (GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) are not configured in .env.')
  }

  // Handle escaped newlines in env
  privateKey = privateKey.replace(/\\n/g, '\n')

  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: serviceEmail,
    scope: 'https://www.googleapis.com/auth/drive.file',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url')
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const unsignedToken = `${base64Header}.${base64Payload}`

  const signer = createSign('RSA-SHA256')
  signer.update(unsignedToken)
  signer.end()
  const signature = signer.sign(privateKey, 'base64url')
  const jwt = `${unsignedToken}.${signature}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new UserError(`Failed to authenticate with Google: ${errText}`)
  }

  const data = (await res.json()) as { access_token: string }
  return data.access_token
}

/** Upload file buffer/string to Google Drive */
async function uploadToDrive(options: {
  filename: string
  mimeType: string
  content: string | Buffer
  description?: string
}): Promise<{ fileId: string; webViewLink?: string }> {
  const token = await getGoogleDriveAccessToken()
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID

  const metadata: Record<string, unknown> = {
    name: options.filename,
    mimeType: options.mimeType,
    description: options.description || 'VoltOn Solar CRM Backup',
  }
  if (folderId) {
    metadata.parents = [folderId]
  }

  const boundary = `-------314159265358979323846`
  const delimiter = `\r\n--${boundary}\r\n`
  const closeDelimiter = `\r\n--${boundary}--`

  const contentBuffer = typeof options.content === 'string' ? Buffer.from(options.content, 'utf8') : options.content

  const multipartBody = Buffer.concat([
    Buffer.from(
      delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        `Content-Type: ${options.mimeType}\r\n\r\n`,
    ),
    contentBuffer,
    Buffer.from(closeDelimiter),
  ])

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new UserError(`Google Drive Upload Failed: ${errText}`)
  }

  const uploaded = (await res.json()) as { id: string; webViewLink?: string }
  return { fileId: uploaded.id, webViewLink: uploaded.webViewLink }
}

/** Backup all leads into Google Drive for voltonsolarenergy@gmail.com */
export async function backupLeadsToGoogleDrive(actor: SessionUser): Promise<{ ok: boolean; message: string; webViewLink?: string }> {
  await connectDb()
  const status = getGoogleDriveConfigStatus()

  if (!status.isConfigured) {
    return {
      ok: false,
      message: `Google Drive credentials not set in .env yet. Configure GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY for ${status.targetEmail}.`,
    }
  }

  const leads = await Lead.find().lean()
  const contacts = await Contact.find().lean()
  const contactMap = new Map(contacts.map((c) => [String(c._id), c]))

  const exportData = leads.map((l) => {
    const c = contactMap.get(String(l.contactId))
    return {
      leadNo: l.leadNo,
      customerName: c?.name ?? '—',
      phones: c?.phones ?? [],
      city: c?.city ?? '',
      area: c?.area ?? '',
      channel: l.source?.channel,
      stage: l.stage,
      status: l.status,
      attemptCount: l.attemptCount,
      receivedAt: l.receivedAt?.toISOString(),
      closedAt: l.closedAt?.toISOString() ?? null,
      notes: l.extra ?? null,
    }
  })

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `volton_leads_backup_${dateStr}.json`
  const jsonContent = JSON.stringify({
    exportedAt: new Date().toISOString(),
    account: status.targetEmail,
    leadCount: exportData.length,
    leads: exportData,
  }, null, 2)

  const uploadResult = await uploadToDrive({
    filename,
    mimeType: 'application/json',
    content: jsonContent,
    description: `Complete export of ${exportData.length} VoltOn Solar leads uploaded to ${status.targetEmail} Drive.`,
  })

  await AuditLog.create({
    entity: 'backup',
    entityId: null,
    action: 'export',
    actorId: oid(actor.id),
    at: new Date(),
    after: {
      target: status.targetEmail,
      leadsCount: exportData.length,
      fileId: uploadResult.fileId,
      filename,
    },
  })

  return {
    ok: true,
    message: `Successfully uploaded ${exportData.length} leads to Google Drive (${status.targetEmail}) as ${filename} ✓`,
    webViewLink: uploadResult.webViewLink,
  }
}

/** Backup full database snapshot into Google Drive for voltonsolarenergy@gmail.com */
export async function backupDatabaseToGoogleDrive(actor: SessionUser): Promise<{ ok: boolean; message: string; webViewLink?: string }> {
  await connectDb()
  const status = getGoogleDriveConfigStatus()

  if (!status.isConfigured) {
    return {
      ok: false,
      message: `Google Drive credentials not set in .env yet. Configure GOOGLE_SERVICE_ACCOUNT_EMAIL & GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY for ${status.targetEmail}.`,
    }
  }

  // Run automated snapshot
  const backupSnapshot = await runAutomatedBackup('manual', actor.id)
  if (backupSnapshot.status !== 'completed') {
    throw new UserError(`Database snapshot creation failed: ${backupSnapshot.error}`)
  }

  // Fetch full snapshot data
  const [leads, contacts, followUps, quotations, users] = await Promise.all([
    Lead.find().lean(),
    Contact.find().lean(),
    FollowUp.find().lean(),
    Quotation.find().lean(),
    User.find().select('-passwordHash -token').lean(),
  ])

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `volton_crm_full_db_backup_${dateStr}.json`
  const jsonContent = JSON.stringify({
    version: '1.0',
    timestamp: new Date().toISOString(),
    targetEmail: status.targetEmail,
    checksum: backupSnapshot.checksum,
    counts: backupSnapshot.counts,
    data: {
      leads,
      contacts,
      followUps,
      quotations,
      users,
    },
  }, null, 2)

  const uploadResult = await uploadToDrive({
    filename,
    mimeType: 'application/json',
    content: jsonContent,
    description: `VoltOn CRM Full Database Snapshot with SHA-256 integrity checksum (${backupSnapshot.checksum}).`,
  })

  await AuditLog.create({
    entity: 'backup',
    entityId: null,
    action: 'export',
    actorId: oid(actor.id),
    at: new Date(),
    after: {
      target: status.targetEmail,
      type: 'full_database',
      fileId: uploadResult.fileId,
      filename,
    },
  })

  return {
    ok: true,
    message: `Database backup uploaded to Google Drive (${status.targetEmail}) successfully as ${filename} ✓`,
    webViewLink: uploadResult.webViewLink,
  }
}
