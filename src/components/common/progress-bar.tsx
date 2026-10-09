'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Top navigation progress bar for instant feedback on route transitions.
 * Zero external dependencies. Uses Volt-On brand primary color with subtle glow.
 */
export function NavigationProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const isNavigatingRef = useRef(false)

  // Route change completed: finish progress to 100% and fade out
  useEffect(() => {
    if (!isNavigatingRef.current) return
    isNavigatingRef.current = false

    if (timerRef.current) clearInterval(timerRef.current)
    setProgress(100)

    const fadeTimeout = setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 250)

    return () => clearTimeout(fadeTimeout)
  }, [pathname, searchParams])

  // Intercept click on links to start progress immediately
  useEffect(() => {
    const startProgress = () => {
      if (timerRef.current) clearInterval(timerRef.current)
      isNavigatingRef.current = true
      setVisible(true)
      setProgress(15)

      let current = 15
      timerRef.current = setInterval(() => {
        if (current < 65) {
          current += Math.random() * 15
        } else if (current < 85) {
          current += Math.random() * 4
        }
        setProgress(Math.min(current, 90))
      }, 200)
    }

    const handleClick = (e: MouseEvent) => {
      // Only plain left clicks
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }

      const target = (e.target as Element).closest('a')
      if (!target || !target.href) return

      // Don't intercept target="_blank", downloads, or external links
      if (target.target && target.target !== '_self') return
      if (target.hasAttribute('download')) return

      const url = new URL(target.href, window.location.href)
      // Check if same origin
      if (url.origin !== window.location.origin) return

      // Don't trigger on same-page hash links
      if (url.pathname === window.location.pathname && url.search === window.location.search) {
        return
      }

      startProgress()
    }

    const handlePopState = () => {
      startProgress()
    }

    document.addEventListener('click', handleClick, { capture: true })
    window.addEventListener('popstate', handlePopState)

    return () => {
      document.removeEventListener('click', handleClick, { capture: true })
      window.removeEventListener('popstate', handlePopState)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (!visible && progress === 0) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[3px] overflow-hidden"
    >
      <div
        className="h-full bg-primary transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          opacity: visible ? 1 : 0,
          boxShadow: '0 0 10px var(--primary), 0 0 5px var(--primary)',
        }}
      />
    </div>
  )
}
