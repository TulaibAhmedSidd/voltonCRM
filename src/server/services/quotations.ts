import 'server-only'
import { formatQuotationNo, COUNTERS } from '@/domain/numbering'
import { STAGES, type Stage } from '@/domain/constants'
import { quotationInput, quotationLines, type QuotationInput } from '@/domain/quotation'
import { loadLeadFor } from '@/server/auth/guards'
import type { SessionUser } from '@/server/auth/session'
import { leadScope } from '@/server/auth/scope'
import { connectDb } from '@/server/db/connection'
import { Contact, Lead, Quotation, User, nextSequence } from '@/server/db/models'
import { logActivity, oid, UserError } from '@/server/services/common'

const DAY = 86_400_000
const ROLE_TITLE: Record<string, string> = { agent: 'Sales Consultant', manager: 'Sales Manager', admin: 'Manager', super_admin: 'Director', field_agent: 'Site Engineer' }

export interface QuotationSummary {
  id: string
  quotationNo: string
  total: number
  systemKw: number
  issuedAt: string
  validUntil: string
  preparedBy: string
}

/** Issue a quotation for a lead: validates, numbers it (VO-1001…), saves a snapshot, logs it, optionally moves the stage. */
export async function createQuotation(user: SessionUser, leadId: string, raw: unknown, opts: { markSent: boolean }): Promise<{ id: string; quotationNo: string; total: number }> {
  const parsed = quotationInput.safeParse(raw)
  if (!parsed.success) throw new UserError(`Check the quotation: ${parsed.error.issues[0]?.path.join('.')} — ${parsed.error.issues[0]?.message}`)
  const input: QuotationInput = parsed.data
  const lead = await loadLeadFor(user, leadId, 'work')
  const { lines, subtotal, discount, total } = quotationLines(input)
  if (!lines.length || total <= 0) throw new UserError('Add at least one item with a price')

  const [contact, me] = await Promise.all([Contact.findById(lead.contactId).lean(), User.findById(user.id).select('name phone role').lean()])
  if (!contact) throw new UserError('Customer not found')
  const issuedAt = new Date()
  const seq = await nextSequence(COUNTERS.quotation)
  const quotation = await Quotation.create({
    quotationNo: formatQuotationNo(1000 + seq),
    leadId: lead._id,
    contactId: lead.contactId,
    departmentId: lead.departmentId ?? null,
    leadNo: lead.leadNo,
    customer: { name: contact.name, phone: contact.phones[0], address: [contact.address, contact.area, contact.city].filter(Boolean).join(', ') },
    preparedBy: { userId: oid(user.id), name: me?.name ?? user.name, role: ROLE_TITLE[me?.role ?? user.role] ?? 'Sales', phone: me?.phone ?? '' },
    input,
    subtotal,
    discount,
    total,
    systemKw: input.systemKw,
    issuedAt,
    validUntil: new Date(issuedAt.getTime() + input.validityDays * DAY),
  })
  await logActivity(lead._id, 'quotation_issued', user.id, { text: `${quotation.quotationNo} · Rs ${total.toLocaleString('en-US')} · ${input.systemKw} kW` })

  // Issuing a quotation moves the lead forward to "Quotation sent" (never backwards, never a closed lead).
  const order = STAGES as readonly Stage[]
  if (opts.markSent && lead.status === 'open' && order.indexOf(lead.stage as Stage) < order.indexOf('quotation_sent')) {
    await Lead.updateOne({ _id: lead._id }, { $set: { stage: 'quotation_sent', stageChangedAt: issuedAt, updatedBy: oid(user.id) } })
    await logActivity(lead._id, 'stage_changed', user.id, { stage: 'quotation_sent' })
  }
  return { id: String(quotation._id), quotationNo: quotation.quotationNo, total }
}

export async function listQuotations(user: SessionUser, leadId: string): Promise<QuotationSummary[]> {
  await connectDb()
  if (!(await Lead.exists({ $and: [{ _id: oid(leadId) }, leadScope(user)] }))) return []
  const rows = await Quotation.find({ leadId: oid(leadId) }).sort({ issuedAt: -1 }).limit(50).lean()
  return rows.map((q) => ({ id: String(q._id), quotationNo: q.quotationNo, total: q.total, systemKw: q.systemKw ?? 0, issuedAt: q.issuedAt.toISOString(), validUntil: q.validUntil.toISOString(), preparedBy: q.preparedBy.name }))
}

/** Latest quotation's form values, to start the next one from (a revision). */
export async function lastQuotationInput(user: SessionUser, leadId: string): Promise<QuotationInput | null> {
  await connectDb()
  if (!(await Lead.exists({ $and: [{ _id: oid(leadId) }, leadScope(user)] }))) return null
  const q = await Quotation.findOne({ leadId: oid(leadId) }).sort({ issuedAt: -1 }).select('input').lean()
  const parsed = q ? quotationInput.safeParse(q.input) : null
  return parsed?.success ? parsed.data : null
}

/** For the PDF: the quotation, only if the user can see its lead. */
export async function getQuotationFor(user: SessionUser, quotationId: string) {
  await connectDb()
  if (!/^[a-f0-9]{24}$/i.test(quotationId)) return null
  const q = await Quotation.findById(quotationId).lean()
  if (!q) return null
  if (!(await Lead.exists({ $and: [{ _id: q.leadId }, leadScope(user)] }))) return null
  return q
}
