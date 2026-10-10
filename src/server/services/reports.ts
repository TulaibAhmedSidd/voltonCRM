import 'server-only'
import type { Types } from 'mongoose'
import type { AttemptChannel, CallResult, CustomerResponse, Department, LeadStatus, ProofFlag, ProofStatus, ReviewStatus, Stage, AssignmentState, LeadChannel, AdPlatform } from '@/domain/constants'
import { DATE_PRESET_LABEL, SOURCE_FILTER_LABEL, receivedRange, sourceLabel, type DatePreset, type LeadFilters } from '@/domain/lead-filters'
import { ASSIGNMENT_STATE_META, ATTEMPT_CHANNEL_META, CALL_RESULT_META, CHANNEL_META, CUSTOMER_RESPONSE_META, DEPARTMENT_META, LEAD_STATUS_META, PROOF_FLAG_META, PROOF_STATUS_META, REVIEW_STATUS_META, STAGE_META } from '@/domain/ui-maps'
import { en } from '@/i18n/en'
import { pktParts } from '@/lib/dates-pkt'
import { connectDb } from '@/server/db/connection'
import { Contact, ContactAttempt, Department as DepartmentModel, Lead, User } from '@/server/db/models'
import type { SessionUser } from '@/server/auth/session'
import { leadScope } from '@/server/auth/scope'
import { buildXlsx, type Cell, type SheetSpec } from '@/server/lib/xlsx'
import { filterConditions } from '@/server/services/queries'

/**
 * Manager Excel report for a period (today / this week / this month / a date range):
 *  - Summary: per employee — tries, calls / WhatsApp, results, interested, deals, flagged proofs.
 *  - Leads: every lead received OR worked in the period, with its CURRENT status (live at download time).
 *  - Activity: every call / WhatsApp try in the period, with result, proof and remarks.
 * Scope: managers = their department, admins = all. The Leads-page filters (source, agent, stage…) apply too.
 */
export interface ReportPeriod {
  preset?: DatePreset
  from?: string
  to?: string
}

const MAX_ROWS = 20_000
const pad = (n: number) => String(n).padStart(2, '0')
/** "2026-10-09 14:05" in Pakistan time — sorts correctly in Excel. */
const at = (d?: Date | null) => {
  if (!d) return ''
  const p = pktParts(new Date(d))
  return `${p.year}-${pad(p.month)}-${pad(p.day)} ${pad(p.hour)}:${pad(p.minute)}`
}

export function periodLabel(p: ReportPeriod): string {
  if (p.from || p.to) return `${p.from ?? '…'} to ${p.to ?? 'now'}`
  return DATE_PRESET_LABEL[p.preset ?? 'today']
}

/** received = leads that ARRIVED in the period · worked = arrived OR were called / messaged in the period. */
export type ReportBasis = 'received' | 'worked'

/** "Sources: Facebook, WhatsApp (all) · Stage: Interested" for the About sheet. */
export function filtersLabel(f: LeadFilters, agentName?: string | null): string {
  const parts: string[] = []
  const src = [...(f.sources ?? []), ...(f.source ? [f.source] : [])]
  if (src.length) parts.push(`Sources: ${[...new Set(src)].map((s) => SOURCE_FILTER_LABEL[s]).join(', ')}`)
  if (f.stage) parts.push(`Stage: ${en.stage[f.stage]}`)
  if (f.department) parts.push(`Department: ${f.department}`)
  if (f.agent) parts.push(`Employee: ${f.agent === 'none' ? 'nobody assigned' : (agentName ?? f.agent)}`)
  if (f.attempts) parts.push(`Tries: ${f.attempts}`)
  if (f.followup) parts.push(`Follow-up: ${f.followup}`)
  if (f.form) parts.push(`Form / campaign: ${f.form}`)
  if (f.city) parts.push(`City: ${f.city}`)
  return parts.join(' · ') || 'All leads'
}

