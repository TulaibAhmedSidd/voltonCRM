import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { EmployeeLeadStats } from '@/server/services/queries'
import { RoleBadge } from '@/components/crm/badges'
import { EmptyState } from '@/components/common/states'
import { formatPktDateTime } from '@/lib/dates-pkt'
import { cn } from '@/lib/utils'

/** Won (green) · still open (blue) · lost / dead (grey) as one bar. */
export function LeadProgressBar({ person }: { person: Pick<EmployeeLeadStats, 'total' | 'won' | 'open' | 'closed'> }) {
  const pct = (n: number) => (person.total ? (n / person.total) * 100 : 0)
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${person.won} won, ${person.open} open, ${person.closed} lost or dead out of ${person.total}`}>
      <span className="h-full bg-tone-success" style={{ width: `${pct(person.won)}%` }} />
      <span className="h-full bg-tone-info" style={{ width: `${pct(person.open)}%` }} />
      <span className="h-full bg-tone-neutral" style={{ width: `${pct(person.closed)}%` }} />
    </div>
  )
}

/** Small numbers under a person: Open 12 · Not contacted 3 … (zero values that do not matter are hidden). */
export function EmployeeLeadNumbers({ person, className }: { person: EmployeeLeadStats; className?: string }) {
  const all: { label: string; value: number; tone?: 'warn' | 'ok' }[] = [
    { label: 'Open', value: person.open },
    { label: 'Not accepted yet', value: person.waitingAccept, tone: 'warn' },
    { label: 'Not contacted', value: person.notContacted, tone: 'warn' },
    { label: 'Interested +', value: person.interested },
    { label: 'Won', value: person.won, tone: 'ok' },
    { label: 'Lost / dead', value: person.closed },
    { label: 'Overdue follow-ups', value: person.overdueFollowUps, tone: 'warn' },
  ]
  const items = all.filter((i) => i.value || i.label === 'Open' || i.label === 'Won')
  return (
    <ul className={cn('flex flex-wrap gap-x-3 gap-y-1 text-xs', className)}>
      {items.map((i) => (
        <li key={i.label} className={cn('tabular-nums', i.tone === 'warn' ? 'font-medium text-tone-warning-soft-foreground' : i.tone === 'ok' ? 'font-medium text-tone-success-soft-foreground' : 'text-muted-foreground')}>
          {i.label} <span className="font-semibold">{i.value}</span>
        </li>
      ))}
    </ul>
  )
}

/**
 * Leads page → "Leads by employee": one card per person — how many leads they have and how far they got.
 * Tapping a person opens their leads.
 */
export function EmployeeLeadList({ people, hrefFor }: { people: EmployeeLeadStats[]; hrefFor: (id: string) => string }) {
  if (!people.length) return <EmptyState title="No employees yet" description="Add call agents or field agents on the Team page — they appear here with their leads." />
  return (
    <ul className="grid gap-3 md:grid-cols-2" aria-label="Employees and their leads">
      {people.map((p) => (
        <li key={p.id}>
          <Link
            href={hrefFor(p.id)}
            className="group flex h-full flex-col gap-3 rounded-2xl bg-card p-4 text-card-foreground shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring"
          >
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0 space-y-1">
                <span className="block font-heading text-base font-semibold">{p.name}</span>
                <span className="flex flex-wrap items-center gap-1.5">
                  {p.jobTitle ? <span className="text-xs text-muted-foreground">{p.jobTitle}</span> : <RoleBadge role={p.role} size="sm" />}
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', p.onDuty ? 'bg-tone-success-soft text-tone-success-soft-foreground' : 'bg-muted text-muted-foreground')}>{p.onDuty ? 'Checked in' : 'Not checked in'}</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-end">
                <span>
                  <span className="block font-heading text-2xl font-semibold tabular-nums">{p.total}</span>
                  <span className="block text-xs text-muted-foreground">{p.total === 1 ? 'lead' : 'leads'}</span>
                </span>
                <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
              </span>
            </span>
            <LeadProgressBar person={p} />
            <EmployeeLeadNumbers person={p} />
            {p.lastAssignedAt ? <span className="text-xs text-muted-foreground">Last lead given {formatPktDateTime(new Date(p.lastAssignedAt))}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}
