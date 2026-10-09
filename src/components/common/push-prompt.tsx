'use client'

import { useEffect, useState } from 'react'
import { BellRing, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { pushState, turnOnPush, type PushState } from '@/lib/push-client'

const DISMISS_KEY = 'volton-push-prompt-dismissed'
const DISMISS_DAYS = 3

/**
 * A banner on every page until this device has phone / PC notifications on (new leads, pings, reminders).
 * "Later" hides it for 3 days on this device.
 */
export function PushPrompt({ pushKey }: { pushKey?: string | null }) {
  const [state, setState] = useState<PushState | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let dismissed = false
    try {
      const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0)
      dismissed = Date.now() - at < DISMISS_DAYS * 86_400_000
    } catch {
      // storage blocked — just show it
    }
    if (!dismissed) void pushState().then(setState)
  }, [])

  if (!pushKey || !state || state === 'on' || state === 'unsupported' || state === 'denied') return null

  const later = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()))
    } catch {
      // ignore
    }
    setState(null)
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl bg-tone-brand-soft p-3 text-sm text-tone-brand-soft-foreground ring-1 ring-tone-brand/30">
      <BellRing className="size-5 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1">
        {state === 'ios-install' ? (
          <>
            <span className="font-semibold">Get alerts on this iPhone:</span> tap Share → “Add to Home Screen”, open the CRM from the Home Screen, then turn on notifications from the bell.
          </>
        ) : (
          <>
            <span className="font-semibold">Turn on notifications</span> to get new leads, pings and reminders on this {/Mobi/i.test(navigator.userAgent) ? 'phone' : 'computer'} — even when the CRM is closed.
          </>
        )}
        {message ? <span className="mt-1 block text-xs">{message}</span> : null}
      </p>
      {state === 'off' ? (
        <Button
          type="button"
          size="touch"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              const r = await turnOnPush(pushKey)
              setMessage(r.message)
            } catch {
              setMessage('Could not turn on notifications on this device.')
            }
            setState(await pushState())
            setBusy(false)
          }}
        >
          Turn on
        </Button>
      ) : null}
      <Button type="button" variant="ghost" size="icon-touch" aria-label="Later" onClick={later}>
        <X />
      </Button>
    </div>
  )
}
