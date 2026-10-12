'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePollInterval } from '@/lib/poll-interval'

/**
 * Re-loads the page's data every interval while the screen is visible (and right away when it is opened again),
 * so new leads appear without pressing Refresh. Skips a round while someone is typing or has ticked leads to delete.
 */
export function AutoRefresh({
  everyMs,
  busySelector,
  showLabel = true,
}: {
  everyMs?: number
  busySelector?: string
  showLabel?: boolean
}) {
  const router = useRouter()
  const [configuredSec] = usePollInterval()
  const effectiveMs = everyMs !== undefined ? everyMs : configuredSec * 1000
  const [at, setAt] = useState<Date | null>(null)

  useEffect(() => {
    if (effectiveMs <= 0) return

    let last = Date.now()
    const busy = () => {
      const el = document.activeElement
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return true
      return busySelector ? !!document.querySelector(busySelector) : false
    }
    const tick = () => {
      if (document.visibilityState !== 'visible' || busy()) return
      last = Date.now()
      router.refresh()
      setAt(new Date())
    }
    const id = setInterval(tick, effectiveMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last > effectiveMs) tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router, effectiveMs, busySelector])

  if (!showLabel) return null

  const label =
    effectiveMs <= 0
      ? 'Auto-refresh: off'
      : effectiveMs < 60_000
        ? `Updates by itself every ${Math.round(effectiveMs / 1000)}s`
        : `Updates by itself every ${Math.round(effectiveMs / 60_000)} min`

  return (
    <span className="text-xs text-muted-foreground" aria-live="polite">
      {label}
      {at ? ` · last ${at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' })}` : ''}
    </span>
  )
}
