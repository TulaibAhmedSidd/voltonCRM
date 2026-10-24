'use client'

import { useTransition } from 'react'
import { updateQuotationStatusAction } from '@/server/actions'
import { StatusBadge } from '@/components/common/status-badge'
import { QUOTATION_STATUS_META } from '@/domain/ui-maps'
import type { QuotationStatus } from '@/domain/constants'
import { cn } from '@/lib/utils'

export function QuotationStatusSelect({
  quotationId,
  currentStatus,
}: {
  quotationId: string
  currentStatus: QuotationStatus
}) {
  const [pending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = e.target.value as QuotationStatus
    if (nextStatus === currentStatus) return
    const fd = new FormData()
    fd.set('quotationId', quotationId)
    fd.set('status', nextStatus)

    startTransition(async () => {
      await updateQuotationStatusAction({ ok: true }, fd)
    })
  }

  const meta = QUOTATION_STATUS_META[currentStatus] ?? { label: currentStatus, tone: 'neutral' as const }

  return (
    <div className="flex items-center gap-1.5">
      <StatusBadge label={meta.label} tone={meta.tone} size="sm" />
      <select
        value={currentStatus}
        disabled={pending}
        onChange={handleChange}
        aria-label="Change status"
        className={cn(
          'h-7 rounded border border-input bg-card px-1.5 text-xs text-muted-foreground outline-none transition-colors hover:text-foreground focus:ring-1 focus:ring-primary',
          pending && 'opacity-50'
        )}
      >
        <option value="draft">Draft</option>
        <option value="sent">Sent</option>
        <option value="accepted">Accepted</option>
        <option value="rejected">Rejected</option>
      </select>
    </div>
  )
}
