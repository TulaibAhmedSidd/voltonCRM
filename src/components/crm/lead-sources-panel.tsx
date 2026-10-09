import { CheckCircle2, CircleAlert, CircleOff } from 'lucide-react'
import { AutoRefresh } from '@/components/common/auto-refresh'
import { formatPktDateTime } from '@/lib/dates-pkt'
import type { LeadSourceStatus } from '@/server/services/lead-sources'
import { cn } from '@/lib/utils'

const ICON = { live: CheckCircle2, stopped: CircleAlert, off: CircleOff } as const
const TONE = { live: 'text-tone-success', stopped: 'text-tone-danger', off: 'text-muted-foreground' } as const
const WORD = { live: 'Auto-sync on', stopped: 'Stopped', off: 'Not connected' } as const

/** Leads page: where leads come from, whether each source syncs by itself, and that this list refreshes itself. */
export function LeadSourcesPanel({ sources }: { sources: LeadSourceStatus[] }) {
  return (
    <details className="group rounded-xl bg-card ring-1 ring-foreground/10" open>
      <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-4 py-2 [&::-webkit-details-marker]:hidden">
        <span className="font-medium">Where leads come from</span>
        <AutoRefresh busySelector='input[form="bulk-leads"]:checked' />
      </summary>
      <ul className="grid gap-2 border-t border-border p-3 sm:grid-cols-2">
        {sources.map((s) => {
          const Icon = ICON[s.health]
          return (
            <li key={s.key} className="flex gap-3 rounded-lg bg-muted/40 p-3 text-sm">
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
            </li>
          )
        })}
      </ul>
      <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
        You don’t need to press Refresh: new leads appear here by themselves (every minute while this page is open, and as soon as you come back to it).
      </p>
    </details>
  )
}
