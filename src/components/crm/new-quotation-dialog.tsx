'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { QuotationBuilder, type QuotationLeadOption } from '@/components/crm/quotation-builder'
import type { WebsiteCatalog } from '@/domain/website'

export function NewQuotationDialog({
  leadsList = [],
  catalog,
}: {
  leadsList?: QuotationLeadOption[]
  catalog?: WebsiteCatalog
}) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="touch" className="gap-2">
          <Plus className="size-4" aria-hidden />
          <span>New Quotation</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[92dvh] w-[95vw] sm:max-w-4xl lg:max-w-5xl overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Quotation Builder</DialogTitle>
          <DialogDescription>
            Create a custom solar quotation. Select an existing lead or enter customer details directly to generate a branded PDF.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <QuotationBuilder
            isStandalone={true}
            leadsList={leadsList}
            quotations={[]}
            canCreate={true}
            catalog={catalog}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
