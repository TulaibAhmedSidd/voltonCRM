'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { Bell, BellOff, BellRing, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatPktDateTime } from '@/lib/dates-pkt'
import { pushState, turnOffPush, turnOnPush, type PushState } from '@/lib/push-client'
import { markNotificationsReadAction } from '@/server/actions'
import { cn } from '@/lib/utils'

interface Item {
  id: string
  title: string
  body: string
  link: string | null
  at: string
  read: boolean
}
interface Toast {
  id: string
  title: string
  body: string
  link: string | null
}

const TOAST_MS = 8000

/**
 * The bell: unread alerts (checked every 30 s while the screen is visible, and at once when a push arrives),
 * a pop-up toast for every NEW alert, and the switch for phone / PC notifications (Web Push).
 */
export function NotificationBell({ pushKey }: { pushKey?: string | null }) {
  const [data, setData] = useState<{ unread: number; items: Item[] }>({ unread: 0, items: [] })
  const [toasts, setToasts] = useState<Toast[]>([])
  const [push, setPush] = useState<PushState | null>(null)
  const [pushMsg, setPushMsg] = useState('')
  const seen = useRef<Set<string> | null>(null)

  const showToasts = useCallback((items: Toast[]) => {
    if (!items.length) return
    setToasts((t) => [...items, ...t].slice(0, 4))
    navigator.vibrate?.(150)
    for (const it of items) setTimeout(() => setToasts((t) => t.filter((x) => x.id !== it.id)), TOAST_MS)
  }, [])

  const load = useCallback(async () => {
    const res = await fetch('/api/me/poll', { cache: 'no-store' }).catch(() => null)
    if (!res?.ok) return
    const next = (await res.json()) as { unread: number; items: Item[] }
    setData(next)
    // First load only remembers what is there; later loads pop up what is new.
    if (seen.current) showToasts(next.items.filter((i) => !i.read && !seen.current!.has(i.id)).map((i) => ({ id: i.id, title: i.title, body: i.body, link: i.link })))
    seen.current = new Set([...(seen.current ?? []), ...next.items.map((i) => i.id)])
  }, [showToasts])

  useEffect(() => {
    // Only while the screen is visible: a phone in a pocket or a background tab makes no calls (push covers those).
    let id: ReturnType<typeof setInterval> | undefined
    const start = () => {
      if (id || document.visibilityState !== 'visible') return
      void load()
      id = setInterval(load, 30_000)
    }
    const stop = () => {
      clearInterval(id)
      id = undefined
    }
    const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop())
    // A push while the CRM is open on screen: the service worker hands it to the page → check now (shows the toast).
    const onSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'volton-push') void load()
    }
    start()
    document.addEventListener('visibilitychange', onVisibility)
    navigator.serviceWorker?.addEventListener('message', onSwMessage)
    void pushState().then(setPush)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
      navigator.serviceWorker?.removeEventListener('message', onSwMessage)
    }
  }, [load])

  async function togglePush() {
    setPushMsg('')
    try {
      if (push === 'on') {
        await turnOffPush()
        setPushMsg('Notifications are off for this device.')
      } else if (pushKey) {
        const r = await turnOnPush(pushKey)
        setPushMsg(r.message)
      }
    } catch {
      setPushMsg('Could not change notifications on this device.')
    }
    setPush(await pushState())
  }

  const close = (id: string) => setToasts((x) => x.filter((y) => y.id !== id))

  return (
    <>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon-touch" aria-label={`Notifications (${data.unread} unread)`} className="relative">
            <Bell />
            {data.unread > 0 ? (
              <span className="absolute end-1 top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-tone-danger px-1 text-[10px] font-semibold text-tone-danger-foreground">
                {data.unread > 9 ? '9+' : data.unread}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-sm font-semibold">Notifications</span>
            <form
              action={async () => {
                await markNotificationsReadAction()
                setData((d) => ({ unread: 0, items: d.items.map((i) => ({ ...i, read: true })) }))
              }}
            >
              <Button type="submit" variant="ghost" size="touch">
                Mark all read
              </Button>
            </form>
          </div>
          {pushKey && push && push !== 'unsupported' ? (
            <div className="space-y-1 border-b border-border px-3 py-2 text-sm">
              {push === 'ios-install' ? (
                <p className="text-muted-foreground">iPhone: tap Share → “Add to Home Screen”, open the CRM from the Home Screen, then turn on notifications here.</p>
              ) : push === 'denied' ? (
                <p className="text-muted-foreground">Notifications are blocked for this site. Allow them in the browser / phone settings.</p>
              ) : (
                <Button type="button" variant={push === 'on' ? 'ghost' : 'default'} size="touch" className="w-full" onClick={togglePush}>
                  {push === 'on' ? <BellOff aria-hidden /> : <BellRing aria-hidden />}
                  {push === 'on' ? 'Turn off phone / PC notifications' : 'Turn on phone / PC notifications'}
                </Button>
              )}
              {pushMsg ? <p className="text-xs text-muted-foreground">{pushMsg}</p> : null}
            </div>
          ) : null}
          <ul className="max-h-96 overflow-y-auto">
            {data.items.length === 0 ? <li className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications</li> : null}
            {data.items.map((n) => (
              <li key={n.id} className={cn('border-b border-border last:border-0', !n.read && 'bg-tone-brand-soft/50')}>
                <Link href={n.link ?? '#'} className="block px-3 py-2 hover:bg-muted">
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body ? <p className="text-xs text-muted-foreground">{n.body}</p> : null}
                  <p className="text-[11px] text-muted-foreground">{formatPktDateTime(new Date(n.at))}</p>
                </Link>
              </li>
            ))}
          </ul>
        </PopoverContent>
      </Popover>

      {/* Pop-up toasts for new alerts (bottom-right on PC, above the bottom menu on phones). Drawn on <body> so the
          top bar cannot trap them. Only rendered once a toast exists (never on the server → no hydration mismatch). */}
      {toasts.length
        ? createPortal(
            <div className="pointer-events-none fixed inset-x-4 bottom-24 z-50 flex flex-col items-end gap-2 md:inset-x-auto md:end-4 md:bottom-4" aria-live="assertive">
              {toasts.map((t) => (
                <div key={t.id} role="alert" className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl bg-card p-3 text-card-foreground shadow-xl ring-1 ring-foreground/15">
                  <BellRing className="mt-0.5 size-5 shrink-0 text-tone-brand" aria-hidden />
                  <Link href={t.link ?? '/dashboard'} className="min-w-0 flex-1" onClick={() => close(t.id)}>
                    <p className="text-sm font-semibold">{t.title}</p>
                    {t.body ? <p className="text-xs text-muted-foreground">{t.body}</p> : null}
                  </Link>
                  <button type="button" aria-label="Close" className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted" onClick={() => close(t.id)}>
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
