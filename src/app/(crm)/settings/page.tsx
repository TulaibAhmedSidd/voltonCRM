import { Bell, Clock, FileSpreadsheet, HardDrive, Megaphone, MessageCircle, Palette, Users, type LucideIcon } from 'lucide-react'
import { headers } from 'next/headers'
import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { TextField } from '@/components/common/fields'
import { HashToSection } from '@/components/common/hash-to-section'
import { PageHeader } from '@/components/common/page-header'
import { SectionBack, SectionHub, type HubItem } from '@/components/common/section-hub'
import { AlertPrefsForm } from '@/components/crm/alert-prefs-form'
import { MetaLeadsPanel } from '@/components/crm/meta-leads-panel'
import { ProofStorage } from '@/components/crm/proof-storage'
import { SheetSources } from '@/components/crm/sheet-sources'
import { WhatsAppNumbersPanel } from '@/components/crm/whatsapp-numbers-panel'
import type { SheetTabStatus } from '@/domain/sheet-columns'
import { requireRole, type SessionUser } from '@/server/auth/session'
import { isAdminRole } from '@/server/auth/scope'
import { connectDb } from '@/server/db/connection'
import { Lead, User, WhatsAppNumber } from '@/server/db/models'
import { saveThemeAction, saveWorkingHoursAction } from '@/server/actions'
import { cloudinaryUsage } from '@/server/services/cloudinary'
import { metaMissing } from '@/server/services/meta-leads'
import { listUsers } from '@/server/services/queries'
import { getSetting } from '@/server/services/settings'
import { getSheetSources, statusKey } from '@/server/services/sheet'
import { proofStorageStats } from '@/server/services/storage'
import { prefsOf } from '@/server/services/watch'
import { embeddedSignupConfig } from '@/server/services/whatsapp-onboarding'
import { THEME_PRESETS } from '@/styles/runtime-theme'

export const metadata = { title: 'Settings' }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

interface SectionDef {
  key: string
  title: string
  description: string
  icon: LucideIcon
  adminOnly?: boolean
  /** Opens another page instead of a section here. */
  href?: string
}

const SECTIONS: SectionDef[] = [
  { key: 'my-alerts', title: 'My alerts', description: 'Choose which employee actions you are told about — for everyone or some people.', icon: Bell },
  { key: 'proof-storage', title: 'Proof storage', description: 'See how much space call / chat screenshots use, and clear old ones.', icon: HardDrive },
  { key: 'google-sheets', title: 'Google Sheets', description: 'Connect a leads Sheet; new rows come in every minute.', icon: FileSpreadsheet },
  { key: 'meta-leads', title: 'Meta lead forms', description: 'Facebook / Instagram form leads straight into the CRM; form → department.', icon: Megaphone, adminOnly: true },
  { key: 'whatsapp-numbers', title: 'WhatsApp numbers', description: 'Connect company WhatsApp numbers and say whose phone each is on.', icon: MessageCircle, adminOnly: true },
  { key: 'appearance', title: 'Appearance', description: 'Brand colours for everyone using the app.', icon: Palette, adminOnly: true },
  { key: 'working-hours', title: 'Working hours', description: 'Office days and times; night leads wait for the morning.', icon: Clock, adminOnly: true },
  { key: 'team', title: 'Users & roles', description: 'Add people, custom roles and who gets leads — on the Team page.', icon: Users, href: '/team' },
]

/** Settings: a card per section; tapping a card opens only that section (?section=…), with a way back. */
export default async function SettingsPage(props: PageProps<'/settings'>) {
  const user = await requireRole('admin', 'manager')
  const admin = isAdminRole(user.role)
  const sp = await props.searchParams
  const visible = SECTIONS.filter((s) => admin || !s.adminOnly)
  const open = visible.find((s) => s.key === sp.section && !s.href)

  if (!open) {
    await connectDb()
    const badges = await hubBadges(user, admin)
    const items: HubItem[] = visible.map((s) => ({ key: s.key, title: s.title, description: s.description, icon: s.icon, href: s.href ?? `/settings?section=${s.key}`, ...badges[s.key] }))
    return (
      <>
        <PageHeader title="Settings" description="Pick what you want to change." />
        <HashToSection keys={visible.filter((s) => !s.href).map((s) => s.key)} />
        <SectionHub items={items} label="Settings sections" />
      </>
    )
  }

  return (
    <>
      <SectionBack href="/settings" backLabel="All settings" title={open.title} description={open.description} icon={open.icon} />
      <div className="rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 md:p-6">
        <SectionBody section={open.key} user={user} admin={admin} />
      </div>
    </>
  )
}

/** Small live status on each card. */
async function hubBadges(user: SessionUser, admin: boolean): Promise<Record<string, Pick<HubItem, 'badge' | 'badgeTone'>>> {
  const [sheets, sheetStatus, waCount] = await Promise.all([getSheetSources(), getSetting('sheet_status'), admin ? WhatsAppNumber.countDocuments({ status: 'connected' }) : Promise.resolve(0)])
  const mine = admin ? sheets : sheets.filter((s) => s.department === user.departmentCode)
  const stopped = mine.some((s) => s.tabs.some((t) => sheetStatus[statusKey(s, t)]?.problem))
  const metaOn = !metaMissing().some((k) => k === 'META_PAGE_ID' || k === 'META_PAGE_ACCESS_TOKEN')
  return {
    'google-sheets': mine.length ? (stopped ? { badge: 'A tab has stopped', badgeTone: 'warn' } : { badge: `${mine.length} connected`, badgeTone: 'ok' }) : { badge: 'None connected', badgeTone: 'plain' },
    'meta-leads': metaOn ? { badge: 'Connected', badgeTone: 'ok' } : { badge: 'Not connected', badgeTone: 'warn' },
    'whatsapp-numbers': waCount ? { badge: `${waCount} connected`, badgeTone: 'ok' } : { badge: 'None connected', badgeTone: 'plain' },
  }
}

