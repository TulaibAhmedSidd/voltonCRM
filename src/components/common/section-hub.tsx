import Link from 'next/link'
import { ArrowLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface HubItem {
  key: string
  title: string
  description: string
  icon: LucideIcon
  href: string
  /** Small status text on the card, e.g. "3 connected" or "Not connected". */
  badge?: string
  /** Badge colour: ok (green) / warn (amber) / plain. */
  badgeTone?: 'ok' | 'warn' | 'plain'
}

// Two card colours, alternating: brand (gold) and info (blue).
const TONES = [
  { icon: 'bg-tone-brand-soft text-tone-brand-soft-foreground', ring: 'hover:ring-tone-brand' },
  { icon: 'bg-tone-info-soft text-tone-info-soft-foreground', ring: 'hover:ring-tone-info' },
] as const
const BADGE = { ok: 'bg-tone-success-soft text-tone-success-soft-foreground', warn: 'bg-tone-warning-soft text-tone-warning-soft-foreground', plain: 'bg-muted text-muted-foreground' } as const

/** A grid of big cards — one per section of a page. Tapping a card opens only that section (?section=key). */
export function SectionHub({ items, label }: { items: HubItem[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => {
          const tone = TONES[i % 2]
          const Icon = item.icon
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={cn('group flex h-full min-h-28 items-start gap-4 rounded-2xl bg-card p-4 text-card-foreground shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring', tone.ring)}
              >
                <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-xl', tone.icon)}>
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 space-y-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-heading text-base font-semibold">{item.title}</span>
                    <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden />
                  </span>
                  <span className="block text-sm text-muted-foreground">{item.description}</span>
                  {item.badge ? <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium', BADGE[item.badgeTone ?? 'plain'])}>{item.badge}</span> : null}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** Top of an opened section: "← back" to the cards, plus the section title. */
export function SectionBack({ href, backLabel, title, description, icon: Icon }: { href: string; backLabel: string; title: string; description?: string; icon?: LucideIcon }) {
  return (
    <div className="space-y-3">
      <Button asChild variant="outline" size="touch">
        <Link href={href}>
          <ArrowLeft className="rtl:rotate-180" aria-hidden />
          {backLabel}
        </Link>
      </Button>
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-tone-brand-soft text-tone-brand-soft-foreground">
            <Icon className="size-5" aria-hidden />
          </span>
        ) : null}
        <div>
          <h1 className="font-heading text-xl font-semibold">{title}</h1>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
    </div>
  )
}
