import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { FilterBar, FilterChip } from '@/components/common/filter-bar'
import { SearchBox } from '@/components/common/search-box'
import { DataTable, type Column } from '@/components/common/data-table'
import { EmptyState } from '@/components/common/states'
import { LeadCard } from '@/components/crm/lead-card'
import { LeadDetailsDialog } from '@/components/crm/lead-details-dialog'
import { LeadBulkActions, LeadSelectBox } from '@/components/crm/lead-bulk-actions'
import { AssignmentBadge, SourceBadge } from '@/components/crm/badges'

import { QuickAddLead } from '@/components/crm/quick-add-lead'
import { RefreshLeadsButton } from '@/components/crm/refresh-leads-button'
import { AssignLeadDialog } from '@/components/crm/assign-lead-dialog'
import { ActionForm } from '@/components/common/action-form'
import { pullSheetAction, revertJunkAction } from '@/server/actions'
import { MoveToJunkButton } from '@/components/crm/move-to-junk-button'
import type { LeadSummary } from '@/domain/view-models'
import { formatPktDateTime } from '@/lib/dates-pkt'
import { formatPhone, maskPhone } from '@/lib/phone'
import { requireUser } from '@/server/auth/session'
import { ArrowLeft, CheckCircle2, Clock, List, Lock, RotateCcw, Users } from 'lucide-react'
import { FollowUpButtonModal } from '@/components/crm/follow-up-modal'
import { SendQuotationDialog } from '@/components/crm/send-quotation-dialog'
import { websiteCatalog } from '@/server/services/website'
import { LEAD_VIEWS, PAGE_SIZE, employeeLeadStats, getAssignableAgents, getQueuePanels, leadFilterOptions, listLeads, type LeadView } from '@/server/services/queries'
import { en } from '@/i18n/en'
import { DATE_PRESET_LABEL, activeFilterCount, parseLeadFilters, receivedRange, type DatePreset } from '@/domain/lead-filters'
import { SectionBack, SectionHub } from '@/components/common/section-hub'
import { EmployeeLeadList, EmployeeLeadNumbers, LeadProgressBar } from '@/components/crm/employee-lead-list'
import { Types } from 'mongoose'
import { LeadFilterPanel } from '@/components/crm/lead-filter-panel'
import { LeadsStateTracker } from '@/components/crm/leads-state-tracker'
import { ExportLeads } from '@/components/crm/export-leads'
import { LeadSourcesPanel } from '@/components/crm/lead-sources-panel'
import { AutoRefresh } from '@/components/common/auto-refresh'
import { leadSourcesStatus } from '@/server/services/lead-sources'
import { QueuePanel } from '@/components/crm/queue-panel'

export const metadata = { title: 'Leads' }

const VIEW_LABEL: Record<LeadView, string> = {
  all: 'All open',
  new: 'New',
  unassigned: 'Unassigned',
  mine: 'My leads',
  followups: 'Follow-ups',
  interested: 'Interested',
  won: 'Won',
  lost: 'Lost',
  unreachable: 'Dead / unreachable',
  junk: 'Junk Leads',
  any: 'Everything',
}

/** Periods offered on "Leads by employee" (counts leads received in that period). */
const PEOPLE_PERIODS: DatePreset[] = ['today', 'this_week', 'this_month', 'last_month']