async function SectionBody({ section, user, admin }: { section: string; user: SessionUser; admin: boolean }) {
  await connectDb()
  const employeesOf = async () => (await listUsers(user)).filter((u) => (u.role === 'agent' || u.role === 'field_agent') && u.isActive).map((u) => ({ id: u.id, name: u.name, role: u.role }))

  switch (section) {
    case 'my-alerts': {
      const [me, employees] = await Promise.all([User.findById(user.id).select('role alertPrefs').lean(), employeesOf()])
      return <AlertPrefsForm prefs={prefsOf(me ?? { role: user.role })} employees={employees} />
    }
    case 'proof-storage': {
      const [stats, account] = await Promise.all([proofStorageStats(user), cloudinaryUsage()])
      return <ProofStorage stats={stats} account={account} scopeLabel={admin ? 'All departments' : 'Your department'} />
    }
    case 'google-sheets': {
      const [allSheets, sheetStatus] = await Promise.all([getSheetSources(), getSetting('sheet_status')])
      // Managers see and manage only their department's sheets.
      const sheets = admin ? allSheets : allSheets.filter((s) => s.department === user.departmentCode)
      const statusOf: Record<string, Record<string, SheetTabStatus | undefined>> = Object.fromEntries(sheets.map((s) => [s.id, Object.fromEntries(s.tabs.map((t) => [t, sheetStatus[statusKey(s, t)]]))]))
      return <SheetSources sources={sheets} statusOf={statusOf} isAdmin={admin} defaultDepartment={user.departmentCode} />
    }
    case 'meta-leads': {
      const [state, leadCount] = await Promise.all([getSetting('meta_leads'), Lead.countDocuments({ 'source.channel': 'meta_webhook' })])
      const host = (await headers()).get('host') ?? 'your-app.vercel.app'
      const webhookUrl = `${host.startsWith('localhost') ? 'http' : 'https'}://${host}/api/webhooks/meta-leads`
      return <MetaLeadsPanel missing={metaMissing()} webhookUrl={webhookUrl} state={state} leadCount={leadCount} />
    }
    case 'whatsapp-numbers': {
      const [numbers, employees] = await Promise.all([WhatsAppNumber.find().select('+tokenEnc').sort({ createdAt: 1 }).lean(), employeesOf()])
      return (
        <WhatsAppNumbersPanel
          signup={embeddedSignupConfig()}
          agents={employees.map((e) => ({ id: e.id, name: e.name }))}
          numbers={numbers.map((n) => ({
            id: String(n._id),
            number: n.number,
            displayName: n.displayName,
            coexistence: !!n.coexistence,
            connectedViaSignup: !!n.tokenEnc,
            status: n.status,
            agentId: n.agentId ? String(n.agentId) : null,
            lastEchoAt: n.lastEchoAt?.toISOString() ?? null,
            historyMessages: n.historyMessages ?? 0,
            historySyncRequestedAt: n.historySyncRequestedAt?.toISOString() ?? null,
            lastSyncError: n.lastSyncError ?? null,
          }))}
        />
      )
    }
    case 'appearance': {
      const theme = await getSetting('theme')
      return (
        <ActionForm action={saveThemeAction}>
          <p className="text-sm text-muted-foreground">Text colours are adjusted automatically so the app stays readable.</p>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {THEME_PRESETS.map((p) => (
              <label key={p.id} className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-border px-3 has-[:checked]:border-secondary">
                <input type="radio" name="preset" value={p.id} className="size-5 accent-primary" defaultChecked={p.colors.brand === theme.brand && p.colors.ink === theme.ink} />
                <span className="flex shrink-0 overflow-hidden rounded-md ring-1 ring-foreground/10" aria-hidden>
                  <span className="size-6" style={{ background: p.colors.brand }} />
                  <span className="size-6" style={{ background: p.colors.ink }} />
                </span>
                <span className="text-sm font-medium">{p.name}</span>
              </label>
            ))}
            <label className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border-2 border-border px-3 has-[:checked]:border-secondary">
              <input type="radio" name="preset" value="custom" className="size-5 accent-primary" defaultChecked={!THEME_PRESETS.some((p) => p.colors.brand === theme.brand && p.colors.ink === theme.ink)} />
              <span className="text-sm font-medium">Custom colours ↓</span>
            </label>
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="color" name="brand" defaultValue={theme.brand} className="h-11 w-16 cursor-pointer rounded-lg border border-input bg-card" />
              Brand colour (buttons, highlights)
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="color" name="ink" defaultValue={theme.ink} className="h-11 w-16 cursor-pointer rounded-lg border border-input bg-card" />
              Dark colour (menu, dark buttons)
            </label>
          </div>
          <Button type="submit" size="touch">
            Save colours
          </Button>
        </ActionForm>
      )
    }
    case 'working-hours': {
      const hours = await getSetting('working_hours')
      return (
        <ActionForm action={saveWorkingHoursAction}>
          <p className="text-sm text-muted-foreground">Pakistan time. Agents are checked out automatically 30 minutes after closing.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label="Opens" name="start" type="time" defaultValue={hours.start} />
            <TextField label="Closes" name="end" type="time" defaultValue={hours.end} />
          </div>
          <div className="flex flex-wrap gap-3">
            {DAYS.map((d, i) => (
              <label key={d} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" name="days" value={i} defaultChecked={hours.days.includes(i)} className="size-5 accent-primary" />
                {d}
              </label>
            ))}
          </div>
          <Button type="submit" size="touch">
            Save hours
          </Button>
        </ActionForm>
      )
    }
    default:
      return null
  }
}
