'use client'

import { useRouter } from 'next/navigation'
import { CheckCircle2, CircleAlert, CircleOff, RefreshCw } from 'lucide-react'
import { AutoRefresh } from '@/components/common/auto-refresh'
import { ActionForm } from '@/components/common/action-form'
import { SubmitButton } from '@/components/common/submit-button'
import { Button } from '@/components/ui/button'
import { formatPktDateTime } from '@/lib/dates-pkt'
import { usePollInterval, POLL_INTERVAL_OPTIONS } from '@/lib/poll-interval'
import { pullSheetAction, syncMetaLeadsAction } from '@/server/actions'
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
      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        Leads update automatically based on your selected refresh interval. You can also click &ldquo;Fetch latest&rdquo; on any source to pull new leads immediately.
      </p>
    </details>
  )
}
