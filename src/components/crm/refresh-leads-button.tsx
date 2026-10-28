'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Clean one-tap manual refresh button for the Leads table. */
export function RefreshLeadsButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleRefresh = () => {
    setLoading(true)
    router.refresh()
    setTimeout(() => setLoading(false), 800)
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="touch"
      onClick={handleRefresh}
      disabled={loading}
      aria-label="Refresh leads"
      title="Refresh leads list"
    >
      <RefreshCw className={`size-4 ${loading ? 'animate-spin text-tone-brand' : ''}`} aria-hidden />
      Refresh
    </Button>
  )
}
