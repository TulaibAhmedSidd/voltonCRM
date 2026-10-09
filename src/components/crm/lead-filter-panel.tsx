import Form from 'next/form'
import Link from 'next/link'
import { SlidersHorizontal, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FilterBar, FilterChip } from '@/components/common/filter-bar'
import { SelectField, TextField } from '@/components/common/fields'
import { DEPARTMENTS, STAGES } from '@/domain/constants'
import {
  activeFilterCount,
  ATTEMPT_FILTER_LABEL,
  ATTEMPT_FILTERS,
  DATE_PRESET_LABEL,
  DATE_PRESETS,
  FOLLOWUP_FILTER_LABEL,
  FOLLOWUP_FILTERS,
  LEAD_SOURCE_FILTERS,
  SOURCE_FILTER_LABEL,
  type LeadFilters,
} from '@/domain/lead-filters'
import { DEPARTMENT_META, STAGE_META } from '@/domain/ui-maps'

type Href = (changes: Record<string, string | undefined>) => string

const opts = <T extends string>(values: readonly T[], label: (v: T) => string) => values.map((v) => ({ value: v, label: label(v) }))

/**
 * Leads page filters: a row of source chips (Facebook, Instagram, WhatsApp…) and a "More filters" panel with one
 * filter per column plus date presets / range. URL-driven (shareable, works with Back), applied on the server.
 */
export function LeadFilterPanel({
  filters,
  keep,
  href,
  agents,
  forms,
  showAgent,
  showDepartment,
}: {
  filters: LeadFilters
  /** view / search / sort, kept when the panel is submitted */
  keep: Record<string, string | undefined>
  href: Href
  agents: { id: string; name: string }[]
  forms: string[]
  showAgent: boolean
  showDepartment: boolean
}) {
  const count = activeFilterCount(filters)
  const agentName = (id: string) => (id === 'none' ? 'Nobody assigned' : (agents.find((a) => a.id === id)?.name ?? 'Agent'))
  const chips: [keyof LeadFilters, string][] = [
    ...(filters.source ? [['source', `Source: ${SOURCE_FILTER_LABEL[filters.source]}`] as [keyof LeadFilters, string]] : []),
    ...(filters.stage ? [['stage', `Stage: ${STAGE_META[filters.stage].label}`] as [keyof LeadFilters, string]] : []),
    ...(filters.department ? [['department', `Dept: ${DEPARTMENT_META[filters.department].label}`] as [keyof LeadFilters, string]] : []),
    ...(filters.agent ? [['agent', `Agent: ${agentName(filters.agent)}`] as [keyof LeadFilters, string]] : []),
    ...(filters.attempts ? [['attempts', `Tries: ${ATTEMPT_FILTER_LABEL[filters.attempts]}`] as [keyof LeadFilters, string]] : []),
    ...(filters.followup ? [['followup', `Follow-up: ${FOLLOWUP_FILTER_LABEL[filters.followup]}`] as [keyof LeadFilters, string]] : []),
    ...(filters.date ? [['date', `Received: ${DATE_PRESET_LABEL[filters.date]}`] as [keyof LeadFilters, string]] : []),
    ...(filters.from ? [['from', `From ${filters.from}`] as [keyof LeadFilters, string]] : []),
    ...(filters.to ? [['to', `To ${filters.to}`] as [keyof LeadFilters, string]] : []),
    ...(filters.form ? [['form', `Form / campaign: ${filters.form}`] as [keyof LeadFilters, string]] : []),
    ...(filters.city ? [['city', `City: ${filters.city}`] as [keyof LeadFilters, string]] : []),
  ]
  const clearAll = href(Object.fromEntries(Object.keys(filters).map((k) => [k, undefined])))

  return (
    <div className="space-y-3">
      <FilterBar>
        <FilterChip label="All sources" href={href({ source: undefined })} active={!filters.source} />
        {LEAD_SOURCE_FILTERS.map((s) => (
          <FilterChip key={s} label={SOURCE_FILTER_LABEL[s]} href={href({ source: s })} active={filters.source === s} />
        ))}
      </FilterBar>

      <details className="group rounded-xl bg-card ring-1 ring-foreground/10">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-medium [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal className="size-4" aria-hidden />
          <span className="group-open:hidden">Show more filters</span>
          <span className="hidden group-open:inline">Hide filters</span>
          {count ? <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground tabular-nums">{count} on</span> : null}
        </summary>
        <Form key={JSON.stringify(filters)} action="/leads" className="space-y-4 border-t border-border p-4">
          {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField label="Source" name="source" placeholder="All sources" defaultValue={filters.source ?? ''} options={opts(LEAD_SOURCE_FILTERS, (s) => SOURCE_FILTER_LABEL[s])} />
            <SelectField label="Stage" name="stage" placeholder="All stages" defaultValue={filters.stage ?? ''} options={opts(STAGES, (s) => STAGE_META[s].label)} />
            {showDepartment ? <SelectField label="Department" name="department" placeholder="All departments" defaultValue={filters.department ?? ''} options={opts(DEPARTMENTS, (d) => DEPARTMENT_META[d].label)} /> : null}
            {showAgent ? (
              <SelectField label="Agent" name="agent" placeholder="All agents" defaultValue={filters.agent ?? ''} options={[{ value: 'none', label: 'Nobody assigned' }, ...agents.map((a) => ({ value: a.id, label: a.name }))]} />
            ) : null}
            <SelectField label="Tries" name="attempts" placeholder="Any number" defaultValue={filters.attempts ?? ''} options={opts(ATTEMPT_FILTERS, (a) => ATTEMPT_FILTER_LABEL[a])} />
            <SelectField label="Next follow-up" name="followup" placeholder="Any" defaultValue={filters.followup ?? ''} options={opts(FOLLOWUP_FILTERS, (f) => FOLLOWUP_FILTER_LABEL[f])} />
            {forms.length ? <SelectField label="Form / campaign" name="form" placeholder="All forms and campaigns" defaultValue={filters.form ?? ''} options={forms.map((f) => ({ value: f, label: f }))} /> : null}
            <TextField label="City" name="city" defaultValue={filters.city ?? ''} placeholder="e.g. Lahore" />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Received (Pakistan time)</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <SelectField label="Day / period" name="date" placeholder="Any time" defaultValue={filters.date ?? ''} options={opts(DATE_PRESETS, (d) => DATE_PRESET_LABEL[d])} />
              <TextField label="From date" name="from" type="date" defaultValue={filters.from ?? ''} hint="A date range replaces the period" />
              <TextField label="To date" name="to" type="date" defaultValue={filters.to ?? ''} />
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="touch">
              Apply filters
            </Button>
            {count ? (
              <Button asChild variant="outline" size="touch">
                <Link href={clearAll}>Clear all</Link>
              </Button>
            ) : null}
          </div>
        </Form>
      </details>

      {chips.length ? (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filters in use">
          {chips.map(([key, label]) => (
            <Link key={key} href={href({ [key]: undefined })} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-muted px-3 text-sm hover:bg-muted/70" aria-label={`Remove filter ${label}`}>
              {label}
              <X className="size-3.5" aria-hidden />
            </Link>
          ))}
          <Link href={clearAll} className="min-h-9 px-2 text-sm font-medium underline underline-offset-4">
            Clear all
          </Link>
        </div>
      ) : null}
    </div>
  )
}
