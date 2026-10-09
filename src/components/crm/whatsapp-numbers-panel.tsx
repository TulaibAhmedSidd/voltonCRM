import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { StatusBadge } from '@/components/common/status-badge'
import { ConnectWhatsAppButton } from '@/components/crm/connect-whatsapp-button'
import { formatPhone } from '@/lib/phone'
import { formatPktDateTime } from '@/lib/dates-pkt'
import { setWhatsAppNumberOwnerAction } from '@/server/actions'

export interface WhatsAppNumberRow {
  id: string
  number: string
  displayName?: string | null
  coexistence: boolean
  connectedViaSignup: boolean
  status: string
  agentId: string | null
  lastEchoAt?: string | null
  historyMessages: number
  historySyncRequestedAt?: string | null
  lastSyncError?: string | null
}

/** Settings → WhatsApp numbers: connected numbers, whose phone each is on, and the Coexistence connect button. */
export function WhatsAppNumbersPanel({ numbers, agents, signup }: { numbers: WhatsAppNumberRow[]; agents: { id: string; name: string }[]; signup: { appId: string; configId: string } | null }) {
  return (
    <div className="space-y-4">
      {numbers.length ? (
        <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
          {numbers.map((n) => (
            <li key={n.id} className="space-y-2 p-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{n.displayName || 'WhatsApp number'}</span>
                <span className="tabular-nums text-muted-foreground">{formatPhone(n.number)}</span>
                <StatusBadge label={n.status === 'connected' ? 'Connected' : n.status} tone={n.status === 'connected' ? 'success' : 'warning'} size="sm" />
                {n.coexistence ? <StatusBadge label="Also on WhatsApp Business app" tone="info" size="sm" /> : null}
                {!n.connectedViaSignup ? <StatusBadge label="Test / env number" tone="neutral" size="sm" /> : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {n.coexistence
                  ? `${n.historyMessages} old message(s) imported${n.historySyncRequestedAt ? ` · history asked ${formatPktDateTime(new Date(n.historySyncRequestedAt))}` : ''}${n.lastEchoAt ? ` · last message sent from the phone ${formatPktDateTime(new Date(n.lastEchoAt))}` : ''}`
                  : 'Messages go through the CRM.'}
              </p>
              {n.lastSyncError ? <p className="rounded-md bg-tone-warning-soft px-2 py-1 text-xs text-tone-warning-soft-foreground">{n.lastSyncError}</p> : null}
              <ActionForm action={setWhatsAppNumberOwnerAction} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="numberId" value={n.id} />
                <label className="text-sm">
                  <span className="mb-1 block font-medium">Phone is with</span>
                  <select key={n.agentId ?? ''} name="agentId" defaultValue={n.agentId ?? ''} className="h-11 rounded-lg border border-input bg-card px-3">
                    <option value="">Shared company number</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </label>
                <Button type="submit" variant="outline" size="touch">
                  Save
                </Button>
              </ActionForm>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No WhatsApp number has sent or received a message yet.</p>
      )}

      {signup ? (
        <ConnectWhatsAppButton appId={signup.appId} configId={signup.configId} agents={agents} />
      ) : (
        <p className="rounded-xl bg-tone-warning-soft p-3 text-sm text-tone-warning-soft-foreground">
          To connect the numbers already on the WhatsApp Business app, add <span className="font-mono">META_APP_ID</span> and <span className="font-mono">META_ES_CONFIG_ID</span> in Vercel (see docs/whatsapp-coexistence.md), then redeploy.
        </p>
      )}
    </div>
  )
}
