import 'server-only'
import { isAdminRole } from '@/server/auth/scope'
import type { SessionUser } from '@/server/auth/session'
import { connectDb } from '@/server/db/connection'
import { Message, WhatsAppNumber } from '@/server/db/models'
import { metaMissing } from '@/server/services/meta-leads'
import { getSetting } from '@/server/services/settings'
import { getSheetSources, statusKey } from '@/server/services/sheet'

export type SourceHealth = 'live' | 'stopped' | 'off'

export interface LeadSourceStatus {
  key: 'meta' | 'whatsapp' | 'sheet' | 'manual'
  name: string
  health: SourceHealth
  /** How leads from this source get here. */
  how: string
  /** Last time something arrived / was checked (ISO), when known. */
  lastAt?: string | null
  lastLabel?: string
  problem?: string | null
  /** Overrides the status word (e.g. "Manual"). */
  badge?: string
}

/** For the Leads page: which lead sources are connected, how they sync, and when they last brought something in. */
export async function leadSourcesStatus(user: SessionUser): Promise<LeadSourceStatus[]> {
  await connectDb()
  const [meta, sheets, sheetStatus, numbers, lastIn] = await Promise.all([
    getSetting('meta_leads'),
    getSheetSources(),
    getSetting('sheet_status'),
    WhatsAppNumber.countDocuments({ status: 'connected' }),
    Message.findOne({ direction: 'in' }).sort({ at: -1 }).select('at').lean(),
  ])
  const out: LeadSourceStatus[] = []

  // Facebook / Instagram instant forms
  const metaReady = !metaMissing().some((k) => k === 'META_PAGE_ID' || k === 'META_PAGE_ACCESS_TOKEN')
  out.push({
    key: 'meta',
    name: 'Facebook / Instagram forms',
    health: !metaReady ? 'off' : meta.lastError ? 'stopped' : 'live',
    how: metaReady ? 'Automatic — each new form lead arrives within seconds. A backup check runs every 15 minutes.' : 'Not connected yet (Settings → Meta lead forms).',
    lastAt: meta.lastWebhookAt ?? null,
    lastLabel: 'last live lead',
    problem: meta.lastError ?? null,
  })

  // WhatsApp
  const waReady = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) || numbers > 0
  out.push({
    key: 'whatsapp',
    name: 'WhatsApp',
    health: waReady ? 'live' : 'off',
    how: waReady ? `Automatic — a new chat on a connected number${numbers > 1 ? ` (${numbers} numbers)` : ''} becomes a lead instantly.` : 'Not connected yet (Settings → WhatsApp numbers).',
    lastAt: lastIn?.at?.toISOString() ?? null,
    lastLabel: 'last message in',
  })

  // Google Sheets (managers: their department's)
  const mine = isAdminRole(user.role) ? sheets : sheets.filter((s) => s.department === user.departmentCode)
  if (mine.length) {
    const tabs = mine.flatMap((s) => s.tabs.map((t) => sheetStatus[statusKey(s, t)]))
    const problem = tabs.find((t) => t?.problem)?.problem ?? null
    const last = tabs.map((t) => t?.at).filter(Boolean).sort().pop() ?? null
    out.push({
      key: 'sheet',
      name: `Google Sheet${mine.length > 1 ? `s (${mine.length})` : ''}`,
      health: problem ? 'stopped' : 'live',
      how: problem ? 'Syncing has STOPPED for a tab — see the problem below.' : 'Automatic — new rows are pulled every minute. “Sync Google Sheet now” pulls straight away.',
      lastAt: last,
      lastLabel: 'last sync',
      problem,
    })
  }

  out.push({ key: 'manual', name: 'Added by staff', health: 'live', badge: 'Manual', how: '“Add lead” on this page — it is assigned like any other lead.' })
  return out
}
