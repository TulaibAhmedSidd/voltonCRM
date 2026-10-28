import 'server-only'
import { createHash } from 'node:crypto'
import { QUOTE_ROLE_TITLE, quotationInput, quotationLines, savedQuotationName, savedQuotationSetup, type QuotationInput } from '@/domain/quotation'
import type { SavedQuotationDetail, SavedQuotationItem } from '@/domain/view-models'
import { isObjectId } from '@/server/auth/guards'
import type { SessionUser } from '@/server/auth/session'
import { isAdminRole } from '@/server/auth/scope'
import { connectDb } from '@/server/db/connection'
import { AuditLog, SavedQuotation, User } from '@/server/db/models'
import { oid, UserError } from '@/server/services/common'

/** The same setup always gives the same fingerprint: the form is re-parsed, so keys come in schema order. */
const fingerprintOf = (setup: QuotationInput) => createHash('sha256').update(JSON.stringify(setup)).digest('hex')

function parseSetup(raw: unknown): QuotationInput {
  const parsed = quotationInput.safeParse(raw)
  if (!parsed.success) {
    throw new UserError(`Check the quotation: ${parsed.error.issues[0]?.path.join('.')} — ${parsed.error.issues[0]?.message}`)
  }
  return savedQuotationSetup(parsed.data)
}

/**
 * Who sees a saved quotation: admins all; everyone else their department's, the company-wide ones (saved by someone
 * without a department) and their own.
 */
function savedScope(user: SessionUser): Record<string, unknown> {
  if (isAdminRole(user.role)) return { deletedAt: null }
  const or: Record<string, unknown>[] = [{ departmentId: null }, { 'madeBy.userId': oid(user.id) }]
  if (user.departmentId) or.push({ departmentId: oid(user.departmentId) })
  return { deletedAt: null, $or: or }
}

type SavedLean = {
  _id: unknown
  name: string
  departmentId?: unknown
  input?: unknown
  systemType?: string | null
  systemKw?: number | null
  total: number
  madeBy: { userId: unknown; name: string }
  sourceQuotationNo?: string | null
  useCount?: number | null
  lastUsedAt?: Date | null
  lastUsedBy?: string | null
  createdAt?: Date
}

function canDelete(user: SessionUser, s: SavedLean): boolean {
  if (isAdminRole(user.role) || String(s.madeBy.userId) === user.id) return true
  return user.role === 'manager' && !!user.departmentId && String(s.departmentId ?? '') === user.departmentId
}

function toItem(user: SessionUser, s: SavedLean): SavedQuotationItem {
  return {
    id: String(s._id),
    name: s.name,
    systemType: s.systemType ?? '',
    systemKw: s.systemKw ?? 0,
    total: s.total,
    madeBy: s.madeBy.name,
    madeAt: (s.createdAt ?? new Date(0)).toISOString(),
    sourceQuotationNo: s.sourceQuotationNo ?? null,
    useCount: s.useCount ?? 0,
    lastUsedAt: s.lastUsedAt ? s.lastUsedAt.toISOString() : null,
    lastUsedBy: s.lastUsedBy ?? null,
    canDelete: canDelete(user, s),
  }
}

function toDetail(user: SessionUser, s: SavedLean): SavedQuotationDetail | null {
  const parsed = quotationInput.safeParse(s.input)
  return parsed.success ? { ...toItem(user, s), input: parsed.data } : null
}

/** Insert the setup, or (same setup, same department) count a use / rename it. */
async function upsertSetup(
  user: SessionUser,
  setup: QuotationInput,
  opts: { departmentId: unknown; name?: string; source?: { id: string; no: string } },
): Promise<{ id: string; name: string; existed: boolean }> {
  await connectDb()
  const { subtotal, discount, total, lines } = quotationLines(setup)
  if (!lines.length || total <= 0) throw new UserError('Add at least one item with a price')
  const me = await User.findById(user.id).select('name role').lean()
  const myName = me?.name ?? user.name
  const name = opts.name?.trim().slice(0, 160)
  const now = new Date()
  const filter = { departmentId: opts.departmentId ?? null, fingerprint: fingerprintOf(setup), deletedAt: null }
  const update = {
    $setOnInsert: {
      ...(name ? {} : { name: savedQuotationName(setup) }),
      input: setup,
      systemType: setup.systemType,
      systemKw: setup.systemKw,
      subtotal,
      discount,
      total,
      madeBy: { userId: oid(user.id), name: myName, role: QUOTE_ROLE_TITLE[me?.role ?? user.role] ?? 'Sales' },
      sourceQuotationId: opts.source ? oid(opts.source.id) : null,
      sourceQuotationNo: opts.source?.no ?? null,
      createdBy: oid(user.id),
    },
    $set: { updatedBy: oid(user.id), ...(name ? { name } : {}), ...(opts.source ? { lastUsedAt: now, lastUsedBy: myName } : {}) },
    ...(opts.source ? { $inc: { useCount: 1 } } : {}),
  }
  const run = () => SavedQuotation.findOneAndUpdate(filter, update, { upsert: true, returnDocument: 'after', includeResultMetadata: true }).lean()
  // Two quotations with the same setup at the same moment: the second upsert hits the unique index — try once more.
  const res = await run().catch((e: unknown) => {
    if ((e as { code?: number })?.code === 11000) return run()
    throw e
  })
  const doc = res.value
  if (!doc) throw new Error('saved quotation upsert returned nothing')
  return { id: String(doc._id), name: doc.name, existed: !!res.lastErrorObject?.updatedExisting }
}

