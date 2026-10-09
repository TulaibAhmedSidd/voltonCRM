'use client'

import { useCallback, useState } from 'react'
import { BellRing, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ActionForm } from '@/components/common/action-form'
import { TextField } from '@/components/common/fields'
import { pingAgentAction } from '@/server/actions'

/**
 * "Ping" an agent: a small popup with a message box. Only one popup is open at a time (opening another closes this
 * one), and it closes by itself after the ping is sent; the button then shows "Sent" for a few seconds.
 */
export function PingAgent({ agentId, agentName, leadId, label = 'Ping', placeholder = 'Please check your leads' }: { agentId: string; agentName: string; leadId?: string; label?: string; placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const onSuccess = useCallback(() => {
    setOpen(false)
    setSent(true)
    setTimeout(() => setSent(false), 4000)
  }, [])
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="touch">
          {sent ? <Check className="text-tone-success" aria-hidden /> : <BellRing aria-hidden />}
          {sent ? 'Sent' : label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <ActionForm action={pingAgentAction} onSuccess={onSuccess} resetOnSuccess>
          <input type="hidden" name="agentId" value={agentId} />
          {leadId ? <input type="hidden" name="leadId" value={leadId} /> : null}
          <TextField label={`Message to ${agentName}`} name="message" maxLength={200} placeholder={placeholder} autoFocus />
          <Button type="submit" size="touch" className="w-full">
            Send ping
          </Button>
        </ActionForm>
      </PopoverContent>
    </Popover>
  )
}
