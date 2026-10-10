'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DEPARTMENTS, STAGES } from '@/domain/constants'
import { DATE_PRESET_LABEL, DATE_PRESETS, LEAD_SOURCE_FILTERS, SOURCE_FILTER_LABEL, type DatePreset, type LeadFilters, type LeadSourceFilter } from '@/domain/lead-filters'
import { en } from '@/i18n/en'
import { cn } from '@/lib/utils'

type Period = DatePreset | 'custom'
const control = 'h-11 w-full rounded-lg border border-input bg-card px-3 text-sm'

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn('inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors', active ? 'border-secondary bg-secondary text-secondary-foreground' : 'border-border bg-card hover:bg-muted')}
    >
      {children}
    </button>
  )
}

/**
 * Leads page → "Download Excel report": choose the period (or From / To dates), one or more sources
 * (e.g. Facebook + WhatsApp + Website together), which leads, and optionally an employee / stage. Starts from the
 * filters in use on the page. Plain GET → the browser downloads the file.
 */
export function ExportLeads({ filters, agents = [], showDepartment = false }: { filters: LeadFilters; agents?: { id: string; name: string }[]; showDepartment?: boolean }) {
  const [period, setPeriod] = useState<Period>(filters.from || filters.to ? 'custom' : (filters.date ?? 'this_month'))
  const [from, setFrom] = useState(filters.from ?? '')
  const [to, setTo] = useState(filters.to ?? '')
  const [sources, setSources] = useState<LeadSourceFilter[]>([...new Set([...(filters.sources ?? []), ...(filters.source ? [filters.source] : [])])])
  const [basis, setBasis] = useState<'received' | 'worked'>('received')
  const [agent, setAgent] = useState(filters.agent ?? '')
  const [stage, setStage] = useState<string>(filters.stage ?? '')
  const [department, setDepartment] = useState<string>(filters.department ?? '')

  const toggle = (s: LeadSourceFilter) => setSources((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]))
  const customMissing = period === 'custom' && !from && !to
  const periodText = period === 'custom' ? `${from || 'start'} → ${to || 'today'}` : DATE_PRESET_LABEL[period]
  const sourceText = sources.length ? sources.map((s) => SOURCE_FILTER_LABEL[s]).join(' + ') : 'All sources'
  const agentText = agent === 'none' ? 'not assigned' : agent ? (agents.find((a) => a.id === agent)?.name ?? 'one employee') : 'all employees'

  return (
    <details className="group rounded-xl bg-card ring-1 ring-foreground/10">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-medium [&::-webkit-details-marker]:hidden">
        <Download className="size-4" aria-hidden />
        Download Excel report
        <span className="ms-auto text-xs font-normal text-muted-foreground group-open:hidden">Choose period, sources, employee…</span>
      </summary>
      <form method="get" action="/api/exports/leads" className="space-y-5 border-t border-border p-4">
        {/* What the browser sends */}
        {period === 'custom' ? (
          <>
            {from ? <input type="hidden" name="pfrom" value={from} /> : null}
            {to ? <input type="hidden" name="pto" value={to} /> : null}
          </>
        ) : (
          <input type="hidden" name="period" value={period} />
        )}
        {sources.length ? <input type="hidden" name="sources" value={sources.join(',')} /> : null}
        <input type="hidden" name="basis" value={basis} />
        {agent ? <input type="hidden" name="agent" value={agent} /> : null}
        {stage ? <input type="hidden" name="stage" value={stage} /> : null}
        {department ? <input type="hidden" name="department" value={department} /> : null}

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">1 · Period</legend>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((d) => (
              <Chip key={d} active={period === d} onClick={() => setPeriod(d)}>
                {DATE_PRESET_LABEL[d]}
              </Chip>
            ))}
            <Chip active={period === 'custom'} onClick={() => setPeriod('custom')}>
              From – To dates
            </Chip>
          </div>
          {period === 'custom' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block font-medium">From</span>
                <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={control} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block font-medium">To</span>
                <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={control} />
              </label>
            </div>
          ) : null}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">2 · Sources (tick one or more)</legend>
          <div className="flex flex-wrap gap-2">
            <Chip active={!sources.length} onClick={() => setSources([])}>
              All sources
            </Chip>
            {LEAD_SOURCE_FILTERS.map((s) => (
              <Chip key={s} active={sources.includes(s)} onClick={() => toggle(s)}>
                {sources.includes(s) ? '✓ ' : ''}
                {SOURCE_FILTER_LABEL[s]}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">3 · Which leads</legend>
          <div className="flex flex-wrap gap-2">
            <Chip active={basis === 'received'} onClick={() => setBasis('received')}>
              Received in this period
            </Chip>
            <Chip active={basis === 'worked'} onClick={() => setBasis('worked')}>
              Received or worked on in this period
            </Chip>
          </div>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">4 · More (optional)</legend>
          <div className={cn('grid gap-3', showDepartment ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Employee</span>
              <select value={agent} onChange={(e) => setAgent(e.target.value)} className={control}>
                <option value="">All employees</option>
                <option value="none">Not assigned</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Stage</span>
              <select value={stage} onChange={(e) => setStage(e.target.value)} className={control}>
                <option value="">All stages</option>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {en.stage[s]}
                  </option>
                ))}
              </select>
            </label>
            {showDepartment ? (
              <label className="text-sm">
                <span className="mb-1 block font-medium">Department</span>
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className={control}>
                  <option value="">All departments</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {en.department[d]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        </fieldset>

        <div className="space-y-3 rounded-lg bg-muted/50 p-3 text-sm">
          <p>
            <span className="font-medium">You will get:</span> {sourceText} · {periodText} · {basis === 'received' ? 'leads received' : 'leads received or worked on'} · {agentText}
            {stage ? ` · ${en.stage[stage as (typeof STAGES)[number]]}` : ''}
          </p>
          <p className="text-xs text-muted-foreground">
            3 sheets: <span className="font-medium text-foreground">Summary</span> (each employee: tries, calls, WhatsApp, results, deals), <span className="font-medium text-foreground">Leads</span> (with their status right now) and{' '}
            <span className="font-medium text-foreground">Activity</span> (every call / WhatsApp try).
          </p>
          <Button type="submit" size="touch" disabled={customMissing}>
            <Download aria-hidden />
            Download Excel
          </Button>
          {customMissing ? <p className="text-xs text-tone-warning-soft-foreground">Pick a From or To date.</p> : null}
        </div>
      </form>
    </details>
  )
}
