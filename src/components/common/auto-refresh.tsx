'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Re-loads the page's data every `everyMs` while the screen is visible (and right away when it is opened again),
 * so new leads appear without pressing Refresh. Skips a round while someone is typing or has ticked leads to delete.
 */
export function AutoRefresh({ everyMs = 60_000, busySelector }: { everyMs?: number; busySelector?: string }) {
  const router = useRouter()
  const [at, setAt] = useState<Date | null>(null)

  useEffect(() => {
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
    const id = setInterval(tick, everyMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - last > everyMs) tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [router, everyMs, busySelector])

  return (
    <span className="text-xs text-muted-foreground" aria-live="polite">
      Updates by itself every {Math.round(everyMs / 60_000) || 1} min{at ? ` · last ${at.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Karachi' })}` : ''}
    </span>
  )
}
