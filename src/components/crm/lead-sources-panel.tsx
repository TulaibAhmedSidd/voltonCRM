'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, CircleAlert, CircleOff, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react'
import { AutoRefresh } from '@/components/common/auto-refresh'
import { ActionForm } from '@/components/common/action-form'
import { SubmitButton } from '@/components/common/submit-button'
import { Button } from '@/components/ui/button'
import { formatPktDateTime } from '@/lib/dates-pkt'
import { usePollInterval, POLL_INTERVAL_OPTIONS } from '@/lib/poll-interval'
import { importLeadsSpreadsheetAction, pullSheetAction, syncMetaLeadsAction } from '@/server/actions'
import type { LeadSourceStatus } from '@/server/services/lead-sources'
import { cn } from '@/lib/utils'

const ICON = { live: CheckCircle2, stopped: CircleAlert, off: CircleOff } as const
const TONE = { live: 'text-tone-success', stopped: 'text-tone-danger', off: 'text-muted-foreground' } as const
const WORD = { live: 'Auto-sync on', stopped: 'Stopped', off: 'Not connected' } as const

/** Leads page: where leads come from, whether each source syncs by itself, configurable auto-refresh, and manual force-fetch. */
export function LeadSourcesPanel({ sources }: { sources: LeadSourceStatus[] }) {
  const router = useRouter()
  const [intervalSec, setIntervalSec] = usePollInterval()

  return (
    <details className="group rounded-xl bg-card ring-1 ring-foreground/10" open>
      <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="font-medium">Where leads come from</span>
        <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs text-muted-foreground">Auto-refresh:</span>
          <select
            value={intervalSec}
            onChange={(e) => setIntervalSec(Number(e.target.value))}
            aria-label="Auto-refresh interval"
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {POLL_INTERVAL_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <AutoRefresh busySelector='input[form="bulk-leads"]:checked' />
        </div>
      </summary>
      <ul className="grid gap-3 border-t border-border p-3 sm:grid-cols-2">
        {sources.map((s) => {
          const Icon = ICON[s.health]
          return (
            <li key={s.key} className="flex flex-col justify-between gap-3 rounded-lg bg-muted/40 p-3 text-sm sm:flex-row sm:items-start">
              <div className="flex min-w-0 gap-3">
                <Icon className={cn('mt-0.5 size-5 shrink-0', TONE[s.health])} aria-hidden />
                <div className="min-w-0 space-y-0.5">
                  <p className="font-medium">
                    {s.name} <span className={cn('text-xs font-semibold', TONE[s.health])}>· {s.badge ?? WORD[s.health]}</span>
                  </p>
                  <p className="text-muted-foreground">{s.how}</p>
                  {s.lastAt ? (
                    <p className="text-xs text-muted-foreground">
                      {s.lastLabel}: {formatPktDateTime(new Date(s.lastAt))}
                    </p>
                  ) : null}
                  {s.problem ? <p className="rounded-md bg-tone-danger-soft px-2 py-1 text-xs text-tone-danger-soft-foreground">{s.problem}</p> : null}
                </div>
              </div>
              <div className="flex shrink-0 self-end sm:self-start">
                {s.key === 'sheet' ? (
                  <ActionForm action={pullSheetAction}>
                    <input type="hidden" name="mode" value="live" />
                    <SubmitButton size="xs" variant="outline" pendingText="Syncing…">
                      <RefreshCw data-icon="inline-start" aria-hidden />
                      Fetch latest
                    </SubmitButton>
                  </ActionForm>
                ) : s.key === 'meta' ? (
                  <ActionForm action={syncMetaLeadsAction}>
                    <input type="hidden" name="days" value="2" />
                    <SubmitButton size="xs" variant="outline" pendingText="Syncing…">
                      <RefreshCw data-icon="inline-start" aria-hidden />
                      Fetch latest
                    </SubmitButton>
                  </ActionForm>
                ) : (
                  <Button type="button" size="xs" variant="outline" onClick={() => router.refresh()}>
                    <RefreshCw data-icon="inline-start" aria-hidden />
                    Refresh
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Upload leads from Excel / CSV */}
      <div className="border-t border-border p-3">
        <details className="rounded-lg border border-border bg-muted/20 p-3" open>
          <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between text-sm font-semibold [&::-webkit-details-marker]:hidden">
            <span className="inline-flex items-center gap-2">
              <FileSpreadsheet className="size-4 text-tone-brand" aria-hidden />
              Upload leads from Excel (.xlsx) or CSV
            </span>
            <span className="text-xs font-normal text-muted-foreground">Smart tab detection & anti-duplicate</span>
          </summary>

          <div className="mt-3 space-y-3">
            <div className="rounded-md border border-border bg-card p-3 text-xs leading-relaxed space-y-2">
              <p className="font-semibold text-foreground">Exact expected columns in your file:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-muted-foreground">
                <div className="rounded border border-border bg-muted/40 p-2">
                  <span className="font-medium text-foreground block">Required Columns:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li><strong className="text-foreground">Customer</strong> (or Name / Client)</li>
                    <li><strong className="text-foreground">Phone</strong> (or Mobile / Contact e.g. 03001234567)</li>
                  </ul>
                </div>
                <div className="rounded border border-border bg-muted/40 p-2">
                  <span className="font-medium text-foreground block">Optional Columns:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    <li><strong>City</strong> (e.g. Lahore, Karachi)</li>
                    <li><strong>Department</strong> (Trading or Installation)</li>
                    <li><strong>Source</strong> (Facebook form, WhatsApp, Manual)</li>
                    <li><strong>Campaign / form / ad</strong></li>
                    <li><strong>KW / System size</strong> (e.g. 10kW)</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                💡 <strong>Multi-tab Excel:</strong> If your file has multiple tabs (like Summary, Leads, Follow-ups), the CRM automatically finds and imports directly from the <strong>&ldquo;Leads&rdquo;</strong> tab.
              </p>
              <p className="text-xs text-muted-foreground">
                🔒 <strong>Anti-duplicate protection:</strong> Any phone number or lead already present in the CRM is automatically detected and skipped so your pipeline stays clean without duplicates.
              </p>
            </div>

            <ActionForm action={importLeadsSpreadsheetAction}>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="file"
                  name="file"
                  accept=".xlsx,.xls,.csv"
                  required
                  className="h-11 flex-1 rounded-lg border border-input bg-card px-3 py-2 text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-xs"
                />
                <SubmitButton size="touch" pendingText="Verifying & importing…">
                  <Upload data-icon="inline-start" aria-hidden />
                  Upload & import
                </SubmitButton>
              </div>
            </ActionForm>
          </div>
        </details>
      </div>

      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Leads update automatically based on your selected refresh interval. You can also click &ldquo;Fetch latest&rdquo; on any source or upload an Excel backup above.
      </p>
    </details>
  )
}
