'use client'

import { useState } from 'react'
import { Check, CheckCircle2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { QuotationBuilder } from '@/components/crm/quotation-builder'
import { defaultQuotation } from '@/domain/quotation'
import { ActionForm } from '@/components/common/action-form'
import { markQuotationSentAction } from '@/server/actions'
import type { WebsiteCatalog } from '@/domain/website'
import { cn } from '@/lib/utils'

export function SendQuotationDialog({
  leadId,
  leadNo,
  customerName,
  customerPhone,
  quotationSent,
  catalog,
  compact = false,
}: {
  leadId: string
  leadNo: string
  customerName: string
  customerPhone: string
  quotationSent?: boolean
  catalog?: WebsiteCatalog
  compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const initial = defaultQuotation()

  if (quotationSent) {
    return (
      <Button
        variant="outline"
        size={compact ? 'sm' : 'touch'}
        disabled
        className={cn(
          'text-xs font-medium opacity-80 cursor-not-allowed bg-muted/40',
          compact ? 'h-8 px-2 gap-1' : 'gap-1.5'
        )}
        title="Quotation already sent to customer. To send additional quotations, open the Lead Details page."
      >
        <Check className="size-3.5 text-tone-success-soft-foreground" aria-hidden />
        <span>{compact ? 'Sent' : 'Quotation Sent ✓'}</span>
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size={compact ? 'sm' : 'touch'}
          className={cn('text-xs font-medium', compact ? 'h-8 px-2 gap-1' : 'gap-1.5')}
          title="Send Quotation"
        >
          <FileText className="size-3.5" aria-hidden />
          <span>{compact ? 'Quote' : 'Send Quotation'}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92dvh] w-[95vw] sm:max-w-4xl lg:max-w-5xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Send Quotation — {customerName}</DialogTitle>
          <DialogDescription>
            Lead {leadNo} · {customerPhone} · Generate a branded PDF and share directly to WhatsApp.
          </DialogDescription>
        </DialogHeader>

        {/* Confirmation banner after sharing */}
        <div className="rounded-xl border border-border bg-muted/30 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold">Have you sent the quotation to the customer?</span>
              <p className="text-xs text-muted-foreground">
                Once confirmed, the quotation status is recorded in CRM and this table button will show as Sent.
              </p>
            </div>
            <ActionForm
              action={markQuotationSentAction}
              onSuccess={() => setOpen(false)}
            >
              <input type="hidden" name="leadId" value={leadId} />
              <Button type="submit" size="touch" className="gap-1.5 shrink-0 whitespace-nowrap">
                <CheckCircle2 className="size-4" aria-hidden />
                <span>Yes, Save Quotation Sent</span>
              </Button>
            </ActionForm>
          </div>
        </div>

        <div className="pt-2">
          <QuotationBuilder
            leadId={leadId}
            initial={initial}
            quotations={[]}
            canCreate={true}
            catalog={catalog}
            customer={{ name: customerName, phone: customerPhone }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
