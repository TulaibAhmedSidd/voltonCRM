'use client'

import { useState } from 'react'
import { AlertOctagon, RotateCcw, Trash2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ActionForm } from '@/components/common/action-form'
import { deleteLeadsAction, revertJunkAction } from '@/server/actions'
import type { LeadSummary } from '@/domain/view-models'
import { formatPktDateTime } from '@/lib/dates-pkt'
import { formatPhone, maskPhone } from '@/lib/phone'
import { SourceBadge } from '@/components/crm/badges'

export function JunkLeadDetailModal({
  lead,
  canManage,
}: {
  lead: LeadSummary
  canManage?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-start font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        title="Click to view junk cancellation details"
      >
        {lead.name}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] w-[95vw] sm:max-w-lg overflow-y-auto p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <AlertOctagon className="size-5 text-tone-danger-soft-foreground" aria-hidden />
              <span>Junk Lead Details — {lead.name}</span>
            </DialogTitle>
            <DialogDescription>
              {lead.leadNo} · {lead.maskPhone ? maskPhone(lead.phone) : formatPhone(lead.phone)}
            </DialogDescription>
          </DialogHeader>

          {/* Cancellation Reason Box */}
          <div className="rounded-xl border border-tone-danger-soft bg-tone-danger-soft/15 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-tone-danger-soft-foreground uppercase tracking-wider">
                Cancellation / Junk Reason
              </span>
              {lead.junkedBy?.at && (
                <span className="text-muted-foreground">
                  {formatPktDateTime(new Date(lead.junkedBy.at))}
                </span>
              )}
            </div>

            <div className="rounded-lg bg-card p-3 border border-border text-sm font-medium text-foreground whitespace-pre-wrap leading-relaxed shadow-xs">
              {lead.junkedBy?.reason || 'No specific reason provided when junked.'}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-0.5">
              <User className="size-3.5" aria-hidden />
              <span>
                Junked by: <strong>{lead.junkedBy?.name ?? 'CRM User'}</strong>
              </span>
            </div>
          </div>

          {/* Lead Meta Information */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1">
              <span className="text-muted-foreground block">Assigned Agent</span>
              <span className="font-medium text-foreground block">{lead.agent?.name ?? 'Unassigned'}</span>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1">
              <span className="text-muted-foreground block">Inbound Channel</span>
              <div className="pt-0.5">
                <SourceBadge
                  channel={lead.channel}
                  detail={lead.sourceDetail}
                  platform={lead.platform}
                  isAd={lead.isAd}
                  size="sm"
                />
              </div>
            </div>

            <div className="rounded-lg border border-border bg-muted/30 p-2.5 space-y-1 col-span-2">
              <span className="text-muted-foreground block">Received Date</span>
              <span className="font-medium text-foreground block">{formatPktDateTime(new Date(lead.receivedAt))}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-border">
            <Button type="button" variant="outline" size="touch" onClick={() => setOpen(false)}>
              Close
            </Button>

            {canManage && (
              <div className="flex items-center gap-2">
                <ActionForm action={revertJunkAction} onSuccess={() => setOpen(false)}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <Button type="submit" size="touch" variant="outline" className="gap-1.5 text-xs">
                    <RotateCcw className="size-3.5" aria-hidden />
                    <span>Revert to New</span>
                  </Button>
                </ActionForm>

                <ActionForm action={deleteLeadsAction} onSuccess={() => setOpen(false)}>
                  <input type="hidden" name="leadId" value={lead.id} />
                  <input type="hidden" name="reason" value="Permanently deleted from Junk Leads modal" />
                  <Button
                    type="submit"
                    size="touch"
                    className="gap-1.5 text-xs bg-tone-danger-soft text-tone-danger-soft-foreground hover:bg-tone-danger-soft/90"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                    <span>Delete</span>
                  </Button>
                </ActionForm>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
