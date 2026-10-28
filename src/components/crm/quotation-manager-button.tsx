'use client'

import { useEffect, useState } from 'react'
import { UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { quotationToManagerAction } from '@/server/actions'
import { cn } from '@/lib/utils'

type ManagerInfo = { name: string; phone: string | null }

// One request per page, shared by every quotation on it.
let managerRequest: Promise<ManagerInfo | null> | null = null
function loadManager(): Promise<ManagerInfo | null> {
  managerRequest ??= fetch('/api/me/manager', { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : { manager: null }))
    .then((j: { manager?: ManagerInfo | null }) => j.manager ?? null)
    .catch(() => {
      managerRequest = null
      return null
    })
  return managerRequest
}

/**
 * "Send to manager": opens the manager's WhatsApp with the quotation PDF link, asking for approval, and alerts the
 * manager in the CRM. Shown only when the person has a manager with a WhatsApp number saved.
 */
export function QuotationManagerButton({ quotationId, variant = 'full', className }: { quotationId: string; variant?: 'full' | 'icon' | 'compact'; className?: string }) {
  const [manager, setManager] = useState<ManagerInfo | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    void loadManager().then((m) => {
      if (live) setManager(m)
    })
    return () => {
      live = false
    }
  }, [])

  if (!manager?.phone) return null
  const first = manager.name.split(' ')[0]

  async function send() {
    // Open the tab now (in the click) so the browser does not block it; send it to WhatsApp when the message is ready.
    const tab = window.open('about:blank', '_blank')
    setBusy(true)
    setNote(null)
    const r = await quotationToManagerAction(quotationId)
    setBusy(false)
    if (!r.ok || !r.text || !r.phone) {
      tab?.close()
      setNote(r.message ?? 'Could not send')
      return
    }
    const url = `https://wa.me/${r.phone.replace(/\D/g, '')}?text=${encodeURIComponent(r.text)}`
    if (tab) tab.location.href = url
    else window.location.href = url
    setNote(`${first} also got an alert in the CRM. Press Send in WhatsApp.`)
  }

  if (variant === 'icon') {
    return (
      <Button type="button" variant="ghost" size="touch" className={cn('size-8 p-0 text-tone-info-soft-foreground', className)} title={`Send to ${manager.name} for approval`} disabled={busy} onClick={send}>
        <UserCheck className="size-4" aria-hidden />
        <span className="sr-only">Send to manager</span>
      </Button>
    )
  }
  return (
    <span className={cn('inline-flex flex-wrap items-center gap-2', className)}>
      <Button type="button" variant="outline" size="touch" className={variant === 'compact' ? 'h-9 gap-1.5 text-xs' : undefined} disabled={busy} onClick={send}>
        <UserCheck aria-hidden />
        {busy ? 'Opening…' : variant === 'compact' ? 'Manager' : `Send to manager (${first})`}
      </Button>
      {note ? <span className="w-full text-xs text-muted-foreground">{note}</span> : null}
    </span>
  )
}
