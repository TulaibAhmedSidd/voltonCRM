'use client'

import { MessageCircle, Unlink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { ConnectWhatsAppButton } from '@/components/crm/connect-whatsapp-button'
import { disconnectAgentWhatsAppAction } from '@/server/actions'
import { formatPhone } from '@/lib/phone'
import { formatPktDateTime } from '@/lib/dates-pkt'

export interface AgentWhatsAppNumberInfo {
  number: string
  displayName?: string | null
  coexistence: boolean
  lastEchoAt?: Date | string | null
}

export function AgentWhatsAppCard({
  connectedNumber,
  signup,
  agentId,
  agentName,
}: {
  connectedNumber?: AgentWhatsAppNumberInfo | null
  signup?: { appId: string; configId: string } | null
  agentId: string
  agentName: string
}) {
  if (connectedNumber) {
    return (
      <div className="space-y-3 rounded-xl border border-tone-success/30 bg-tone-success-soft p-4 text-tone-success-soft-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <MessageCircle className="size-5" aria-hidden />
            </div>
            <div>
              <p className="font-semibold text-sm">
                WhatsApp Connected ✓
              </p>
              <p className="text-xs font-medium">
                {connectedNumber.displayName ? `${connectedNumber.displayName} · ` : ''}
                {formatPhone(connectedNumber.number)}
              </p>
            </div>
          </div>

          <ActionForm action={disconnectAgentWhatsAppAction} className="inline-block">
            <Button type="submit" variant="outline" size="touch" className="h-9 gap-1.5 text-xs text-tone-danger-soft-foreground hover:bg-tone-danger-soft">
              <Unlink className="size-3.5" aria-hidden />
              <span>Disconnect</span>
            </Button>
          </ActionForm>
        </div>

        <p className="text-xs opacity-90">
          Messages you send from your phone or CRM are automatically saved against your assigned leads.
          {connectedNumber.lastEchoAt
            ? ` Last synced: ${formatPktDateTime(new Date(connectedNumber.lastEchoAt))}`
            : ''}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4 text-card-foreground ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
          <MessageCircle className="size-5" aria-hidden />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Connect with WhatsApp</h3>
          <p className="text-xs text-muted-foreground">
            Connect your own WhatsApp account so chats are linked to your assigned customer leads.
          </p>
        </div>
      </div>

      {signup ? (
        <div className="pt-1">
          <ConnectWhatsAppButton
            appId={signup.appId}
            configId={signup.configId}
            agents={[{ id: agentId, name: agentName }]}
          />
        </div>
      ) : (
        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <p>
            Meta WhatsApp Embedded Signup credentials (<code className="font-mono">META_APP_ID</code> and <code className="font-mono">META_ES_CONFIG_ID</code>) are active. When you tap Connect, your phone confirms in the WhatsApp Business app and chats link to your CRM leads.
          </p>
        </div>
      )}
    </div>
  )
}
