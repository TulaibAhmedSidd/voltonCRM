import { ArrowDown, ArrowUp, BadgeCheck, ListOrdered, UserCheck, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { CheckboxField, TextField } from '@/components/common/fields'
import { PageHeader } from '@/components/common/page-header'
import { SectionBack, SectionHub } from '@/components/common/section-hub'
import { HashToSection } from '@/components/common/hash-to-section'
import { SectionCard } from '@/components/common/section-card'
import { EmptyState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/status-badge'
import { TeamMemberRow } from '@/components/crm/team-member-row'
import { DEPARTMENT_META } from '@/domain/ui-maps'
import { requireRole } from '@/server/auth/session'
import { bulkReassignAction, moveTeamMemberAction, setAutoLeadsAction, setTeamMemberAction, updateTeamSettingsAction } from '@/server/actions'
import { PingAgent } from '@/components/crm/ping-agent'
import { getTeamBoard, getTeams, listUsers } from '@/server/services/queries'
import { RolesSection, UsersSection } from '@/components/crm/users-section'
import { ROLE_META } from '@/domain/ui-maps'

export const metadata = { title: 'Team' }

const SECTIONS = [
  { key: 'working', title: 'Who is working now', description: 'Who is checked in, their open leads; ping someone or give their leads to others.', icon: Users },
  { key: 'members', title: 'Who gets leads', description: 'Turn “Gets leads automatically” on or off for each employee.', icon: UserCheck },
  { key: 'order', title: 'Lead order & timings', description: 'The turn order for new leads, accept / call time limits, pause auto-assign.', icon: ListOrdered },
  { key: 'add', title: 'Add a team member', description: 'Add people with a built-in or custom role; see and manage everyone.', icon: UserPlus },
  { key: 'roles', title: 'Roles', description: 'Make your own roles: do they get leads? do they get work instructions?', icon: BadgeCheck },
] as const

/** Team: a card per section; tapping a card opens only that section (?section=…), with a way back. */
export default async function TeamPage(props: PageProps<'/team'>) {
  const user = await requireRole('admin', 'manager')
  const sp = await props.searchParams
  const open = SECTIONS.find((x) => x.key === sp.section)
  const [teams, board, people] = await Promise.all([getTeams(user), getTeamBoard(user), listUsers(user)])
  const inOrder = new Set(teams.flatMap((t) => t.members.map((m: { id: string }) => m.id)))
  const employees = people.filter((p) => (p.role === 'agent' || p.role === 'field_agent' || p.role === 'staff') && p.isActive)
  const now = new Date()
  const callAgents = board.filter((m) => m.role === 'agent')

  if (!open) {
    const checkedIn = board.filter((m) => m.attendance === 'checked_in').length
    const badges: Record<string, { badge: string; badgeTone: 'ok' | 'warn' | 'plain' }> = {
      working: { badge: `${checkedIn} of ${board.length} checked in`, badgeTone: checkedIn ? 'ok' : 'warn' },
      members: { badge: `${employees.filter((e) => inOrder.has(e.id)).length} get leads`, badgeTone: 'plain' },
      order: teams.some((t) => t.settings.paused) ? { badge: 'Auto-assign paused', badgeTone: 'warn' } : { badge: 'Auto-assign on', badgeTone: 'ok' },
      add: { badge: `${people.filter((p) => p.isActive).length} people`, badgeTone: 'plain' },
    }
    return (
      <>
        <PageHeader title="Team" description="Pick what you want to see or change." />
        <HashToSection keys={SECTIONS.map((x) => x.key)} />
        <SectionHub label="Team sections" items={SECTIONS.map((x) => ({ key: x.key, title: x.title, description: x.description, icon: x.icon, href: `/team?section=${x.key}`, ...badges[x.key] }))} />
      </>
    )
  }

  return (
    <>
      <SectionBack href="/team" backLabel="All team" title={open.title} description={open.description} icon={open.icon} />
      {open.key === 'members' ? (
        <>
      <section id="members" className="scroll-mt-20">
        <SectionCard title={`Team members (${employees.length})`} description="Turn “Gets leads automatically” on or off for anyone. On = they get new leads in turn when checked in.">
          {employees.length === 0 ? <EmptyState title="No employees yet" description="Add people below." /> : (
            <ul className="divide-y divide-border">
              {employees.map((p) => {
                const on = inOrder.has(p.id)
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="min-w-0">
                      <span className="font-medium">{p.name}</span>
                      <span className="ms-2 text-xs text-muted-foreground">{p.jobTitle ?? ROLE_META[p.role].label}</span>
                    </span>
                    {p.role === 'field_agent' ? (
                      <StatusBadge label="Gets site visits automatically" tone="installation" size="sm" />
                    ) : (
                      <ActionForm action={setAutoLeadsAction} className="flex items-center gap-2">
                        <input type="hidden" name="userId" value={p.id} />
                        <input type="hidden" name="on" value={on ? 'false' : 'true'} />
                        <StatusBadge label={on ? 'Gets leads automatically' : 'No new leads'} tone={on ? 'success' : 'neutral'} size="sm" />
                        <Button type="submit" variant={on ? 'outline' : 'default'} size="touch">
                          {on ? 'Turn off' : 'Turn on'}
                        </Button>
                      </ActionForm>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </SectionCard>
      </section>
        </>
      ) : null}
      {open.key === 'order' ? (
        <>
      {teams.length === 0 ? <EmptyState title="No team yet" description="Create a manager in Team → Add a team member — their team is created automatically." /> : null}
      {teams.map((team) => (
        <div key={team.id} className="grid gap-4 lg:grid-cols-2">
          <SectionCard title={`${team.name}`} description={`${DEPARTMENT_META[team.department]?.label ?? ''} · manager ${team.manager}`} actions={team.settings.paused ? <StatusBadge label="Auto-assign paused" tone="warning" size="sm" /> : null}>
            <p className="mb-2 text-sm text-muted-foreground">Leads go in this order: 1 → 2 → 3 … then back to 1. Only checked-in agents get leads.</p>
            <ol className="space-y-1">
              {team.members.map((m: { id: string; name: string }, i: number) => (
                <li key={m.id} className="flex min-h-11 items-center gap-2 rounded-lg bg-muted/50 px-3">
                  <span className="w-6 font-semibold tabular-nums">{i + 1}</span>
                  <span className="flex-1 truncate">
                    {m.name}
                    {team.lastUid === m.id ? <span className="ms-2 text-xs text-muted-foreground">(got the last lead)</span> : null}
                  </span>
                  <form action={moveTeamMemberAction}>
                    <input type="hidden" name="teamId" value={team.id} />
                    <input type="hidden" name="userId" value={m.id} />
                    <Button type="submit" name="direction" value="up" variant="ghost" size="icon-touch" aria-label={`Move ${m.name} up`} disabled={i === 0}>
                      <ArrowUp />
                    </Button>
                    <Button type="submit" name="direction" value="down" variant="ghost" size="icon-touch" aria-label={`Move ${m.name} down`} disabled={i === team.members.length - 1}>
                      <ArrowDown />
                    </Button>
                  </form>
                  <form action={setTeamMemberAction}>
                    <input type="hidden" name="teamId" value={team.id} />
                    <input type="hidden" name="userId" value={m.id} />
                    <input type="hidden" name="member" value="false" />
                    <Button type="submit" variant="ghost" size="touch">
                      Remove
                    </Button>
                  </form>
                </li>
              ))}
            </ol>
            {callAgents.filter((a) => !team.members.some((m: { id: string }) => m.id === a.id)).length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {callAgents
                  .filter((a) => !team.members.some((m: { id: string }) => m.id === a.id))
                  .map((a) => (
                    <form key={a.id} action={setTeamMemberAction}>
                      <input type="hidden" name="teamId" value={team.id} />
                      <input type="hidden" name="userId" value={a.id} />
                      <input type="hidden" name="member" value="true" />
                      <Button type="submit" variant="outline" size="touch">
                        + {a.name}
                      </Button>
                    </form>
                  ))}
              </div>
            ) : null}
          </SectionCard>
          <SectionCard title="Timings">
            <ActionForm action={updateTeamSettingsAction}>
              <input type="hidden" name="teamId" value={team.id} />
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField label="Manager window (min, 0 = auto at once)" name="managerWindowMin" type="number" min={0} max={60} defaultValue={team.settings.managerWindowMin} />
                <TextField label="Agent must accept within (min)" name="acceptWithinMin" type="number" min={1} max={120} defaultValue={team.settings.acceptWithinMin} />
                <TextField label="First call/WhatsApp within (min)" name="contactWithinMin" type="number" min={5} max={240} defaultValue={team.settings.contactWithinMin} />
                <TextField label="Max leads waiting to accept, per agent" name="maxPendingAccept" type="number" min={1} max={20} defaultValue={team.settings.maxPendingAccept} />
              </div>
              <CheckboxField label="If not accepted in time, move the lead to the next agent" name="autoMoveOnAcceptTimeout" defaultChecked={team.settings.autoMoveOnAcceptTimeout} />
              <CheckboxField label="Give new leads only to agents who are checked in (recommended)" name="requireCheckIn" defaultChecked={team.settings.requireCheckIn} />
              <CheckboxField label="Give out leads at night / on holidays too (otherwise they wait for office hours)" name="assignOutsideHours" defaultChecked={team.settings.assignOutsideHours} />
              <CheckboxField label="Pause auto-assign (manager assigns everything)" name="paused" defaultChecked={team.settings.paused} />
              <Button type="submit" size="touch">
                Save timings
              </Button>
            </ActionForm>
          </SectionCard>
        </div>
      ))}
        </>
      ) : null}
      {open.key === 'working' ? (
        <>
      <SectionCard title="Who is working now">
        {board.length === 0 ? (
          <EmptyState title="No agents" />
        ) : (
          board.map((m) => (
            <div key={m.id} className="flex items-center gap-2">
              <div className="flex-1">
                <TeamMemberRow member={m} now={now} />
              </div>
              <PingAgent agentId={m.id} agentName={m.name} />
              {m.openLeads > 0 ? (
                <form action={bulkReassignAction}>
                  <input type="hidden" name="fromAgentId" value={m.id} />
                  <Button type="submit" variant="outline" size="touch">
                    Give leads to others
                  </Button>
                </form>
              ) : null}
            </div>
          ))
        )}
      </SectionCard>
        </>
      ) : null}
      {open.key === 'add' ? <UsersSection user={user} /> : null}
      {open.key === 'roles' ? <RolesSection user={user} /> : null}
    </>
  )
}