/** A quotation was just made: keep its setup (or count one more use of it). */
export async function rememberQuotationSetup(
  user: SessionUser,
  input: QuotationInput,
  quotation: { id: string; quotationNo: string; departmentId: unknown },
): Promise<void> {
  await upsertSetup(user, parseSetup(input), { departmentId: quotation.departmentId, source: { id: quotation.id, no: quotation.quotationNo } })
}

/** Quotation form → "Save for next time": keep the setup without making a quotation. */
export async function saveQuotationSetup(user: SessionUser, raw: unknown, name?: string): Promise<{ id: string; name: string; existed: boolean }> {
  const setup = parseSetup(raw)
  await connectDb()
  const me = await User.findById(user.id).select('departmentId').lean()
  return upsertSetup(user, setup, { departmentId: me?.departmentId ?? null, name })
}

const LIST_FIELDS = 'name departmentId systemType systemKw total madeBy sourceQuotationNo useCount lastUsedAt lastUsedBy createdAt'

function searchFilter(q?: string): Record<string, unknown> {
  const text = q?.trim()
  if (!text) return {}
  const regex = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return { $or: [{ name: regex }, { 'madeBy.name': regex }, { sourceQuotationNo: regex }] }
}

/** For the "Start from a saved quotation" list: most recently used first (no form data — fetched on pick). */
export async function listSavedQuotations(user: SessionUser, params: { q?: string; limit?: number } = {}): Promise<SavedQuotationItem[]> {
  await connectDb()
  const rows = await SavedQuotation.find({ $and: [savedScope(user), searchFilter(params.q)] })
    .sort({ lastUsedAt: -1, updatedAt: -1 })
    .limit(Math.min(Math.max(params.limit ?? 100, 1), 200))
    .select(LIST_FIELDS)
    .lean()
  return rows.map((s) => toItem(user, s as SavedLean))
}

/** How many saved quotations the person can see (for the Quotations → Saved tab). */
export async function countSavedQuotations(user: SessionUser): Promise<number> {
  await connectDb()
  return SavedQuotation.countDocuments(savedScope(user))
}

/** Quotations → Saved: one page with the full setup of each. */
export async function savedQuotationsPage(
  user: SessionUser,
  params: { q?: string; page?: number } = {},
): Promise<{ rows: SavedQuotationDetail[]; total: number; pageSize: number }> {
  await connectDb()
  const pageSize = 20
  const page = Math.max(1, params.page ?? 1)
  const match = { $and: [savedScope(user), searchFilter(params.q)] }
  const [docs, total] = await Promise.all([
    SavedQuotation.find(match).sort({ lastUsedAt: -1, updatedAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
    SavedQuotation.countDocuments(match),
  ])
  return { rows: docs.map((s) => toDetail(user, s as SavedLean)).filter((s): s is SavedQuotationDetail => !!s), total, pageSize }
}

/** One saved quotation with its form, if the person may see it. */
export async function getSavedQuotationFor(user: SessionUser, id: string): Promise<SavedQuotationDetail | null> {
  if (!isObjectId(id)) return null
  await connectDb()
  const s = await SavedQuotation.findOne({ $and: [savedScope(user), { _id: oid(id) }] }).lean()
  return s ? toDetail(user, s as SavedLean) : null
}

/** Remove a saved quotation (soft delete): the person who saved it, their department's manager, or an admin. */
export async function deleteSavedQuotation(user: SessionUser, id: string): Promise<void> {
  if (!isObjectId(id)) throw new UserError('Saved quotation not found')
  await connectDb()
  const s = await SavedQuotation.findOne({ $and: [savedScope(user), { _id: oid(id) }] }).lean()
  if (!s) throw new UserError('Saved quotation not found')
  if (!canDelete(user, s as SavedLean)) throw new UserError('Only the person who saved it or their manager can remove it')
  await SavedQuotation.updateOne({ _id: s._id }, { $set: { deletedAt: new Date(), fingerprint: `deleted:${String(s._id)}`, updatedBy: oid(user.id) } })
  await AuditLog.create({
    entity: 'saved_quotation',
    entityId: s._id,
    action: 'soft_delete',
    before: { name: s.name, total: s.total },
    after: null,
    actorId: oid(user.id),
    at: new Date(),
  })
}
