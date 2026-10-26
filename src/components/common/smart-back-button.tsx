'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { en } from '@/i18n/en'
import { cn } from '@/lib/utils'

export function SmartBackButton({
  fallbackHref = '/leads?view=all',
  label = en.common.back,
  className,
}: {
  fallbackHref?: string
  label?: string
  className?: string
}) {
  const router = useRouter()

  function handleBack(e: React.MouseEvent) {
    e.preventDefault()

    // If there is prior browser history from the same application origin, go back in history.
    // This natively preserves scroll position, active tabs, search query, and pagination!
    if (
      typeof window !== 'undefined' &&
      window.history.length > 1 &&
      document.referrer &&
      document.referrer.includes(window.location.host)
    ) {
      window.history.back()
      return
    }

    // Otherwise, navigate hierarchy-wise to the resolved fallback
    let destination = fallbackHref
    if (typeof window !== 'undefined' && (fallbackHref === '/leads' || fallbackHref === '/leads?view=all')) {
      const saved = sessionStorage.getItem('volton_last_leads_url')
      if (saved && saved.startsWith('/leads')) {
        destination = saved
      }
    }
    router.push(destination)
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className={cn(
        'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      aria-label={label}
    >
      <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
      <span>{label}</span>
    </button>
  )
}
