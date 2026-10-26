'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

/**
 * Tracks the exact URL (view, page, filters, search query) and scroll position
 * on the Leads table, storing it in sessionStorage so when a user navigates to a
 * lead and returns, the exact view, filters and scroll are remembered.
 */
export function LeadsStateTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const fullUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
    sessionStorage.setItem('volton_last_leads_url', fullUrl)

    // Check if we should restore previous scroll position
    const savedScroll = sessionStorage.getItem(`scroll_${fullUrl}`)
    if (savedScroll) {
      window.scrollTo({ top: Number(savedScroll), behavior: 'instant' })
    }

    function handleScroll() {
      sessionStorage.setItem(`scroll_${fullUrl}`, String(window.scrollY))
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [pathname, searchParams])

  return null
}
