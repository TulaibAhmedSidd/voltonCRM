import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { TextField } from '@/components/common/fields'
import { SheetSources } from '@/components/crm/sheet-sources'
import { AlertPrefsForm } from '@/components/crm/alert-prefs-form'
import { ProofStorage } from '@/components/crm/proof-storage'
import { MetaLeadsPanel } from '@/components/crm/meta-leads-panel'
import { WhatsAppNumbersPanel } from '@/components/crm/whatsapp-numbers-panel'
import { embeddedSignupConfig } from '@/server/services/whatsapp-onboarding'
import { metaMissing } from '@/server/services/meta-leads'
import { headers } from 'next/headers'
import { proofStorageStats } from '@/server/services/storage'
import { cloudinaryUsage } from '@/server/services/cloudinary'
import { Lead, User, WhatsAppNumber } from '@/server/db/models'
import { prefsOf } from '@/server/services/watch'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { requireRole } from '@/server/auth/session'
import { isAdminRole } from '@/server/auth/scope'
import { connectDb } from '@/server/db/connection'
import { saveThemeAction, saveWorkingHoursAction } from '@/server/actions'
import { listUsers } from '@/server/services/queries'
import { getSetting } from '@/server/services/settings'
import { getSheetSources, statusKey } from '@/server/services/sheet'
import type { SheetTabStatus } from '@/domain/sheet-columns'
import { THEME_PRESETS } from '@/styles/runtime-theme'

export const metadata = { title: 'Settings' }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default async function SettingsPage() {
  const user = await requireRole('admin', 'manager')
  const admin = isAdminRole(user.role)
  await connectDb()
  const [users, allSheets, sheetStatus, hours, theme] = await Promise.all([listUsers(user), getSheetSources(), getSetting('sheet_status'), getSetting('working_hours'), getSetting('theme')])
  const [me, proofStats, cloudAccount] = await Promise.all([User.findById(user.id).select('role alertPrefs').lean(), proofStorageStats(user), cloudinaryUsage()])
  const myAlerts = prefsOf(me ?? { role: user.role })
  const [metaState, metaLeadCount] = admin ? await Promise.all([getSetting('meta_leads'), Lead.countDocuments({ 'source.channel': 'meta_webhook' })]) : [null, 0]
  const waNumbers = admin ? await WhatsAppNumber.find().select('+tokenEnc').sort({ createdAt: 1 }).lean() : []
  const host = (await headers()).get('host') ?? 'your-app.vercel.app'
  const webhookUrl = `${host.startsWith('localhost') ? 'http' : 'https'}://${host}/api/webhooks/meta-leads`
  const employees = users.filter((u) => (u.role === 'agent' || u.role === 'field_agent') && u.isActive).map((u) => ({ id: u.id, name: u.name, role: u.role }))
  // Managers see and manage only their department's sheets.
  const sheets = admin ? allSheets : allSheets.filter((s) => s.department === user.departmentCode)
  const statusOf: Record<string, Record<string, SheetTabStatus | undefined>> = Object.fromEntries(sheets.map((s) => [s.id, Object.fromEntries(s.tabs.map((t) => [t, sheetStatus[statusKey(s, t)]]))]))

  return (
    <>
      <PageHeader title="Settings" description={user.role === 'manager' ? 'Add your call agents and field agents. New people choose their own password at first sign-in.' : undefined} />

      <SectionCard title="Users and roles" description="Adding people, custom roles and who gets leads are now on the Team page.">
        <Button asChild size="touch">
          <Link href="/team#members">Open Team → add people & roles</Link>
        </Button>
      </SectionCard>

      <section id="my-alerts" className="scroll-mt-20">
        <SectionCard title="My alerts" description="Choose what your employees do that you want to hear about — for everyone, or only some people.">
          <AlertPrefsForm prefs={myAlerts} employees={employees} />
        </SectionCard>
      </section>

      <section id="proof-storage" className="scroll-mt-20">
        <SectionCard title="Proof storage" description="Screenshots your agents attach to calls and chats. See how much space they use and clear old ones.">
          <ProofStorage stats={proofStats} account={cloudAccount} scopeLabel={admin ? 'All departments' : 'Your department'} />
        </SectionCard>
      </section>

      <section id="google-sheets" className="scroll-mt-20">
        <SectionCard title="Google Sheets" description={admin ? 'Every connected Sheet, by department. New rows are synced every minute.' : 'Connect your department\'s leads Sheet. New rows are synced every minute and go to your team.'}>
          <SheetSources sources={sheets} statusOf={statusOf} isAdmin={admin} defaultDepartment={user.departmentCode} />
        </SectionCard>
      </section>

      {admin ? (
        <section id="whatsapp-numbers" className="scroll-mt-20">
          <SectionCard title="WhatsApp numbers" description="Connect the company's WhatsApp numbers. Numbers already on the WhatsApp Business app keep working on the phone, and every chat also appears in the CRM.">
            <WhatsAppNumbersPanel
              signup={embeddedSignupConfig()}
              agents={employees.map((e) => ({ id: e.id, name: e.name }))}
              numbers={waNumbers.map((n) => ({
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
          </SectionCard>
        </section>
      ) : null}

      {admin && metaState ? (
        <section id="meta-leads" className="scroll-mt-20">
          <SectionCard title="Meta lead forms (Facebook / Instagram)" description="Leads from your Meta instant forms come straight into the CRM — no Google Sheet needed.">
            <MetaLeadsPanel missing={metaMissing()} webhookUrl={webhookUrl} state={metaState} leadCount={metaLeadCount} />
          </SectionCard>
        </section>
      ) : null}

      {admin ? (
        <>
          <SectionCard title="Appearance" description="Brand colours for everyone. Text colours are adjusted automatically so the app stays readable.">
            <ActionForm action={saveThemeAction}>
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
          </SectionCard>

          <SectionCard title="Working hours (Pakistan time)" description="Night and holiday leads wait for the morning. Agents are checked out automatically 30 minutes after closing.">
            <ActionForm action={saveWorkingHoursAction}>
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
          </SectionCard>
        </>
      ) : null}
    </>
  )
}
