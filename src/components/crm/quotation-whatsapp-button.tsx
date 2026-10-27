'use client'

import { useState } from 'react'
import { Link2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { quotationShareAction } from '@/server/actions'
import { cn } from '@/lib/utils'

/**
 * "Open customer's WhatsApp" for a quotation: opens the chat with the message already written, including a link to
 * the PDF (works on any WhatsApp, no 24-hour rule, nothing to attach). `variant="icon"` for tight table cells.
 */
export function QuotationWhatsAppButton({ quotationId, phone, variant = 'full', className }: { quotationId: string; phone: string; variant?: 'full' | 'icon' | 'compact'; className?: string }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const digits = phone.replace(/\D/g, '').replace(/^0/, '92')
  if (!digits) return null

  async function open() {
    // Open the tab now (in the click) so the browser does not block it; send it to WhatsApp when the link is ready.
    const tab = window.open('about:blank', '_blank')
    setBusy(true)
    setNote(null)
    const r = await quotationShareAction(quotationId)
    setBusy(false)
    if (!r.ok || !r.text) {
      tab?.close()
      setNote(r.message ?? 'Could not make the link')
      return
    }
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(r.text)}`
    if (tab) tab.location.href = url
    else window.location.href = url
  }

  async function copy() {
    const r = await quotationShareAction(quotationId)
    if (r.ok && r.link) {
      await navigator.clipboard?.writeText(r.link).catch(() => undefined)
      setNote('PDF link copied — paste it in any chat. It works for 30 days.')
    } else setNote(r.message ?? 'Could not make the link')
  }

  if (variant === 'icon') {
    return (
      <Button type="button" variant="ghost" size="touch" className={cn('size-8 p-0 text-tone-success-soft-foreground', className)} title="Send on WhatsApp (with PDF link)" disabled={busy} onClick={open}>
        <MessageCircle className="size-4" aria-hidden />
        <span className="sr-only">WhatsApp</span>
      </Button>
    )
  }
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-2', className)}>
      <Button type="button" variant="outline" size="touch" className={variant === 'compact' ? 'h-9 gap-1.5 text-xs text-tone-success-soft-foreground' : undefined} disabled={busy} onClick={open}>
        <MessageCircle aria-hidden />
        {busy ? 'Opening…' : variant === 'compact' ? 'WhatsApp' : "Open customer's WhatsApp"}
      </Button>
      {variant === 'full' ? (
        <Button type="button" variant="outline" size="touch" onClick={copy}>
          <Link2 aria-hidden />
          Copy PDF link
        </Button>
      ) : null}
      {note ? <span className="w-full text-xs text-muted-foreground">{note}</span> : null}
    </span>
  )
}
