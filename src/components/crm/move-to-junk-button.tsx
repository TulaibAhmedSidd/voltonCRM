'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
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
import { moveToJunkAction } from '@/server/actions'

export function MoveToJunkButton({
  leadId,
  leadNo,
  customerName,
  canEdit = true,
}: {
  leadId: string
  leadNo: string
  customerName: string
  canEdit?: boolean
}) {
  const [open, setOpen] = useState(false)

  if (!canEdit) return null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={`Move ${leadNo} to Junk Leads`}
          title="Move to Junk Leads"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg p-2 text-muted-foreground transition-colors hover:bg-tone-danger-soft hover:text-tone-danger-soft-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="size-5 text-tone-danger-soft-foreground" aria-hidden />
            <span>Move to Junk Leads</span>
          </DialogTitle>
          <DialogDescription>
            {customerName} · {leadNo}
          </DialogDescription>
        </DialogHeader>

        <p className="text-xs text-muted-foreground">
          Moving this lead to Junk will remove it from active queues and mark it as junk. A manager can later restore this lead to new status if needed.
        </p>

        <ActionForm
          action={moveToJunkAction}
          className="space-y-4 pt-2"
          onSuccess={() => setOpen(false)}
        >
          <input type="hidden" name="leadId" value={leadId} />

          <div className="space-y-1.5">
            <label htmlFor={`junk-category-${leadId}`} className="block text-sm font-medium">
              Reason / Category <span className="text-tone-danger-soft-foreground">*</span>
            </label>
            <select
              id={`junk-category-${leadId}`}
              name="reasonCategory"
              defaultValue="Invalid phone / Wrong number"
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="Invalid phone / Wrong number">Invalid phone / Wrong number</option>
              <option value="Customer hostile / Not interested">Customer not interested / Hostile</option>
              <option value="Duplicate lead submission">Duplicate lead submission</option>
              <option value="Spam / Fake test submission">Spam / Fake test submission</option>
              <option value="Outside service area">Outside service area</option>
              <option value="Already installed elsewhere">Already installed elsewhere</option>
              <option value="Customer unreachable (multiple attempts)">Customer unreachable (multiple attempts)</option>
              <option value="Other reason">Other reason</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor={`junk-notes-${leadId}`} className="block text-sm font-medium">
              Additional Details / Explanation
            </label>
            <textarea
              id={`junk-notes-${leadId}`}
              name="reasonNotes"
              rows={2}
              placeholder="e.g. Called 3 times, wrong person or customer refused solar..."
              className="w-full rounded-lg border border-input bg-card p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="touch" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              size="touch"
              className="bg-tone-danger-soft text-tone-danger-soft-foreground hover:bg-tone-danger-soft/90"
            >
              Confirm Move to Junk
            </Button>
          </div>
        </ActionForm>
      </DialogContent>
    </Dialog>
  )
}
