import 'server-only'
import { formatQuotationNo, COUNTERS } from '@/domain/numbering'
import { STAGES, type Stage, type QuotationStatus } from '@/domain/constants'
import { QUOTE_ROLE_TITLE, quotationInput, quotationLines, type QuotationInput } from '@/domain/quotation'
import { loadLeadFor, isObjectId } from '@/server/auth/guards'
import type { SessionUser } from '@/server/auth/session'
import { isAdminRole, leadScope } from '@/server/auth/scope'
import { connectDb } from '@/server/db/connection'
import { AuditLog, Contact, Lead, Quotation, User, nextSequence } from '@/server/db/models'
import { logActivity, oid, UserError } from '@/server/services/common'
import { normalizePhone } from '@/lib/phone'
import { rememberQuotationSetup } from '@/server/services/saved-quotations'

const DAY = 86_400_000
const ROLE_TITLE = QUOTE_ROLE_TITLE

export interface QuotationSummary {
  id: string
  quotationNo: string
  total: number
  systemKw: number
  issuedAt: string
  validUntil: string
  preparedBy: string
  status?: string
}

export interface CentralQuotationItem {
  id: string
  quotationNo: string
  leadId: string | null
  leadNo: string | null
  customer: {
    name: string
    phone: string
    address?: string
  }
  preparedBy: {
    userId: string
    name: string
    role: string
  }
  systemKw: number
  total: number
  status: QuotationStatus
  issuedAt: string
  validUntil: string
}

/** Every quotation also lands in Saved quotations (or counts a use of the same setup) — that never stops the quotation. */
async function keepSetup(user: SessionUser, input: QuotationInput, q: { _id: unknown; quotationNo: string; departmentId?: unknown }) {
  try {
    await rememberQuotationSetup(user, input, { id: String(q._id), quotationNo: q.quotationNo, departmentId: q.departmentId ?? null })
  } catch (e) {
    console.error('saved quotation not kept:', e instanceof Error ? e.message : e)
  }
}

/** Issue a quotation for a lead: validates, numbers it (VO-1001…), saves a snapshot, logs it, optionally moves the stage. */
export async function createQuotation(
  user: SessionUser,
  leadId: string,
  raw: unknown,
  opts: { markSent: boolean },
): Promise<{ id: string; quotationNo: string; total: number }> {
  const parsed = quotationInput.safeParse(raw)
  if (!parsed.success) {
    throw new UserError(`Check the quotation: ${parsed.error.issues[0]?.path.join('.')} — ${parsed.error.issues[0]?.message}`)
  }
  const input: QuotationInput = parsed.data
  const lead = await loadLeadFor(user, leadId, 'work')
  const { lines, subtotal, discount, total } = quotationLines(input)
  if (!lines.length || total <= 0) throw new UserError('Add at least one item with a price')

  const [contact, me] = await Promise.all([
    Contact.findById(lead.contactId).lean(),
    User.findById(user.id).select('name phone role').lean(),
  ])
  if (!contact) throw new UserError('Customer not found')
  const issuedAt = new Date()
  const seq = await nextSequence(COUNTERS.quotation)
  const quotation = await Quotation.create({
    quotationNo: formatQuotationNo(1000 + seq),
    leadId: lead._id,
    contactId: lead.contactId,
    departmentId: lead.departmentId ?? null,
    leadNo: lead.leadNo,
    status: opts.markSent ? 'sent' : 'draft',
    customer: {
      name: contact.name,
      phone: contact.phones[0],
      address: [contact.address, contact.area, contact.city].filter(Boolean).join(', '),
    },
    preparedBy: {
      userId: oid(user.id),
      name: me?.name ?? user.name,
      role: ROLE_TITLE[me?.role ?? user.role] ?? 'Sales',
      phone: me?.phone ?? '',
    },
    input,
    subtotal,
    discount,
    total,
    systemKw: input.systemKw,
    issuedAt,
    validUntil: new Date(issuedAt.getTime() + input.validityDays * DAY),
  })
  await keepSetup(user, input, quotation)
  await logActivity(lead._id, 'quotation_issued', user.id, {
    text: `${quotation.quotationNo} · Rs ${total.toLocaleString('en-US')} · ${input.systemKw} kW`,
  })

  // Issuing a quotation moves the lead forward to "Quotation sent" (never backwards, never a closed lead).
  const order = STAGES as readonly Stage[]
  if (opts.markSent && lead.status === 'open' && order.indexOf(lead.stage as Stage) < order.indexOf('quotation_sent')) {
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { stage: 'quotation_sent', stageChangedAt: issuedAt, updatedBy: oid(user.id) } },
    )
    await logActivity(lead._id, 'stage_changed', user.id, { stage: 'quotation_sent' })
  }
  return { id: String(quotation._id), quotationNo: quotation.quotationNo, total }
}

