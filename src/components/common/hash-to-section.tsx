'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Old links like /settings#google-sheets (alerts, notes) open the right card: → /settings?section=google-sheets. */
export function HashToSection({ keys }: { keys: string[] }) {
  const router = useRouter()
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash && keys.includes(hash)) router.replace(`${window.location.pathname}?section=${hash}`)
  }, [keys, router])
  return null
}
