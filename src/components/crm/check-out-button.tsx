'use client'

import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/common/submit-button'
import { en } from '@/i18n/en'

type FormAction = (formData: FormData) => void | Promise<void>

/**
 * Check out needs a second, deliberate tap ("Yes, check out"). Without this, a double-tap on "Check in" landed on
 * "Check out" (same place on screen) and the agent was checked out seconds after checking in.
 */
export function CheckOutButton({ action, disabled }: { action?: FormAction; disabled?: boolean }) {
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (!confirming) return
    const id = setTimeout(() => setConfirming(false), 6000)
    return () => clearTimeout(id)
  }, [confirming])

  if (!confirming) {
    return (
      <Button type="button" variant="secondary" size="touch" className="w-full" disabled={disabled} onClick={() => setConfirming(true)}>
        <LogOut data-icon="inline-start" />
        {en.checkIn.checkOut}
      </Button>
    )
  }
  return (
    <form action={action} className="col-span-2 space-y-2 rounded-lg bg-tone-warning-soft p-2 text-tone-warning-soft-foreground" role="alertdialog" aria-label="Check out now?">
      <p className="text-sm font-medium">Check out now? You will stop getting new leads.</p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="touch" onClick={() => setConfirming(false)}>
          Cancel
        </Button>
        <SubmitButton variant="destructive" size="touch" pendingText="Checking out…">
          Yes, check out
        </SubmitButton>
      </div>
    </form>
  )
}