/** Create a standalone quotation or associate with customer/lead. */
export async function createStandaloneQuotation(
  user: SessionUser,
  raw: unknown,
  customerData: { name: string; phone: string; address?: string; leadId?: string },
  opts: { markSent: boolean } = { markSent: true },
): Promise<{ id: string; quotationNo: string; total: number }> {
  if (customerData.leadId && isObjectId(customerData.leadId)) {
    return createQuotation(user, customerData.leadId, raw, opts)
  }

  const parsed = quotationInput.safeParse(raw)
  if (!parsed.success) {
    throw new UserError(`Check the quotation: ${parsed.error.issues[0]?.path.join('.')} — ${parsed.error.issues[0]?.message}`)
  }
  const input: QuotationInput = parsed.data
  const { lines, subtotal, discount, total } = quotationLines(input)
  if (!lines.length || total <= 0) throw new UserError('Add at least one item with a price')

  const phone = normalizePhone(customerData.phone)
  if (!phone) throw new UserError('Please enter a valid phone number (e.g. 03001234567)')
  const name = customerData.name.trim()
  if (!name) throw new UserError('Please enter the customer name')

  await connectDb()
  const me = await User.findById(user.id).select('name phone role departmentId').lean()
  const issuedAt = new Date()
  const seq = await nextSequence(COUNTERS.quotation)

  const quotation = await Quotation.create({
    quotationNo: formatQuotationNo(1000 + seq),
    leadId: null,
    contactId: null,
    departmentId: me?.departmentId ?? null,
    leadNo: null,
    status: opts.markSent ? 'sent' : 'draft',
    customer: {
      name,
      phone,
      address: customerData.address?.trim() ?? '',
    },
    preparedBy: {
      userId: oid(user.id),
      name: me?.name ?? user.name,
      role: ROLE_TITLE[me?.role ?? user.role] ?? 'Sales',
      phone: me?.phone ?? '',
    },
    input,
    subtotal,
    discount,
    total,
    systemKw: input.systemKw,
    issuedAt,
    validUntil: new Date(issuedAt.getTime() + input.validityDays * DAY),
  })
  await keepSetup(user, input, quotation)

  return { id: String(quotation._id), quotationNo: quotation.quotationNo, total }
}

export async function listQuotations(user: SessionUser, leadId: string, skipLeadCheck = false): Promise<QuotationSummary[]> {
  await connectDb()
  if (!skipLeadCheck && !(await Lead.exists({ $and: [{ _id: oid(leadId) }, leadScope(user)] }))) return []
  const rows = await Quotation.find({ leadId: oid(leadId) }).sort({ issuedAt: -1 }).limit(50).lean()
  return rows.map((q) => ({
    id: String(q._id),
    quotationNo: q.quotationNo,
    total: q.total,
    systemKw: q.systemKw ?? 0,
    issuedAt: q.issuedAt.toISOString(),
    validUntil: q.validUntil.toISOString(),
    preparedBy: q.preparedBy.name,
    status: q.status ?? 'sent',
  }))
}

