'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
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

export function SendQuotationDialog({
  leadId,
  leadNo,
  customerName,
  customerPhone,
}: {
  leadId: string
  leadNo: string
  customerName: string
  customerPhone: string
}) {
  const [open, setOpen] = useState(false)
  const initial = defaultQuotation()

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="touch" className="gap-1.5 text-xs font-medium">
          <FileText className="size-3.5" aria-hidden />
          <span>Send Quotation</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92dvh] w-full max-w-4xl overflow-y-auto p-4 md:p-6">
        <DialogHeader>
          <DialogTitle>Send Quotation — {customerName}</DialogTitle>
          <DialogDescription>
            Lead {leadNo} · {customerPhone} · Generate a branded PDF and share directly to WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <QuotationBuilder
            leadId={leadId}
            initial={initial}
            quotations={[]}
            canCreate={true}
            customer={{ name: customerName, phone: customerPhone }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
