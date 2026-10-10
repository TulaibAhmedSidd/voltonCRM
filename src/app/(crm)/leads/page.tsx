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
import { AssignmentBadge, DepartmentBadge, SourceBadge, StageBadge } from '@/components/crm/badges'
import { QuickAddLead } from '@/components/crm/quick-add-lead'
import { ActionForm } from '@/components/common/action-form'
import { pullSheetAction } from '@/server/actions'
import type { LeadSummary } from '@/domain/view-models'
import { formatPktDateTime } from '@/lib/dates-pkt'
import { formatPhone, maskPhone } from '@/lib/phone'
import { requireUser } from '@/server/auth/session'
import { ArrowLeft, List, Users } from 'lucide-react'
import { LEAD_VIEWS, PAGE_SIZE, employeeLeadStats, getQueuePanels, leadFilterOptions, listLeads, type LeadView } from '@/server/services/queries'
import { DATE_PRESET_LABEL, activeFilterCount, parseLeadFilters, receivedRange, type DatePreset } from '@/domain/lead-filters'
import { SectionBack, SectionHub } from '@/components/common/section-hub'
import { EmployeeLeadList, EmployeeLeadNumbers, LeadProgressBar } from '@/components/crm/employee-lead-list'
import { Types } from 'mongoose'
import { LeadFilterPanel } from '@/components/crm/lead-filter-panel'
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
  unreachable: 'Dead / junk',
  any: 'Everything',
}

/** Periods offered on "Leads by employee" (counts leads received in that period). */
const PEOPLE_PERIODS: DatePreset[] = ['today', 'this_week', 'this_month', 'last_month']

export default async function LeadsPage(props: PageProps<'/leads'>) {
  const user = await requireUser()
  const sp = await props.searchParams
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined)
  const leader = user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin'
  const filters = parseLeadFilters(one)

  // Managers: /leads opens two cards — "Leads by employee" and "All leads".
  if (leader && Object.keys(sp).length === 0) return <LeadsHub user={user} />
  if (leader && one('show') === 'people') return <PeopleSection user={user} date={filters.date} />

  const personId = leader && Types.ObjectId.isValid(one('person') ?? '') ? one('person') : undefined
  const person = personId ? (await employeeLeadStats(user, { personId, range: receivedRange(filters) }))[0] : undefined
  const view = (LEAD_VIEWS as readonly string[]).includes(one('view') ?? '') ? (one('view') as LeadView) : user.role === 'agent' ? 'mine' : personId ? 'any' : 'all'
  const page = Number(one('page') ?? 1)
  const [{ rows, total, counts }, filterOptions] = await Promise.all([
    listLeads(user, { view, q: one('q'), page, sort: one('sort'), dir: one('dir') === 'asc' ? 'asc' : 'desc', filters, personId }),
    leadFilterOptions(user),
  ])
  const sources = user.role === 'agent' || personId ? [] : await leadSourcesStatus(user)
  const views = LEAD_VIEWS.filter((v) => !(v === 'mine' && user.role !== 'agent') && !(v === 'unassigned' && (user.role === 'agent' || personId)))
  const href = (params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries({ person: personId, view, q: one('q'), sort: one('sort'), dir: one('dir'), ...filters, ...params })) if (v !== undefined && v !== '') q.set(k, String(v))
    return `/leads?${q}`
  }
  const canDelete = user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin'
  const columns: Column<LeadSummary>[] = [
    ...(canDelete ? [{ key: 'select', header: '', cell: (l: LeadSummary) => <LeadSelectBox leadId={l.id} label={`${l.name} ${l.leadNo}`} /> }] : []),
    {
      key: 'name',
      header: 'Customer',
      cell: (l) => (
        <Link href={`/leads/${l.id}`} className="font-medium underline-offset-4 hover:underline">
          {l.name}
          <span className="block text-xs text-muted-foreground">
            {l.maskPhone ? maskPhone(l.phone) : formatPhone(l.phone)} · {l.leadNo}
          </span>
        </Link>
      ),
    },
    { key: 'stage', header: 'Stage', cell: (l) => <StageBadge stage={l.stage} size="sm" /> },
    { key: 'dept', header: 'Dept', cell: (l) => <DepartmentBadge department={l.department} size="sm" /> },
    { key: 'source', header: 'Source', cell: (l) => <SourceBadge channel={l.channel} detail={l.sourceDetail} platform={l.platform} isAd={l.isAd} size="sm" /> },
    { key: 'agent', header: 'Agent', cell: (l) => (l.agent ? l.agent.name : <AssignmentBadge state={l.assignmentState} size="sm" />) },
    { key: 'attempts', header: 'Attempts', sortable: true, align: 'end', cell: (l) => l.attemptCount },
    { key: 'followup', header: 'Next follow-up', sortable: true, cell: (l) => (l.nextFollowUpAt ? formatPktDateTime(new Date(l.nextFollowUpAt)) : '—') },
    { key: 'received', header: 'Received', sortable: true, cell: (l) => formatPktDateTime(new Date(l.receivedAt)) },
    { key: 'details', header: 'Details', cell: (l) => <LeadDetailsDialog leadId={l.id} compact /> },
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
              {user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin' ? (
                <ActionForm action={pullSheetAction} className="space-y-2">
                  <input type="hidden" name="mode" value="live" />
                  <Button type="submit" variant="outline" size="touch">
                    Sync Google Sheet now
                  </Button>
                </ActionForm>
              ) : null}
              <QuickAddLead defaultDepartment={user.departmentCode} />
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
      {canDelete ? <ExportLeads filters={personId ? { ...filters, agent: personId } : filters} agents={filterOptions.agents} showDepartment={user.role === 'admin' || user.role === 'super_admin'} /> : null}
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
                <div className="min-w-0 flex-1">
                  <LeadCard lead={l} href={`/leads/${l.id}`} showAgent={user.role !== 'agent'} />
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
