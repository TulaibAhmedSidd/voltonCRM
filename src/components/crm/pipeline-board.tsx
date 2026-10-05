'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StageBadge } from '@/components/crm/badges'
import { LeadCard } from '@/components/crm/lead-card'
import type { Stage } from '@/domain/constants'
import type { LeadSummary } from '@/domain/view-models'

export interface PipelineBoardProps {
  stages: Stage[]
  leads: LeadSummary[]
}

export function PipelineBoard({ stages, leads }: PipelineBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDownRef = useRef(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)
  const hasDraggedRef = useRef(false)
  const [isGrabbing, setIsGrabbing] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollButtons = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 10)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 10)
  }, [])

  useEffect(() => {
    updateScrollButtons()
    window.addEventListener('resize', updateScrollButtons)
    return () => window.removeEventListener('resize', updateScrollButtons)
  }, [updateScrollButtons])

  const scrollByAmount = (amount: number) => {
    if (!containerRef.current) return
    containerRef.current.scrollBy({ left: amount, behavior: 'smooth' })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only drag on left click
    if (e.button !== 0) return
    const el = containerRef.current
    if (!el) return

    isDownRef.current = true
    hasDraggedRef.current = false
    startXRef.current = e.pageX - el.offsetLeft
    scrollLeftRef.current = el.scrollLeft
    setIsGrabbing(true)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDownRef.current) return
    const el = containerRef.current
    if (!el) return

    e.preventDefault()
    const x = e.pageX - el.offsetLeft
    const walk = x - startXRef.current

    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true
    }

    el.scrollLeft = scrollLeftRef.current - walk
    updateScrollButtons()
  }

  const handleMouseUp = () => {
    isDownRef.current = false
    setIsGrabbing(false)
  }

  // Intercept click on children if user was dragging
  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.preventDefault()
      e.stopPropagation()
      hasDraggedRef.current = false
    }
  }

  // Allow vertical mouse wheel to scroll horizontally across columns
  const handleWheel = (e: React.WheelEvent) => {
    const el = containerRef.current
    if (!el) return

    // If scrolling vertically and not holding Shift
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX) && !e.shiftKey) {
      // If container can scroll in that direction, convert wheel to horizontal
      const canScrollDown = el.scrollLeft + el.clientWidth < el.scrollWidth - 5
      const canScrollUp = el.scrollLeft > 5

      if ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)) {
        el.scrollLeft += e.deltaY * 0.8
        updateScrollButtons()
      }
    }
  }

  return (
    <div className="relative group">
      {/* Scroll controls for desktop */}
      {canScrollLeft ? (
        <Button
          type="button"
          variant="outline"
          size="icon-touch"
          aria-label="Scroll left"
          className="absolute -start-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex rounded-full shadow-md bg-card/90 backdrop-blur"
          onClick={() => scrollByAmount(-320)}
        >
          <ChevronLeft className="size-5" />
        </Button>
      ) : null}

      {canScrollRight ? (
        <Button
          type="button"
          variant="outline"
          size="icon-touch"
          aria-label="Scroll right"
          className="absolute -end-3 top-1/2 -translate-y-1/2 z-10 hidden md:flex rounded-full shadow-md bg-card/90 backdrop-blur"
          onClick={() => scrollByAmount(320)}
        >
          <ChevronRight className="size-5" />
        </Button>
      ) : null}

      {/* Horizontal scrolling Kanban container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClickCapture={handleClickCapture}
        onWheel={handleWheel}
        onScroll={updateScrollButtons}
        className={`-mx-4 flex gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:px-0 touch-pan-x select-none transition-cursor ${
          isGrabbing ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {stages.map((stage) => {
          const cards = leads.filter((l) => l.stage === stage)
          return (
            <section
              key={stage}
              className="w-72 shrink-0 space-y-2 rounded-xl bg-muted/60 p-2"
              aria-label={stage}
            >
              <header className="flex items-center justify-between px-1 py-1">
                <StageBadge stage={stage} size="sm" />
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {cards.length}
                </span>
              </header>
              <div className="space-y-2">
                {cards.slice(0, 30).map((l) => (
                  <LeadCard key={l.id} lead={l} href={`/leads/${l.id}`} />
                ))}
              </div>
              {cards.length > 30 ? (
                <Link
                  href={`/leads?view=all`}
                  className="block px-1 text-xs text-muted-foreground underline"
                >
                  +{cards.length - 30} more
                </Link>
              ) : null}
            </section>
          )
        })}
      </div>
    </div>
  )
}