export async function buildLeadsReport(user: SessionUser, opts: { period: ReportPeriod; filters: LeadFilters; baseUrl: string; basis?: ReportBasis }): Promise<{ file: Buffer; leads: number; tries: number }> {
  await connectDb()
  const range = receivedRange(opts.period.from || opts.period.to ? { from: opts.period.from, to: opts.period.to } : { date: opts.period.preset ?? 'today' })
  const when: Record<string, Date> = { ...(range.from ? { $gte: range.from } : {}), ...(range.to ? { $lt: range.to } : {}) }
  const scope = leadScope(user)
  // The export has its own period, so the page's "received" filter is not applied twice.
  const { date: _date, from: _from, to: _to, ...rest } = opts.filters
  void _date
  void _from
  void _to
  const conds = await filterConditions(user, rest)

  const basis: ReportBasis = opts.basis ?? 'worked'
  const tried = basis === 'worked' ? await ContactAttempt.find(Object.keys(when).length ? { serverTapAt: when } : {}).select('leadId').limit(MAX_ROWS).lean() : []
  const inPeriod = Object.keys(when).length ? (basis === 'received' ? { receivedAt: when } : { $or: [{ receivedAt: when }, { _id: { $in: [...new Set(tried.map((t) => String(t.leadId)))] } }] }) : {}
  const leads = await Lead.find({ $and: [scope, ...conds, inPeriod] })
    .sort({ receivedAt: -1 })
    .limit(MAX_ROWS)
    .lean()
  const leadIds = leads.map((l) => l._id)
  const attempts = await ContactAttempt.find({ leadId: { $in: leadIds }, ...(Object.keys(when).length ? { serverTapAt: when } : {}) }).sort({ serverTapAt: 1 }).lean()
  const lastAttempt = new Map<string, (typeof attempts)[number]>()
  for (const a of await ContactAttempt.find({ leadId: { $in: leadIds }, cancelled: { $ne: true }, result: { $ne: null } }).sort({ serverTapAt: 1 }).lean()) lastAttempt.set(String(a.leadId), a)

  const [contacts, users, depts] = await Promise.all([
    Contact.find({ _id: { $in: leads.map((l) => l.contactId) } }).select('name phones whatsappE164 city').lean(),
    User.find({ _id: { $in: [...leads.map((l) => l.assignment?.agentId).filter(Boolean), ...attempts.map((a) => a.agentId)] as Types.ObjectId[] } }).select('name role').lean(),
    DepartmentModel.find().select('code').lean(),
  ])
  const contact = new Map(contacts.map((c) => [String(c._id), c]))
  const person = new Map(users.map((u) => [String(u._id), u.name]))
  const dept = new Map(depts.map((d) => [String(d._id), d.code as Department]))
  const leadById = new Map(leads.map((l) => [String(l._id), l]))
  const triesInPeriod = new Map<string, number>()
  for (const a of attempts) if (!a.cancelled) triesInPeriod.set(String(a.leadId), (triesInPeriod.get(String(a.leadId)) ?? 0) + 1)

  // ── Summary per employee ──
  interface Row {
    tries: number
    calls: number
    whatsapp: number
    connected: number
    notReached: number
    interested: number
    callBack: number
    notInterested: number
    won: number
    flagged: number
    mistaken: number
    assigned: number
  }
  const blank = (): Row => ({ tries: 0, calls: 0, whatsapp: 0, connected: 0, notReached: 0, interested: 0, callBack: 0, notInterested: 0, won: 0, flagged: 0, mistaken: 0, assigned: 0 })
  const per = new Map<string, Row>()
  const rowOf = (id: string) => per.get(id) ?? (per.set(id, blank()), per.get(id)!)
  for (const a of attempts) {
    const r = rowOf(String(a.agentId))
    if (a.cancelled) {
      r.mistaken++
      continue
    }
    r.tries++
    if (a.channel === 'phone_call') r.calls++
    else r.whatsapp++
    if (a.result === 'connected') r.connected++
    else if (a.result) r.notReached++
    if (a.response === 'interested') r.interested++
    if (a.response === 'call_back_requested') r.callBack++
    if (a.response === 'not_interested' || a.response === 'already_has_solar') r.notInterested++
    if (a.response === 'deal_won') r.won++
    if (a.proofStatus === 'flagged') r.flagged++
  }
  for (const l of leads) {
    const assignedAt = l.assignment?.assignedAt
    const inPeriod = assignedAt && (!range.from || assignedAt >= range.from) && (!range.to || assignedAt < range.to)
    if (l.assignment?.agentId && inPeriod) rowOf(String(l.assignment.agentId)).assigned++
  }
  const summaryRows: Cell[][] = [...per.entries()]
    .sort((a, b) => b[1].tries - a[1].tries)
    .map(([id, r]) => [person.get(id) ?? '—', r.assigned, r.tries, r.calls, r.whatsapp, r.connected, r.notReached, r.interested, r.callBack, r.notInterested, r.won, r.flagged, r.mistaken])
  if (summaryRows.length) {
    const total = summaryRows.reduce<number[]>((t, row) => row.slice(1).map((v, i) => (t[i] ?? 0) + Number(v)), [])
    summaryRows.push(['TOTAL', ...total])
  }

  // ── Leads (current status) ──
  const leadRows: Cell[][] = leads.map((l) => {
    const c = contact.get(String(l.contactId))
    const last = lastAttempt.get(String(l._id))
    const channel = (l.source?.channel ?? 'manual') as LeadChannel
    const src = sourceLabel(channel, l.source?.platform as AdPlatform | undefined, !!(l.source?.ctwa?.sourceId || l.source?.ctwa?.headline)) ?? CHANNEL_META[channel].label
    const d = dept.get(String(l.departmentId))
    return [
      l.leadNo,
      at(l.receivedAt),
      c?.name ?? '',
      c?.phones?.[0] ?? '',
      c?.whatsappE164 && c.whatsappE164 !== c.phones?.[0] ? c.whatsappE164 : '',
      c?.city ?? '',
      d ? DEPARTMENT_META[d].label : '',
      src,
      l.source?.ctwa?.headline ?? l.source?.campaignName ?? l.source?.formName ?? '',
      l.assignment?.agentId ? (person.get(String(l.assignment.agentId)) ?? '') : '',
      ASSIGNMENT_STATE_META[(l.assignment?.state ?? 'unassigned') as AssignmentState]?.label ?? '',
      STAGE_META[l.stage as Stage]?.label ?? l.stage,
      LEAD_STATUS_META[l.status as LeadStatus]?.label ?? l.status,
      l.closeReview?.status && l.closeReview.status !== 'none' ? String(l.closeReview.status) : '',
      l.attemptCount ?? 0,
      triesInPeriod.get(String(l._id)) ?? 0,
      at(last?.serverTapAt),
      last?.result ? CALL_RESULT_META[last.result as CallResult].label : '',
      last?.response ? CUSTOMER_RESPONSE_META[last.response as CustomerResponse].label : '',
      last?.remarks ?? '',
      at(l.nextFollowUpAt),
      l.wonValuePkr ?? '',
      l.lostReason ? (en.lostReason as Record<string, string>)[l.lostReason] ?? l.lostReason : '',
      `${opts.baseUrl}/leads/${l._id}`,
    ]
  })

  // ── Activity (every try in the period) ──
  const activityRows: Cell[][] = attempts.map((a) => {
    const l = leadById.get(String(a.leadId))
    const c = l ? contact.get(String(l.contactId)) : undefined
    const away = a.leftAt && a.returnedAt ? Math.max(0, Math.round((new Date(a.returnedAt).getTime() - new Date(a.leftAt).getTime()) / 1000)) : null
    return [
      at(a.serverTapAt),
      person.get(String(a.agentId)) ?? '',
      l?.leadNo ?? '',
      c?.name ?? '',
      ATTEMPT_CHANNEL_META[a.channel as AttemptChannel]?.label ?? a.channel,
      a.followUpNo ?? '',
      a.cancelled ? 'Tapped by mistake (not a try)' : a.result ? CALL_RESULT_META[a.result as CallResult].label : 'Not saved yet',
      a.response ? CUSTOMER_RESPONSE_META[a.response as CustomerResponse].label : '',
      away === null ? '' : `${Math.floor(away / 60)}:${pad(away % 60)}`,
      PROOF_STATUS_META[a.proofStatus as ProofStatus]?.label ?? '',
      ((a.flags ?? []) as string[]).map((f: string) => PROOF_FLAG_META[f as ProofFlag]?.label ?? f).join(', '),
      a.review?.status ? REVIEW_STATUS_META[a.review.status as ReviewStatus]?.label ?? '' : '',
      a.remarks ?? '',
    ]
  })

  const sheets: SheetSpec[] = [
    {
      name: 'Summary',
      columns: [
        { header: 'Employee', width: 24 },
        { header: 'Leads assigned', width: 15 },
        { header: 'Tries', width: 9 },
        { header: 'Phone calls', width: 12 },
        { header: 'WhatsApp', width: 11 },
        { header: 'Connected', width: 11 },
        { header: 'Not reached', width: 12 },
        { header: 'Interested', width: 11 },
        { header: 'Call back', width: 10 },
        { header: 'Not interested', width: 14 },
        { header: 'Deals won', width: 11 },
        { header: 'Flagged proofs', width: 14 },
        { header: 'Tapped by mistake', width: 17 },
      ],
      rows: summaryRows,
    },
    {
      name: 'Leads',
      columns: [
        { header: 'Lead no', width: 12 },
        { header: 'Received (PKT)', width: 17 },
        { header: 'Customer', width: 22 },
        { header: 'Phone', width: 15 },
        { header: 'WhatsApp (if different)', width: 16 },
        { header: 'City', width: 12 },
        { header: 'Department', width: 13 },
        { header: 'Source', width: 22 },
        { header: 'Campaign / form / ad', width: 28 },
        { header: 'Agent', width: 18 },
        { header: 'Assignment', width: 14 },
        { header: 'Stage', width: 16 },
        { header: 'Status', width: 11 },
        { header: 'Close review', width: 12 },
        { header: 'Tries (total)', width: 12 },
        { header: 'Tries in period', width: 14 },
        { header: 'Last try (PKT)', width: 17 },
        { header: 'Last result', width: 16 },
        { header: 'Customer response', width: 18 },
        { header: 'Last remarks', width: 40 },
        { header: 'Next follow-up (PKT)', width: 18 },
        { header: 'Won value (PKR)', width: 14 },
        { header: 'Lost reason', width: 18 },
        { header: 'Open in CRM', width: 45 },
      ],
      rows: leadRows,
    },
    {
      name: 'Activity',
      columns: [
        { header: 'Time (PKT)', width: 17 },
        { header: 'Employee', width: 20 },
        { header: 'Lead no', width: 12 },
        { header: 'Customer', width: 22 },
        { header: 'Channel', width: 15 },
        { header: 'Try no', width: 8 },
        { header: 'Result', width: 22 },
        { header: 'Customer response', width: 18 },
        { header: 'Away (min:sec)', width: 13 },
        { header: 'Proof', width: 12 },
        { header: 'Flags', width: 30 },
        { header: 'Review', width: 12 },
        { header: 'Remarks', width: 40 },
      ],
      rows: activityRows,
    },
    {
      name: 'About',
      columns: [
        { header: 'Item', width: 22 },
        { header: 'Value', width: 60 },
      ],
      rows: [
        ['Period', periodLabel(opts.period)],
        ['Downloaded (PKT)', at(new Date())],
        ['Downloaded by', user.name],
        ['Scope', user.role === 'manager' ? 'My department' : 'All departments'],
        ['Filters', filtersLabel(rest, rest.agent && rest.agent !== 'none' ? person.get(rest.agent) : null)],
        ['Leads', `${basis === 'received' ? 'Received in the period' : 'Received or worked in the period'} — status is the CURRENT status at download time`],
        ['Activity', 'Every call / WhatsApp try in the period'],
      ],
    },
  ]
  return { file: buildXlsx(sheets), leads: leadRows.length, tries: attempts.filter((a) => !a.cancelled).length }
}