export default async function LeadsPage(props: PageProps<'/leads'>) {
  const user = await requireUser()
  const sp = await props.searchParams
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined)
  const leader = user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin' || user.role === 'marketing'
  const filters = parseLeadFilters(one)

  // Managers: /leads opens two cards — "Leads by employee" and "All leads".
  if (leader && Object.keys(sp).length === 0) return <LeadsHub user={user} />
  if (leader && one('show') === 'people') return <PeopleSection user={user} date={filters.date} />

  const personId = leader && Types.ObjectId.isValid(one('person') ?? '') ? one('person') : undefined
  const person = personId ? (await employeeLeadStats(user, { personId, range: receivedRange(filters) }))[0] : undefined
  const view = (LEAD_VIEWS as readonly string[]).includes(one('view') ?? '') ? (one('view') as LeadView) : user.role === 'agent' ? 'mine' : personId ? 'any' : 'all'
  const page = Number(one('page') ?? 1)
  const canDelete = user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin'
  const canAssign = canDelete
  const canExport = canDelete || user.role === 'marketing'
  const [{ rows, total, counts }, filterOptions, assignableAgents, catalog] = await Promise.all([
    listLeads(user, { view, q: one('q'), page, sort: one('sort'), dir: one('dir') === 'asc' ? 'asc' : 'desc', filters, personId }),
    leadFilterOptions(user),
    canAssign ? getAssignableAgents(user) : Promise.resolve([]),
    websiteCatalog(),
  ])
  const sources = user.role === 'agent' || personId ? [] : await leadSourcesStatus(user)
  const views = LEAD_VIEWS.filter((v) => !(v === 'mine' && user.role !== 'agent') && !(v === 'unassigned' && (user.role === 'agent' || personId)))
  const href = (params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries({ person: personId, view, q: one('q'), sort: one('sort'), dir: one('dir'), ...filters, ...params })) if (v !== undefined && v !== '') q.set(k, String(v))
    return `/leads?${q}`
  }
    const currentSearchPath = href({})
  const columns: Column<LeadSummary>[] = [
    ...(canDelete ? [{ key: 'select', header: '', cell: (l: LeadSummary) => <LeadSelectBox leadId={l.id} label={`${l.name} ${l.leadNo}`} /> }] : []),
    {
      key: 'name',
      header: 'Customer',
      cell: (l) => (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/leads/${l.id}?returnTo=${encodeURIComponent(currentSearchPath)}`}
              prefetch={false}
              className="font-medium underline-offset-4 hover:underline"
            >
              {l.name}
            </Link>
            <SourceBadge channel={l.channel} detail={l.sourceDetail} platform={l.platform} isAd={l.isAd} size="sm" />
            {l.isLocked ? (
              <span className="inline-flex items-center gap-1 rounded bg-tone-warning-soft px-1.5 py-0.5 text-xs font-semibold text-tone-warning-soft-foreground">
                <Lock className="size-3" aria-hidden /> Locked (New)
              </span>
            ) : null}
          </div>
          <span className="block text-xs text-muted-foreground">
            {l.maskPhone ? maskPhone(l.phone) : formatPhone(l.phone)} · {l.leadNo}
          </span>
        </div>
      ),
    },
    {
      key: 'agent',
      header: 'Agent',
      cell: (l) => (
        <div className="flex flex-col items-start gap-1 py-1">
          {l.agent ? <span className="text-sm font-medium">{l.agent.name}</span> : <AssignmentBadge state={l.assignmentState} size="sm" />}
          {canAssign && l.status === 'open' ? (
            <AssignLeadDialog
              leadId={l.id}
              leadNo={l.leadNo}
              customerName={l.name}
              department={l.department}
              currentAgentId={l.agent?.id}
              agents={assignableAgents}
              triggerLabel={l.agent ? en.lead.reassign : en.lead.assignToMember}
              triggerVariant={l.agent ? 'ghost' : 'outline'}
              triggerSize="xs"
            />
          ) : null}
        </div>
      ),
    },
    {
      key: 'followup1',
      header: (
        <div className="flex flex-col items-center justify-center leading-none gap-0.5" title="Follow-up 1">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground">F-Up</span>
          <span className="text-xs font-bold text-foreground">1</span>
        </div>
      ),
      align: 'center',
      className: 'w-[48px] min-w-[48px] max-w-[52px] px-0.5 text-center',
      cell: (l) => {
        const fu = l.followUps?.find((f) => f.number === 1) ?? { number: 1, status: 'pending' as const }
        return (
          <FollowUpButtonModal
            leadId={l.id}
            leadNo={l.leadNo}
            customerName={l.name}
            customerPhone={l.phone}
            followUp={fu}
            canEdit={user.role === 'agent' ? !l.isLocked : true}
          />
        )
      },
    },
    {
      key: 'followup2',
      header: (
        <div className="flex flex-col items-center justify-center leading-none gap-0.5" title="Follow-up 2">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground">F-Up</span>
          <span className="text-xs font-bold text-foreground">2</span>
        </div>
      ),
      align: 'center',
      className: 'w-[48px] min-w-[48px] max-w-[52px] px-0.5 text-center',
      cell: (l) => {
        const fu = l.followUps?.find((f) => f.number === 2) ?? { number: 2, status: 'pending' as const }
        return (
          <FollowUpButtonModal
            leadId={l.id}
            leadNo={l.leadNo}
            customerName={l.name}
            customerPhone={l.phone}
            followUp={fu}
            canEdit={user.role === 'agent' ? !l.isLocked : true}
            nextFollowUpAt={l.nextFollowUpAt}
          />
        )
      },
    },
    {
      key: 'followup3',
      header: (
        <div className="flex flex-col items-center justify-center leading-none gap-0.5" title="Follow-up 3">
          <span className="text-[10px] uppercase font-semibold text-muted-foreground">F-Up</span>
          <span className="text-xs font-bold text-foreground">3</span>
        </div>
      ),
      align: 'center',
      className: 'w-[48px] min-w-[48px] max-w-[52px] px-0.5 text-center',
      cell: (l) => {
        const fu = l.followUps?.find((f) => f.number === 3) ?? { number: 3, status: 'pending' as const }
        return (
          <FollowUpButtonModal
            leadId={l.id}
            leadNo={l.leadNo}
            customerName={l.name}
            customerPhone={l.phone}
            followUp={fu}
            canEdit={user.role === 'agent' ? !l.isLocked : true}
            nextFollowUpAt={l.nextFollowUpAt}
          />
        )
      },
    },
    {
      key: 'junkAction',
      header: '',
      className: 'w-[40px] min-w-[40px] text-center px-0.5',
      cell: (l) => (
        <MoveToJunkButton
          leadId={l.id}
          leadNo={l.leadNo}
          customerName={l.name}
          canEdit={user.role === 'agent' ? !l.isLocked : true}
        />
      ),
    },
    ...(view === 'junk'
      ? [
          {
            key: 'junkedBy',
            header: 'Junked By & Reason',
            cell: (l: LeadSummary) => (
              <div className="space-y-0.5 text-xs">
                <span className="font-medium text-foreground">{l.junkedBy?.name ?? 'CRM User'}</span>
                {l.junkedBy?.reason ? (
                  <span className="block max-w-[200px] text-tone-danger-soft-foreground font-medium" title={l.junkedBy.reason}>
                    {l.junkedBy.reason}
                  </span>
                ) : null}
                {l.junkedBy?.at ? (
                  <span className="block text-muted-foreground">{formatPktDateTime(new Date(l.junkedBy.at))}</span>
                ) : null}
              </div>
            ),
          },
          ...(canDelete
            ? [
                {
                  key: 'revert',
                  header: 'Restore',
                  cell: (l: LeadSummary) => (
                    <ActionForm action={revertJunkAction}>
                      <input type="hidden" name="leadId" value={l.id} />
                      <Button type="submit" size="xs" variant="outline" className="h-8 gap-1 text-xs">
                        <RotateCcw className="size-3" aria-hidden />
                        <span>Revert to New</span>
                      </Button>
                    </ActionForm>
                  ),
                },
              ]
            : []),
        ]
      : []),
    {
      key: 'quote',
      header: 'Quote',
      className: 'w-[75px] min-w-[75px] px-1',
      cell: (l) => (
        <SendQuotationDialog
          leadId={l.id}
          leadNo={l.leadNo}
          customerName={l.name}
          customerPhone={l.phone}
          quotationSent={l.quotationSent}
          catalog={catalog}
          compact
        />
      ),
    },
    {
      key: 'received',
      header: 'Received',
      sortable: true,
      className: 'whitespace-nowrap text-xs text-muted-foreground w-[110px] min-w-[110px] px-1.5',
      cell: (l) => formatPktDateTime(new Date(l.receivedAt))
    },
    {
      key: 'details',
      header: '',
      className: 'w-[40px] min-w-[40px] text-center px-0.5',
      cell: (l) => <LeadDetailsDialog leadId={l.id} compact />
    },
  ]
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const queuePanels = view === 'unassigned' && user.role !== 'agent' ? await getQueuePanels(user) : []
  return (
    <>
      {leader ? (
        <Button asChild variant="outline" size="touch" className="self-start">
          <Link href={personId ? `/leads?show=people${filters.date ? `&date=${filters.date}` : ''}` : '/leads'}>
            <ArrowLeft className="rtl:rotate-180" aria-hidden />
            {personId ? 'All employees' : 'Leads home'}
          </Link>
        </Button>
      ) : null}
      <PageHeader
        title={person ? `${person.name} — leads` : 'Leads'}
        description={person ? `${total} in this view · tap a lead to see its stage, notes, proof and WhatsApp chat` : `${total} in this view`}
        actions={
          person ? undefined : (
            <div className="flex flex-wrap items-start gap-2">
              <RefreshLeadsButton />
              {user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin' ? (
                <ActionForm action={pullSheetAction} className="space-y-2">
                  <input type="hidden" name="mode" value="live" />
                  <Button type="submit" variant="outline" size="touch">
                    Sync Google Sheet now
                  </Button>
                </ActionForm>
              ) : null}
              {user.role !== 'marketing' ? <QuickAddLead defaultDepartment={user.departmentCode} /> : null}
            </div>
          )
        }
      />
      {person ? (
        <div className="space-y-2 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-foreground/10">
          <LeadProgressBar person={person} />
          <EmployeeLeadNumbers person={person} />
        </div>
      ) : null}
      {one('notice') === 'erased' ? <p role="status" className="rounded-lg bg-tone-success-soft px-3 py-2 text-sm text-tone-success-soft-foreground">The customer&apos;s data was erased permanently.</p> : null}
      <Suspense fallback={null}><LeadsStateTracker /></Suspense>
      {sources.length && !person ? <LeadSourcesPanel sources={sources} /> : <AutoRefresh />}
      <Suspense>
        <SearchBox />
      </Suspense>
      {queuePanels.length ? <QueuePanel teams={queuePanels} /> : null}
      <FilterBar>
        {views.map((v) => (
          <FilterChip key={v} label={VIEW_LABEL[v]} href={href({ view: v, page: undefined })} active={v === view} count={counts[v]} />
        ))}
      </FilterBar>
      <LeadFilterPanel
        filters={filters}
        keep={{ view, q: one('q'), sort: one('sort'), dir: one('dir') }}
        href={(changes) => href({ ...changes, page: undefined })}
        agents={filterOptions.agents}
        forms={filterOptions.forms}
        showAgent={user.role !== 'agent' && !personId}
        showDepartment={user.role === 'admin' || user.role === 'super_admin'}
      />
      {canExport ? <ExportLeads filters={personId ? { ...filters, agent: personId } : filters} agents={filterOptions.agents} showDepartment={user.role === 'admin' || user.role === 'super_admin'} /> : null}
      {rows.length === 0 ? (
        activeFilterCount(filters) ? (
          <EmptyState title="No leads match these filters" description="Remove a filter above or press Clear all." />
        ) : (
          <EmptyState title="No leads here" description="New leads from Facebook / Instagram forms, the Google Sheet and WhatsApp appear automatically." />
        )
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {rows.map((l) => (
              <div key={l.id} className="flex items-start gap-2">
                {canDelete ? <LeadSelectBox leadId={l.id} label={`${l.name} ${l.leadNo}`} /> : null}
                <div className="min-w-0 flex-1 space-y-2">
                  <LeadCard lead={l} href={`/leads/${l.id}?returnTo=${encodeURIComponent(currentSearchPath)}`} showAgent={user.role !== 'agent'} />
                  {canAssign && l.status === 'open' && !l.agent ? (
                    <AssignLeadDialog
                      leadId={l.id}
                      leadNo={l.leadNo}
                      customerName={l.name}
                      department={l.department}
                      agents={assignableAgents}
                      triggerLabel={en.lead.assignToMember}
                      triggerSize="touch"
                      className="w-full"
                    />
                  ) : null}
                </div>
                <LeadDetailsDialog leadId={l.id} compact />
              </div>
            ))}
          </div>
          <DataTable
            className="hidden md:block"
            columns={columns}
            rows={rows}
            getRowKey={(l) => l.id}
            sort={{ key: one('sort') ?? 'received', direction: one('dir') === 'asc' ? 'asc' : 'desc' }}
            sortHref={(key, dir) => href({ sort: key, dir, page: undefined })}
            caption="Leads"
          />
          {/* Follow-up status legend / guide */}
          <div className="hidden md:flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-muted-foreground rounded-lg bg-card/60 ring-1 ring-foreground/10">
            <div className="flex items-center gap-4">
              <span className="font-semibold text-foreground text-[11px] uppercase tracking-wider">Follow-up Guide:</span>
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <span className="inline-flex size-4 items-center justify-center rounded-md bg-tone-success-soft text-tone-success-soft-foreground ring-1 ring-tone-success/40">
                  <CheckCircle2 className="size-3" aria-hidden />
                </span>
                <span>Green = Done</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <span className="inline-flex size-4 items-center justify-center rounded-md bg-tone-danger-soft text-tone-danger-soft-foreground ring-1 ring-tone-danger/40">
                  <Clock className="size-3" aria-hidden />
                </span>
                <span>Red = Pending</span>
              </span>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Click any icon to record or view follow-up notes
            </span>
          </div>
        </>
      )}
      {/* Delete sits under the list: tick leads above, then delete here. */}
      {canDelete && rows.length ? <LeadBulkActions /> : null}
      {pages > 1 ? (
        <nav className="flex items-center justify-between" aria-label="Pages">
          {page > 1 ? (
            <Button asChild variant="outline" size="touch">
              <Link href={href({ page: page - 1 })}>Previous</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">
            Page {page} of {pages}
          </span>
          {page < pages ? (
            <Button asChild variant="outline" size="touch">
              <Link href={href({ page: page + 1 })}>Next</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  )
}

type SessionUserOf = Awaited<ReturnType<typeof requireUser>>

/** Leads home for managers: two cards. */
async function LeadsHub({ user }: { user: SessionUserOf }) {
  const [people, sources] = await Promise.all([employeeLeadStats(user), leadSourcesStatus(user)])
  const onDuty = people.filter((p) => p.onDuty).length
  const open = people.reduce((n, p) => n + p.open, 0)
  return (
    <>
      <PageHeader title="Leads" description="Choose how you want to see leads." actions={<QuickAddLead defaultDepartment={user.departmentCode} />} />
      <SectionHub
        label="Leads"
        items={[
          {
            key: 'people',
            title: 'Leads by employee',
            description: 'Every employee with how many leads they have and how far they got. Tap a name to see their leads.',
            icon: Users,
            href: '/leads?show=people',
            badge: `${people.length} people · ${onDuty} checked in`,
            badgeTone: onDuty ? 'ok' : 'plain',
          },
          {
            key: 'all',
            title: 'All leads',
            description: 'The full list with search, filters, Excel export and delete.',
            icon: List,
            href: '/leads?view=all',
            badge: `${open} open with employees`,
          },
        ]}
      />
      {sources.length ? <LeadSourcesPanel sources={sources} /> : null}
    </>
  )
}

/** "Leads by employee": names only, with counts and progress. Tap a name → that person's leads. */
async function PeopleSection({ user, date }: { user: SessionUserOf; date?: DatePreset }) {
  const people = await employeeLeadStats(user, { range: receivedRange({ date }) })
  const q = (d?: DatePreset) => `/leads?show=people${d ? `&date=${d}` : ''}`
  return (
    <>
      <SectionBack href="/leads" backLabel="Leads home" title="Leads by employee" description="Green = won · blue = still open · grey = lost / dead. Tap a name to see that person's leads." icon={Users} />
      <AutoRefresh />
      <FilterBar>
        <FilterChip label="All time" href={q()} active={!date} />
        {PEOPLE_PERIODS.map((d) => (
          <FilterChip key={d} label={DATE_PRESET_LABEL[d]} href={q(d)} active={date === d} />
        ))}
      </FilterBar>
      <EmployeeLeadList people={people} hrefFor={(id) => `/leads?person=${id}&view=any${date ? `&date=${date}` : ''}`} />
    </>
  )
}
