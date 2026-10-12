'use client'

import { AlertTriangle, Clock, Coffee, LogIn, Play } from 'lucide-react'
import { SubmitButton } from '@/components/common/submit-button'
import { CheckOutButton } from '@/components/crm/check-out-button'
import type { AttendanceStatus } from '@/domain/constants'
import { en } from '@/i18n/en'
import { formatPktTime } from '@/lib/dates-pkt'
import { checkInAction, checkOutAction, toggleBreakAction } from '@/server/actions'

export interface CheckInReminderBannerProps {
  status: AttendanceStatus
  since?: string
}

/**
 * Top-of-page warning banner for agents and field agents:
 * - Alerts when not checked in so leads/visits aren't missed.
 * - Shows shift status & reminder to check out when working.
 */
export function CheckInReminderBanner({ status, since }: CheckInReminderBannerProps) {
  if (status === 'checked_out') {
    return (
      <aside
        className="flex flex-col gap-3 rounded-xl border border-tone-warning-soft bg-tone-warning-soft p-3.5 text-tone-warning-soft-foreground shadow-xs sm:flex-row sm:items-center sm:justify-between"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-card/70 text-tone-warning shadow-xs">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-semibold sm:text-base">
                {en.checkIn.bannerNotCheckedInTitle}
              </span>
              <span className="rounded-full bg-card/80 px-2 py-0.5 text-xs font-semibold text-tone-warning">
                Offline
              </span>
            </div>
            <p className="mt-0.5 text-xs sm:text-sm text-tone-warning-soft-foreground/90">
              {en.checkIn.bannerNotCheckedInDesc}
            </p>
          </div>
        </div>
        <div className="flex w-full shrink-0 sm:w-auto">
          <form action={checkInAction} className="w-full sm:w-auto">
            <SubmitButton
              size="touch"
              className="w-full sm:w-auto"
              pendingText="Checking in…"
            >
              <LogIn data-icon="inline-start" />
              {en.checkIn.bannerCheckInNow}
            </SubmitButton>
          </form>
        </div>
      </aside>
    )
  }

  if (status === 'on_break') {
    return (
      <aside
        className="flex flex-col gap-3 rounded-xl border border-tone-neutral-soft bg-tone-neutral-soft p-3 text-tone-neutral-soft-foreground shadow-xs sm:flex-row sm:items-center sm:justify-between"
        aria-live="polite"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card/70 text-muted-foreground shadow-xs">
            <Coffee className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading text-sm font-semibold">On break</span>
              <span className="rounded-full bg-card/80 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                Paused
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {en.checkIn.bannerOnBreakDesc}
            </p>
          </div>
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <form action={toggleBreakAction} className="flex-1 sm:flex-none">
            <SubmitButton size="touch" className="w-full sm:w-auto" pendingText="Resuming…">
              <Play data-icon="inline-start" />
              {en.checkIn.resumeShift}
            </SubmitButton>
          </form>
          <div className="flex-1 sm:flex-none">
            <CheckOutButton action={checkOutAction} />
          </div>
        </div>
      </aside>
    )
  }

  return (
    <aside
      className="flex flex-col gap-3 rounded-xl border border-tone-success-soft bg-tone-success-soft p-3 text-tone-success-soft-foreground shadow-xs sm:flex-row sm:items-center sm:justify-between"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card/70 text-tone-success shadow-xs">
          <Clock className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading text-sm font-semibold">
              {en.checkIn.bannerCheckedInTitle}
            </span>
            <span className="rounded-full bg-tone-success/15 px-2 py-0.5 text-xs font-semibold text-tone-success">
              Active
            </span>
          </div>
          <p className="mt-0.5 text-xs text-tone-success-soft-foreground/90">
            {since
              ? en.checkIn.bannerCheckedInDesc(formatPktTime(new Date(since)))
              : 'Remember to check out when your shift ends.'}
          </p>
        </div>
      </div>
      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        <form action={toggleBreakAction} className="flex-1 sm:flex-none">
          <SubmitButton variant="outline" size="touch" className="w-full sm:w-auto" pendingText="Updating…">
            <Coffee data-icon="inline-start" />
            {en.checkIn.startBreak}
          </SubmitButton>
        </form>
        <div className="flex-1 sm:flex-none">
          <CheckOutButton action={checkOutAction} />
        </div>
      </div>
    </aside>
  )
}
