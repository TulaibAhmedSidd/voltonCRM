import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DATE_PRESET_LABEL, DATE_PRESETS, type LeadFilters } from '@/domain/lead-filters'

/**
 * "Download Excel" for managers: end of day / week / month or a date range. Plain GET form → the browser downloads
 * the file. The filters in use on the Leads page (source, agent, stage…) are sent too.
 */
export function ExportLeads({ filters }: { filters: LeadFilters }) {
  const { date: _d, from: _f, to: _t, ...rest } = filters
  void _d
  void _f
  void _t
  return (
    <details className="group rounded-xl bg-card ring-1 ring-foreground/10">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 font-medium [&::-webkit-details-marker]:hidden">
        <Download className="size-4" aria-hidden />
        Download Excel report
      </summary>
      <form method="get" action="/api/exports/leads" className="space-y-3 border-t border-border p-4">
        {Object.entries(rest).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={String(v)} /> : null))}
        <p className="text-sm text-muted-foreground">
          3 sheets: <span className="font-medium text-foreground">Summary</span> (each employee: tries, calls, WhatsApp, results, deals),{' '}
          <span className="font-medium text-foreground">Leads</span> (received or worked in the period, with their status right now) and{' '}
          <span className="font-medium text-foreground">Activity</span> (every try).
          {Object.keys(rest).length ? ' The filters in use on this page apply too.' : ''}
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Period</span>
            <select name="period" defaultValue="today" className="h-11 w-full rounded-lg border border-input bg-card px-3">
              {DATE_PRESETS.map((d) => (
                <option key={d} value={d}>
                  {DATE_PRESET_LABEL[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">Or from date</span>
            <input type="date" name="pfrom" className="h-11 w-full rounded-lg border border-input bg-card px-3" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium">To date</span>
            <input type="date" name="pto" className="h-11 w-full rounded-lg border border-input bg-card px-3" />
          </label>
        </div>
        <Button type="submit" size="touch">
          <Download aria-hidden />
          Download Excel
        </Button>
      </form>
    </details>
  )
}
