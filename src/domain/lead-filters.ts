/**
 * Leads page filters (URL search params) — pure functions, no I/O.
 * Every filter is optional; unknown or empty values are ignored, so a bad link never breaks the page.
 */
import { DEPARTMENTS, STAGES, type AdPlatform, type Department, type LeadChannel, type Stage } from '@/domain/constants'
import { pktParts } from '@/lib/dates-pkt'

/** Where the lead came from, as a manager thinks about it. */
export const LEAD_SOURCE_FILTERS = ['facebook', 'instagram', 'meta', 'whatsapp', 'whatsapp_ad', 'website', 'sheet', 'manual'] as const
export type LeadSourceFilter = (typeof LEAD_SOURCE_FILTERS)[number]
export const SOURCE_FILTER_LABEL: Record<LeadSourceFilter, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  meta: 'Meta forms (direct)',
  whatsapp: 'WhatsApp (all)',
  whatsapp_ad: 'WhatsApp ads',
  website: 'Website',
  sheet: 'Google Sheet',
  manual: 'Added by hand',
}

export const DATE_PRESETS = ['today', 'yesterday', 'this_week', 'last_7', 'this_month', 'last_month', 'last_30'] as const
export type DatePreset = (typeof DATE_PRESETS)[number]
export const DATE_PRESET_LABEL: Record<DatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  this_week: 'This week',
  last_7: 'Last 7 days',
  this_month: 'This month',
  last_month: 'Last month',
  last_30: 'Last 30 days',
}

export const ATTEMPT_FILTERS = ['0', '1', '2', '3plus'] as const
export const ATTEMPT_FILTER_LABEL: Record<(typeof ATTEMPT_FILTERS)[number], string> = { '0': 'Not tried yet', '1': '1 try', '2': '2 tries', '3plus': '3 or more' }
export const FOLLOWUP_FILTERS = ['overdue', 'today', 'upcoming', 'none'] as const
export const FOLLOWUP_FILTER_LABEL: Record<(typeof FOLLOWUP_FILTERS)[number], string> = { overdue: 'Overdue', today: 'Due today', upcoming: 'Later', none: 'No follow-up' }

export interface LeadFilters {
  source?: LeadSourceFilter
  /** Several sources at once (Excel download): a lead matches if it came from ANY of them. */
  sources?: LeadSourceFilter[]
  stage?: Stage
  department?: Department
  /** agent user id, or 'none' = nobody assigned */
  agent?: string
  attempts?: (typeof ATTEMPT_FILTERS)[number]
  followup?: (typeof FOLLOWUP_FILTERS)[number]
  date?: DatePreset
  /** YYYY-MM-DD, Pakistan date, both days included */
  from?: string
  to?: string
  form?: string
  city?: string
}

/** The search-param names used by the filter panel (kept when paging / sorting). */
export const FILTER_KEYS = ['source', 'stage', 'department', 'agent', 'attempts', 'followup', 'date', 'from', 'to', 'form', 'city'] as const

const pick = <T extends string>(value: string | undefined, allowed: readonly T[]): T | undefined => (value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined)
/** "facebook,whatsapp" → ['facebook', 'whatsapp'] (unknown values dropped; none → undefined). */
const pickMany = <T extends string>(value: string | undefined, allowed: readonly T[]): T[] | undefined => {
  const list = [...new Set((value ?? '').split(',').map((v) => v.trim()))].filter((v): v is T => (allowed as readonly string[]).includes(v))
  return list.length ? list : undefined
}
const ymd = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)
const text = (v?: string, max = 80) => (v?.trim() ? v.trim().slice(0, max) : undefined)

