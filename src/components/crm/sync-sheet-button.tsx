'use client'

import { useActionState, useEffect, useState } from 'react'
import { RefreshCw, CheckCircle2, AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pullSheetAction } from '@/server/actions'

/**
 * One-click button in the Leads section header to sync latest leads from the connected Google Sheet.
 * Displays real-time sync progress, new rows imported, duplicates skipped, and row status.
 */
export function SyncSheetButton() {
  const [state, formAction, pending] = useActionState(pullSheetAction, null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const showBanner = Boolean(state?.message && state.message !== dismissed)

  useEffect(() => {
    if (!state?.message) return
    const currentMessage = state.message
    const timer = setTimeout(() => {
      setDismissed(currentMessage)
    }, 8000)
    return () => clearTimeout(timer)
  }, [state?.message])

  return (
    <div className="relative inline-flex items-center">
      <form action={formAction}>
        <input type="hidden" name="mode" value="live" />
        <Button
          type="submit"
          variant="outline"
          size="touch"
          disabled={pending}
          title="Fetch latest leads from Google Sheet"
          className="relative"
        >
          <RefreshCw className={pending ? 'animate-spin' : ''} data-icon="inline-start" />
          <span>{pending ? 'Syncing...' : 'Sync Sheet'}</span>
        </Button>
      </form>

      {showBanner && state?.message && (
        <aside
          role="status"
          aria-live="polite"
          className="absolute end-0 top-full z-50 mt-2 min-w-[280px] max-w-sm rounded-xl border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg backdrop-blur"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              {state.ok ? (
                <CheckCircle2 className="size-4 shrink-0 text-tone-success-soft-foreground mt-0.5" />
              ) : (
                <AlertCircle className="size-4 shrink-0 text-tone-danger-soft-foreground mt-0.5" />
              )}
              <div>
                <p className="font-semibold text-foreground">
                  {state.ok ? 'Google Sheet Synced' : 'Sync Notice'}
                </p>
                <p className="mt-0.5 text-muted-foreground leading-relaxed">{state.message}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(state.message!)}
              className="text-muted-foreground hover:text-foreground rounded p-0.5"
              aria-label="Close notification"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </aside>
      )}
    </div>
  )
}