export async function listCentralQuotations(
  user: SessionUser,
  params: { q?: string; status?: string; page?: number } = {},
): Promise<{ rows: CentralQuotationItem[]; total: number }> {
  await connectDb()
  const match: Record<string, unknown> = {}

  if (!isAdminRole(user.role)) {
    if (user.role === 'manager' && user.departmentId) {
      match.departmentId = oid(user.departmentId)
    } else if (user.role === 'agent') {
      match['preparedBy.userId'] = oid(user.id)
    }
  }

  if (params.status && ['draft', 'sent', 'accepted', 'rejected'].includes(params.status)) {
    match.status = params.status
  }

  if (params.q?.trim()) {
    const q = params.q.trim()
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    match.$or = [
      { quotationNo: regex },
      { 'customer.name': regex },
      { 'customer.phone': regex },
      { leadNo: regex },
    ]
  }

  const page = Math.max(1, params.page ?? 1)
  const limit = 25
  const [docs, total] = await Promise.all([
    Quotation.find(match).sort({ issuedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Quotation.countDocuments(match),
  ])

  return {
    total,
    rows: docs.map((q) => ({
      id: String(q._id),
      quotationNo: q.quotationNo,
      leadId: q.leadId ? String(q.leadId) : null,
      leadNo: q.leadNo ?? null,
      customer: {
        name: q.customer.name,
        phone: q.customer.phone,
        address: q.customer.address,
      },
      preparedBy: {
        userId: String(q.preparedBy.userId),
        name: q.preparedBy.name,
        role: q.preparedBy.role,
      },
      systemKw: q.systemKw ?? 0,
      total: q.total,
      status: (q.status as QuotationStatus) ?? 'sent',
      issuedAt: q.issuedAt.toISOString(),
      validUntil: q.validUntil.toISOString(),
    })),
  }
}

export async function updateQuotationStatus(
  user: SessionUser,
  quotationId: string,
  status: QuotationStatus,
): Promise<void> {
  await connectDb()
  const q = await Quotation.findById(quotationId)
  if (!q) throw new UserError('Quotation not found')

  if (!isAdminRole(user.role) && user.role !== 'manager' && String(q.preparedBy.userId) !== user.id) {
    throw new UserError('Not authorized to update this quotation')
  }

  const beforeStatus = q.status
  q.status = status
  await q.save()

  await AuditLog.create({
    entity: 'quotation',
    entityId: q._id,
    action: 'update',
    before: { status: beforeStatus },
    after: { status },
    actorId: oid(user.id),
    at: new Date(),
  })
}

/** Latest quotation's form values, to start the next one from (a revision). */
export async function lastQuotationInput(user: SessionUser, leadId: string, skipLeadCheck = false): Promise<QuotationInput | null> {
  await connectDb()
  if (!skipLeadCheck && !(await Lead.exists({ $and: [{ _id: oid(leadId) }, leadScope(user)] }))) return null
  const q = await Quotation.findOne({ leadId: oid(leadId) }).sort({ issuedAt: -1 }).select('input').lean()
  const parsed = q ? quotationInput.safeParse(q.input) : null
  return parsed?.success ? parsed.data : null
}

/** For the PDF: the quotation, accessible to creator, managers, admins, or anyone with lead access. */
export async function getQuotationFor(user: SessionUser, quotationId: string) {
  await connectDb()
  if (!/^[a-f0-9]{24}$/i.test(quotationId)) return null
  const q = await Quotation.findById(quotationId).lean()
  if (!q) return null
  if (isAdminRole(user.role)) return q
  if (user.role === 'manager' && (!q.departmentId || String(q.departmentId) === user.departmentId)) return q
  if (String(q.preparedBy.userId) === user.id) return q
  if (q.leadId && (await Lead.exists({ $and: [{ _id: q.leadId }, leadScope(user)] }))) return q
  return null
}