export function parseLeadFilters(get: (key: string) => string | undefined): LeadFilters {
  const agent = get('agent')
  const f: LeadFilters = {
    source: pick(get('source'), LEAD_SOURCE_FILTERS),
    sources: pickMany(get('sources'), LEAD_SOURCE_FILTERS),
    stage: pick(get('stage'), STAGES),
    department: pick(get('department'), DEPARTMENTS),
    agent: agent === 'none' || (agent && /^[a-f0-9]{24}$/i.test(agent)) ? agent : undefined,
    attempts: pick(get('attempts'), ATTEMPT_FILTERS),
    followup: pick(get('followup'), FOLLOWUP_FILTERS),
    date: pick(get('date'), DATE_PRESETS),
    from: ymd(get('from')),
    to: ymd(get('to')),
    form: text(get('form'), 200),
    city: text(get('city')),
  }
  // A typed date range wins over a preset.
  if (f.from || f.to) f.date = undefined
  return Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as LeadFilters
}

export const activeFilterCount = (f: LeadFilters) => Object.keys(f).length

const DAY = 86_400_000
/** 00:00 Pakistan time of a calendar day, as a UTC instant. */
export const pktMidnight = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d) - 5 * 3_600_000)

/** [from, to) for the "Received" filter, in Pakistan time. */
export function receivedRange(f: Pick<LeadFilters, 'date' | 'from' | 'to'>, now = new Date()): { from?: Date; to?: Date } {
  const p = pktParts(now)
  const today = pktMidnight(p.year, p.month, p.day)
  const day = (v: string) => {
    const [y, m, d] = v.split('-').map(Number)
    return pktMidnight(y, m, d)
  }
  if (f.from || f.to) return { from: f.from ? day(f.from) : undefined, to: f.to ? new Date(day(f.to).getTime() + DAY) : undefined }
  switch (f.date) {
    case 'today':
      return { from: today }
    case 'yesterday':
      return { from: new Date(today.getTime() - DAY), to: today }
    case 'this_week': {
      const weekday = new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay() // 0 = Sunday, week starts Monday
      return { from: new Date(today.getTime() - ((weekday + 6) % 7) * DAY) }
    }
    case 'last_7':
      return { from: new Date(today.getTime() - 6 * DAY) }
    case 'this_month':
      return { from: pktMidnight(p.year, p.month, 1) }
    case 'last_month':
      return { from: p.month === 1 ? pktMidnight(p.year - 1, 12, 1) : pktMidnight(p.year, p.month - 1, 1), to: pktMidnight(p.year, p.month, 1) }
    case 'last_30':
      return { from: new Date(today.getTime() - 29 * DAY) }
    default:
      return {}
  }
}

/** Mongo conditions for the filters that live on the lead itself (agent/city/form are added by the query). */
export function sourceCondition(source: LeadSourceFilter): Record<string, unknown> {
  switch (source) {
    case 'facebook':
      return { 'source.platform': 'facebook' }
    case 'instagram':
      return { 'source.platform': 'instagram' }
    case 'meta':
      return { 'source.channel': 'meta_webhook' }
    case 'whatsapp':
      return { 'source.channel': 'whatsapp' }
    case 'whatsapp_ad':
      return { 'source.channel': 'whatsapp', $or: [{ 'source.ctwa.sourceId': { $type: 'string' } }, { 'source.ctwa.headline': { $type: 'string' } }] }
    case 'website':
      return { 'source.channel': 'website' }
    case 'sheet':
      return { 'source.channel': 'sheet' }
    case 'manual':
      return { 'source.channel': { $in: ['manual', 'csv_import'] } }
  }
}

/** One clear name for where a lead came from: "Facebook form", "Instagram form", "WhatsApp ad", "Google Sheet · Facebook". */
export function sourceLabel(channel: LeadChannel, platform?: AdPlatform | null, isAd?: boolean): string | null {
  const social = platform === 'facebook' ? 'Facebook' : platform === 'instagram' ? 'Instagram' : null
  if (channel === 'meta_webhook') return social ? `${social} form` : 'Meta form'
  if (channel === 'whatsapp') return isAd ? 'WhatsApp ad' : 'WhatsApp chat'
  if (channel === 'sheet' && social) return `Google Sheet · ${social}`
  return null
}
