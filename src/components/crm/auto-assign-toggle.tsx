'use client'

import { useState, useTransition } from 'react'
import { Zap, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { StatusBadge } from '@/components/common/status-badge'
import { toggleAutoAssignAction } from '@/server/actions'

export interface AutoAssignToggleProps {
  teamId: string
  initialEnabled: boolean
  teamName?: string
}

export function AutoAssignToggle({ teamId, initialEnabled, teamName }: AutoAssignToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [isPending, startTransition] = useTransition()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    setStatusMessage(null)
    startTransition(async () => {
      const res = await toggleAutoAssignAction(teamId, checked)
      if (res?.message) {
        setStatusMessage(res.message)
      }
      if (!res?.ok) {
        // Revert on error
        setEnabled(!checked)
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tone-brand-soft text-tone-brand-soft-foreground">
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Zap className="size-4" />}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground text-sm sm:text-base">Auto-assign leads</span>
              {teamName ? <span className="text-xs text-muted-foreground">({teamName})</span> : null}
              <StatusBadge
                label={enabled ? 'Active' : 'Manual'}
                tone={enabled ? 'success' : 'warning'}
                size="sm"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {enabled
                ? 'Leads automatically assign to checked-in agents without manual intervention.'
                : 'Manual mode — leads wait in queue until you assign them.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <label htmlFor={`auto-assign-${teamId}`} className="sr-only">
            Auto-assign leads
          </label>
          <Switch
            id={`auto-assign-${teamId}`}
            checked={enabled}
            disabled={isPending}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>

      {statusMessage ? (
        <p className="mt-2 text-xs font-medium text-tone-info-soft-foreground bg-tone-info-soft rounded-lg px-2.5 py-1.5 animate-in fade-in duration-200">
          {statusMessage}
        </p>
      ) : null}
    </div>
  )
}
