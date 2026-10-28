'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, MessageCircle, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ActionForm } from '@/components/common/action-form'
import { recordFollowUpAction } from '@/server/actions'
import { formatPhone, toWhatsAppDigits } from '@/lib/phone'
import { formatPktDateTime } from '@/lib/dates-pkt'
import { cn } from '@/lib/utils'

export interface FollowUpItem {
  number: number
  status: 'pending' | 'done'
  completedAt?: string
  notes?: string
}

export function FollowUpButtonModal({
  leadId,
  leadNo,
  customerName,
  customerPhone,
  followUp,
  canEdit = true,
  nextFollowUpAt,
  isEarly = false,
}: {
  leadId: string
  leadNo: string
  customerName: string
  customerPhone: string
  followUp: FollowUpItem
  canEdit?: boolean
  nextFollowUpAt?: string
  isEarly?: boolean
}) {
  const [open, setOpen] = useState(false)
  const isDone = followUp.status === 'done'
  const waDigits = toWhatsAppDigits(customerPhone)


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Follow-Up ${followUp.number}: ${isDone ? 'Completed' : 'Pending'}`}
          className={cn(
            'inline-flex min-h-9 min-w-[4rem] items-center justify-center gap-1 rounded-md px-2 py-1 text-xs font-semibold transition-colors',
            isDone
              ? 'bg-tone-success-soft text-tone-success-soft-foreground ring-1 ring-tone-success/30 hover:bg-tone-success-soft/90'
              : 'bg-tone-danger-soft text-tone-danger-soft-foreground ring-1 ring-tone-danger/30 hover:bg-tone-danger-soft/90',
          )}
        >
          {isDone ? (
            <>
              <CheckCircle2 className="size-3.5 shrink-0" aria-hidden />
              <span>Done</span>
            </>
          ) : (
            <>
              <Clock className="size-3.5 shrink-0" aria-hidden />
              <span>Pending</span>
            </>
          )}
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Follow-Up {followUp.number}</span>
            <span
              className={cn(
                'rounded-md px-2 py-0.5 text-xs font-medium',
                isDone
                  ? 'bg-tone-success-soft text-tone-success-soft-foreground'
                  : 'bg-tone-danger-soft text-tone-danger-soft-foreground',
              )}
            >
              {isDone ? 'Completed' : 'Pending'}
            </span>
          </DialogTitle>
          <DialogDescription>
            {customerName} · {leadNo} · {formatPhone(customerPhone)}
          </DialogDescription>
        </DialogHeader>

        {/* Quick Contact Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          {waDigits ? (
            <Button asChild size="touch" variant="outline" className="flex-1">
              <a
                href={`https://wa.me/${waDigits}?text=Hello%20${encodeURIComponent(customerName)},%20following%20up%20from%20Volton%20Solar%20regarding%20your%20inquiry.`}
                target="_blank"
                rel="noreferrer noopener"
                className="flex items-center justify-center gap-2"
              >
                <MessageCircle className="size-4 text-tone-success-soft-foreground" aria-hidden />
                <span>WhatsApp</span>
              </a>
            </Button>
          ) : null}

          {customerPhone ? (
            <Button asChild size="touch" variant="outline" className="flex-1">
              <a href={`tel:${customerPhone}`} className="flex items-center justify-center gap-2">
                <Phone className="size-4" aria-hidden />
                <span>Call</span>
              </a>
            </Button>
          ) : null}
        </div>

        {isDone ? (
          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-3 text-sm">
            <div className="flex items-center gap-2 text-tone-success-soft-foreground">
              <CheckCircle2 className="size-4" aria-hidden />
              <span className="font-medium">
                Completed {followUp.completedAt ? formatPktDateTime(new Date(followUp.completedAt)) : 'previously'}
              </span>
            </div>
            {followUp.notes ? (
              <div>
                <span className="text-xs font-medium text-muted-foreground">Recorded Notes:</span>
                <p className="mt-1 rounded-lg bg-background p-2.5 text-xs text-foreground ring-1 ring-border">
                  {followUp.notes}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {isEarly ? (
          <div className="rounded-xl border border-tone-warning/40 bg-tone-warning-soft p-3 text-xs text-tone-warning-soft-foreground">
            <p className="font-semibold">Notice: Scheduled follow-up time has not arrived yet</p>
            <p className="mt-1">
              Follow-Up {followUp.number} is scheduled for {formatPktDateTime(new Date(nextFollowUpAt!))}. You can still complete and record this follow-up early. It will be logged in the lead activity timeline.
            </p>
          </div>
        ) : null}

        {/* Follow-up Details & Completion Form */}
        {canEdit ? (
          <ActionForm action={recordFollowUpAction} className="space-y-4 pt-1">
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="number" value={followUp.number} />
            <input type="hidden" name="completed" value="true" />
            <input type="hidden" name="isEarly" value={isEarly ? 'true' : 'false'} />

            <div className="space-y-1.5">
              <label htmlFor={`outcome-${leadId}-${followUp.number}`} className="block text-sm font-medium">
                Call / Contact Outcome
              </label>
              <select
                id={`outcome-${leadId}-${followUp.number}`}
                name="outcome"
                defaultValue="Connected"
                className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm"
              >
                <option value="Connected">Connected & discussed requirements</option>
                <option value="No Answer">No Answer / Did not pick up</option>
                <option value="Busy">Busy / Requested callback later</option>
                <option value="WhatsApp Sent">WhatsApp message sent</option>
                <option value="Quotation Discussed">Quotation discussed</option>
                <option value="Not Interested">Not Interested</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`notes-${leadId}-${followUp.number}`} className="block text-sm font-medium">
                Notes & Discussion Summary
              </label>
              <textarea
                id={`notes-${leadId}-${followUp.number}`}
                name="notes"
                rows={3}
                defaultValue={followUp.notes ?? ''}
                placeholder="Enter details of customer discussion or next steps..."
                className="w-full rounded-lg border border-input bg-card p-3 text-sm placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" size="touch" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="touch" variant={isDone ? 'outline' : 'default'}>
                {isDone ? 'Update Notes' : 'Save & Mark Complete'}
              </Button>
            </div>
          </ActionForm>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
