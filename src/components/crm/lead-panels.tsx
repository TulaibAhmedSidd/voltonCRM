'use client'

import { useCallback, useState } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

export interface LeadPanelDef {
  key: string
  title: string
  description: string
  /** An icon element, e.g. <FileText /> (rendered on the server). */
  icon: React.ReactNode
  badge?: string
  /** The section itself, shown in a panel that slides up from the bottom. */
  content: React.ReactNode
}

const TONES = ['bg-tone-brand-soft text-tone-brand-soft-foreground', 'bg-tone-info-soft text-tone-info-soft-foreground'] as const

/**
 * Lead page: one card per job (Quotation, Stage, Manage, Timeline…). Tapping a card slides that section up from the
 * bottom; only one is open at a time. ?panel=key opens one directly (e.g. links from "Make quotation").
 */
export function LeadPanels({ panels, initial }: { panels: LeadPanelDef[]; initial?: string | null }) {
  const [open, setOpen] = useState<string | null>(panels.some((p) => p.key === initial) ? (initial as string) : null)

  const change = useCallback((key: string | null) => {
    setOpen(key)
    // Keep the address in step (shareable, Back button friendly) without reloading.
    const url = new URL(window.location.href)
    if (key) url.searchParams.set('panel', key)
    else url.searchParams.delete('panel')
    url.searchParams.delete('tab')
    url.hash = ''
    window.history.replaceState(null, '', url)
  }, [])

  return (
    <>
      <nav aria-label="Lead sections">
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {panels.map((p, i) => (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => change(p.key)}
                aria-haspopup="dialog"
                className="group flex h-full min-h-24 w-full items-start gap-3 rounded-2xl bg-card p-3 text-start text-card-foreground shadow-sm ring-1 ring-foreground/10 transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-ring sm:p-4"
              >
                <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5', TONES[i % 2])}>{p.icon}</span>
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="flex items-center justify-between gap-1">
                    <span className="font-heading text-sm font-semibold sm:text-base">{p.title}</span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground rtl:rotate-180" aria-hidden />
                  </span>
                  <span className="line-clamp-2 block text-xs text-muted-foreground sm:text-sm">{p.description}</span>
                  {p.badge ? <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{p.badge}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {panels.map((p) => (
        <Sheet key={p.key} open={open === p.key} onOpenChange={(o) => change(o ? p.key : null)}>
          <SheetContent side="bottom" showCloseButton={false} className="max-h-[92dvh] gap-0 rounded-t-2xl md:mx-auto md:max-w-4xl">
            <div className="px-4 pt-2 md:hidden" aria-hidden>
              <span className="mx-auto block h-1.5 w-12 rounded-full bg-muted" />
            </div>
            <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <SheetTitle className="font-heading text-lg font-semibold">{p.title}</SheetTitle>
                <SheetDescription className="text-sm text-muted-foreground">{p.description}</SheetDescription>
              </div>
              <Button type="button" variant="outline" size="touch" onClick={() => change(null)} aria-label={`Close ${p.title}`}>
                <X aria-hidden />
                Close
              </Button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-4 pb-6 pt-2">{p.content}</div>
          </SheetContent>
        </Sheet>
      ))}
    </>
  )
}
