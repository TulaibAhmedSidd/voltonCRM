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

export function SendQuotationDialog({
  leadId,
  leadNo,
  customerName,
  customerPhone,
  quotationSent,
  catalog,
}: {
  leadId: string
  leadNo: string
  customerName: string
  customerPhone: string
  quotationSent?: boolean
  catalog?: WebsiteCatalog
}) {
  const [open, setOpen] = useState(false)
  const initial = defaultQuotation()

  if (quotationSent) {
    return (
      <Button
        variant="outline"
        size="touch"
        disabled
        className="gap-1.5 text-xs font-medium opacity-80 cursor-not-allowed bg-muted/40"
        title="Quotation already sent to customer. To send additional quotations, open the Lead Details page."
      >
        <Check className="size-3.5 text-tone-success-soft-foreground" aria-hidden />
        <span>Quotation Sent ✓</span>
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="touch" className="gap-1.5 text-xs font-medium">
          <FileText className="size-3.5" aria-hidden />
          <span>Send Quotation</span>
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
