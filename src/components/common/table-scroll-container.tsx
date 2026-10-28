'use client'

import React, { useRef, useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TableScrollContainerProps {
  children: React.ReactNode
  className?: string
}

/**
 * Interactive scroll container for wide data tables.
 * Provides:
 * 1. Top synchronized scrollbar (so users on non-touch mice never have to scroll down 25 rows to find the scrollbar).
 * 2. Left / Right smooth-scroll chevron buttons.
 * 3. Mouse click-and-drag horizontal panning on table background / empty areas.
 */
export function TableScrollContainer({ children, className }: TableScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const topScrollRef = useRef<HTMLDivElement>(null)
  const isSyncingRef = useRef(false)

  const [hasOverflow, setHasOverflow] = useState(false)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const dragStartXRef = useRef(0)
  const dragScrollLeftRef = useRef(0)
  const hasMovedRef = useRef(false)

  const updateScrollState = useCallback(() => {
    const el = containerRef.current
    if (!el) return

    const overflow = el.scrollWidth > el.clientWidth + 2
    setHasOverflow(overflow)
    setScrollWidth(el.scrollWidth)
    setCanScrollLeft(el.scrollLeft > 5)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    updateScrollState()

    const observer = new ResizeObserver(() => {
      updateScrollState()
    })
    observer.observe(el)

    return () => observer.disconnect()
  }, [updateScrollState])

  const handleContainerScroll = useCallback(() => {
    updateScrollState()
    if (isSyncingRef.current || !topScrollRef.current || !containerRef.current) return

    isSyncingRef.current = true
    topScrollRef.current.scrollLeft = containerRef.current.scrollLeft
    requestAnimationFrame(() => {
      isSyncingRef.current = false
    })
  }, [updateScrollState])

  const handleTopScroll = useCallback(() => {
    if (isSyncingRef.current || !topScrollRef.current || !containerRef.current) return

    isSyncingRef.current = true
    containerRef.current.scrollLeft = topScrollRef.current.scrollLeft
    updateScrollState()
    requestAnimationFrame(() => {
      isSyncingRef.current = false
    })
  }, [updateScrollState])

  const scrollByAmount = (amount: number) => {
    containerRef.current?.scrollBy({ left: amount, behavior: 'smooth' })
  }

  // Mouse Drag-to-Scroll handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement | null
    // Skip dragging when clicking interactive elements
    if (target?.closest('button, a, input, select, textarea, [role="button"], [data-no-drag], [tabindex="0"]')) {
      return
    }

    if (!containerRef.current) return
    setIsDragging(true)
    hasMovedRef.current = false
    dragStartXRef.current = e.pageX - containerRef.current.offsetLeft
    dragScrollLeftRef.current = containerRef.current.scrollLeft
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    e.preventDefault()
    const x = e.pageX - containerRef.current.offsetLeft
    const walk = (x - dragStartXRef.current) * 1.5 // Responsive pan multiplier
    if (Math.abs(walk) > 3) {
      hasMovedRef.current = true
    }
    containerRef.current.scrollLeft = dragScrollLeftRef.current - walk
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  return (
    <div className={cn('relative rounded-xl bg-card ring-1 ring-foreground/10 overflow-hidden', className)}>
      {/* Top Synchronized Scroll Controls */}
      {hasOverflow ? (
        <div className="flex items-center justify-between border-b border-border/40 bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground select-none">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!canScrollLeft}
              onClick={() => scrollByAmount(-250)}
              className="inline-flex size-6 items-center justify-center rounded hover:bg-background disabled:opacity-30 transition-all active:scale-95"
              aria-label="Scroll table left"
              title="Scroll left"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              disabled={!canScrollRight}
              onClick={() => scrollByAmount(250)}
              className="inline-flex size-6 items-center justify-center rounded hover:bg-background disabled:opacity-30 transition-all active:scale-95"
              aria-label="Scroll table right"
              title="Scroll right"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <span className="text-[11px] font-medium hidden sm:inline text-muted-foreground ps-1">
              Scroll table
            </span>
          </div>

          {/* Top Mirror Scroll Track */}
          <div
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="h-2.5 flex-1 max-w-xs sm:max-w-md mx-3 overflow-x-auto overflow-y-hidden rounded-full bg-background/60 shadow-inner"
            title="Drag to scroll horizontally"
          >
            <div style={{ width: `${scrollWidth}px`, height: '1px' }} />
          </div>

          <span className="text-[11px] text-muted-foreground/80 hidden md:inline">
            Drag with mouse to pan
          </span>
        </div>
      ) : null}

      {/* Main Table Scroll Container */}
      <div
        ref={containerRef}
        onScroll={handleContainerScroll}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={cn(
          'overflow-x-auto scroll-smooth',
          isDragging ? 'cursor-grabbing select-none' : hasOverflow ? 'cursor-grab' : '',
        )}
      >
        {children}
      </div>
    </div>
  )
}
