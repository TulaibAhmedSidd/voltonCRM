'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatPktDateTime } from '@/lib/dates-pkt'
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

/** Polls /api/me/poll every 30 s while the screen is visible (alerts; also a backup clock if the external cron misses a minute). */
export function NotificationBell() {
  const [data, setData] = useState<{ unread: number; items: Item[] }>({ unread: 0, items: [] })

  useEffect(() => {
    let alive = true
    const load = async () => {
      const res = await fetch('/api/me/poll', { cache: 'no-store' }).catch(() => null)
      if (res?.ok && alive) setData(await res.json())
    }
    // Only while the screen is visible: a phone in a pocket or a background tab makes no calls.
    let id: ReturnType<typeof setInterval> | undefined
    const start = () => {
      if (id || document.visibilityState !== 'visible') return
      load()
      id = setInterval(load, 30_000)
    }
    const stop = () => {
      clearInterval(id)
      id = undefined
    }
    const onVisibility = () => (document.visibilityState === 'visible' ? start() : stop())
    start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      alive = false
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return (
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
  )
}
