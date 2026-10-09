import { NextResponse, type NextRequest } from 'next/server'
import { DATE_PRESETS, parseLeadFilters, type DatePreset } from '@/domain/lead-filters'
import { pktDateKey } from '@/lib/dates-pkt'
import { getSessionUser } from '@/server/auth/session'
import { AuditLog } from '@/server/db/models'
import { oid } from '@/server/services/common'
import { hit } from '@/server/services/rate-limit'
import { buildLeadsReport } from '@/server/services/reports'

const ymd = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined)

/** Excel report for managers / admins: GET /api/exports/leads?period=today|this_week|this_month… or pfrom / pto, plus Leads-page filters. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (!['manager', 'admin', 'super_admin'].includes(user.role)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  if ((await hit(`export:${user.id}`, 30, 10 * 60_000)).blocked) return NextResponse.json({ error: 'Too many downloads — wait a few minutes' }, { status: 429 })

  const p = request.nextUrl.searchParams
  const from = ymd(p.get('pfrom'))
  const to = ymd(p.get('pto'))
  const preset = (DATE_PRESETS as readonly string[]).includes(p.get('period') ?? '') ? (p.get('period') as DatePreset) : 'today'
  const period = from || to ? { from, to } : { preset }
  const filters = parseLeadFilters((k) => p.get(k) ?? undefined)
  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')
  const host = request.headers.get('host') ?? request.nextUrl.host
  const { file, leads, tries } = await buildLeadsReport(user, { period, filters, baseUrl: `${proto}://${host}` })
  await AuditLog.create({ entity: 'lead', entityId: null, action: 'export', after: { period, filters, leads, tries }, actorId: oid(user.id) })

  const name = `volton-leads-${from || to ? `${from ?? 'start'}_to_${to ?? 'now'}` : `${preset.replace(/_/g, '-')}-${pktDateKey(new Date())}`}.xlsx`
  return new NextResponse(new Uint8Array(file), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store',
    },
  })
}
