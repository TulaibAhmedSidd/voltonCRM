import 'server-only'
import { createHash } from 'node:crypto'
import { Types } from 'mongoose'
import { isAdminRole } from '@/server/auth/scope'
import type { SessionUser } from '@/server/auth/session'
import { connectDb } from '@/server/db/connection'
import {
  Activity,
  AuditLog,
  Contact,
  ContactAttempt,
  DocumentFile,
  Erasure,
  FollowUp,
  Job,
  Lead,
  LeadAssignment,
  Message,
  Notification,
  Quotation,
  SheetRow,
  Visit,
} from '@/server/db/models'
import { deletePrivateImages, isCloudinaryConfigured } from '@/server/services/cloudinary'
import { UserError } from '@/server/services/common'

/** One-way hash of an E.164 number (the same number always gives the same hash; the number cannot be read back). */
export const phoneHash = (e164: string) => createHash('sha256').update(`volton-erasure:${e164}`).digest('hex')

/** When this number was last erased (null = never). */
export async function erasureTime(e164: string): Promise<Date | null> {
  const hit = await Erasure.findOne({ phoneHash: phoneHash(e164) }).sort({ erasedAt: -1 }).select('erasedAt').lean()
  return hit?.erasedAt ?? null
}

/** True when this number was erased AFTER `submittedAt` — i.e. old data coming back, which must not be imported again. */
export async function erasedSince(e164: string, submittedAt?: Date | null): Promise<boolean> {
  const hit = await Erasure.findOne({ phoneHash: phoneHash(e164) }).sort({ erasedAt: -1 }).select('erasedAt').lean()
  if (!hit) return false
  return !submittedAt || submittedAt.getTime() < hit.erasedAt.getTime()
}

export interface EraseResult {
  leads: number
  messages: number
  files: number
}

/**
 * Privacy request: PERMANENTLY erase one customer — contact, every lead (all departments), messages, call records,
 * follow-ups, visits, quotations, timeline, files (Cloudinary too) and alerts that point to them.
 * Admins / super admin only. Only counts are written to the audit log (never the name or number).
 */
export async function eraseCustomer(user: SessionUser, leadId: string, confirmLast4: string): Promise<EraseResult> {
  if (!isAdminRole(user.role)) throw new UserError('Only an admin can erase customer data')
  if (!Types.ObjectId.isValid(leadId)) throw new UserError('Lead not found')
  await connectDb()
  const lead = await Lead.findById(leadId).select('contactId').lean()
  if (!lead) throw new UserError('Lead not found')
  const contact = await Contact.findById(lead.contactId).lean()
  if (!contact) throw new UserError('Customer not found')
  const numbers = [...new Set([...(contact.phones ?? []), contact.whatsappE164].filter((p): p is string => !!p))]
  if (!numbers.some((p) => p.replace(/\D/g, '').endsWith(confirmLast4.replace(/\D/g, '')) && confirmLast4.replace(/\D/g, '').length === 4)) {
    throw new UserError("Type the last 4 digits of the customer's phone number to confirm")
  }

  const leads = await Lead.collection.find({ contactId: contact._id }, { projection: { _id: 1 } }).toArray()
  const leadIds = leads.map((l) => l._id)
  const attempts = await ContactAttempt.find({ leadId: { $in: leadIds } }).select('_id').lean()
  const visits = await Visit.collection.find({ $or: [{ leadId: { $in: leadIds } }, { contactId: contact._id }] }, { projection: { _id: 1 } }).toArray()
  const owners = [...leadIds, ...attempts.map((a) => a._id), ...visits.map((v) => v._id)]
  const files = await DocumentFile.find({ ownerId: { $in: owners } }).select('_id storageKey').lean()

  // Files first: if the storage refuses, nothing else is touched and the admin can retry.
  const keys = files.map((f) => f.storageKey).filter(Boolean)
  if (keys.length && isCloudinaryConfigured()) await deletePrivateImages(keys)

  const byLead = { leadId: { $in: leadIds } }
  const messages = await Message.deleteMany({ contactId: contact._id })
  await Promise.all([
    DocumentFile.deleteMany({ _id: { $in: files.map((f) => f._id) } }),
    ContactAttempt.deleteMany(byLead),
    FollowUp.deleteMany(byLead),
    LeadAssignment.deleteMany(byLead),
    Job.deleteMany(byLead),
    Quotation.deleteMany({ $or: [byLead, { contactId: contact._id }] }),
    // Insert-only / soft-delete collections: removed at driver level on purpose (privacy erasure).
    Activity.collection.deleteMany(byLead),
    Visit.collection.deleteMany({ _id: { $in: visits.map((v) => v._id) } }),
    Notification.deleteMany({ $or: leadIds.map((id) => ({ link: new RegExp(`/leads/${String(id)}(\\b|$)`) })) }),
    // Keep the Sheet row key (it holds no personal data) so the row is not imported again; drop the link.
    SheetRow.updateMany(byLead, { $set: { leadId: null } }),
  ])
  await Lead.collection.deleteMany({ _id: { $in: leadIds } })
  await Contact.collection.deleteOne({ _id: contact._id })

  const erasedAt = new Date()
  await Erasure.insertMany(numbers.map((n) => ({ phoneHash: phoneHash(n), erasedAt, erasedBy: new Types.ObjectId(user.id) })))
  await AuditLog.create({ entity: 'customer', entityId: null, action: 'erase', after: { leads: leadIds.length, messages: messages.deletedCount, files: files.length }, actorId: new Types.ObjectId(user.id) })
  return { leads: leadIds.length, messages: messages.deletedCount ?? 0, files: files.length }
}
