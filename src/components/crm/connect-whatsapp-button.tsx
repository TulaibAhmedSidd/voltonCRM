'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { connectWhatsAppNumberAction } from '@/server/actions'
import { cn } from '@/lib/utils'

interface FbLoginResponse {
  authResponse?: { code?: string } | null
}
interface FbSdk {
  init: (opts: { appId: string; autoLogAppEvents: boolean; xfbml: boolean; version: string }) => void
  login: (cb: (r: FbLoginResponse) => void, opts: Record<string, unknown>) => void
}
declare global {
  interface Window {
    FB?: FbSdk
  }
}

type Phase = 'idle' | 'open' | 'saving' | 'done' | 'error'

/**
 * "Connect WhatsApp number": opens Meta's Embedded Signup. With Coexistence the number stays in the WhatsApp
 * Business app on the phone; the phone owner confirms inside the app. The one-time code goes to the server.
 */
export function ConnectWhatsAppButton({ appId, configId, agents }: { appId: string; configId: string; agents: { id: string; name: string }[] }) {
  const [ready, setReady] = useState(false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')
  const [mode, setMode] = useState<'coexistence' | 'new'>('coexistence')
  const [agentId, setAgentId] = useState('')
  const session = useRef<{ phoneNumberId?: string; wabaId?: string }>({})

  // Meta posts the chosen WhatsApp account / number to this window while the sign-up runs.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      let host = ''
      try {
        host = new URL(event.origin).hostname
      } catch {
        return
      }
      if (host !== 'facebook.com' && !host.endsWith('.facebook.com')) return
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return
        if (String(data.event).startsWith('FINISH')) session.current = { phoneNumberId: data.data?.phone_number_id, wabaId: data.data?.waba_id }
        else if (data.event === 'CANCEL') {
          setPhase('error')
          setMessage(data.data?.current_step ? `Stopped at step "${data.data.current_step}". Press Connect to try again.` : 'The Meta window was closed. Press Connect to try again.')
        } else if (data.event === 'ERROR') {
          setPhase('error')
          setMessage(`Meta error: ${data.data?.error_message ?? 'unknown'}`)
        }
      } catch {
        // not JSON — another Facebook message
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  function start() {
    if (!window.FB) return
    session.current = {}
    setPhase('open')
    setMessage('Finish the steps in the Meta window. For an existing number, confirm on the phone inside the WhatsApp Business app.')
    window.FB.login(
      (response) => {
        const code = response.authResponse?.code
        if (!code) {
          setPhase('error')
          setMessage('Not connected — the Meta window was closed before the end.')
          return
        }
        setPhase('saving')
        setMessage('Saving…')
        // The session message can arrive a moment after the login callback.
        setTimeout(() => {
          void connectWhatsAppNumberAction({ code, ...session.current, agentId: agentId || null, coexistence: mode === 'coexistence' }).then((r) => {
            setPhase(r?.ok ? 'done' : 'error')
            setMessage(r?.message ?? '')
          })
        }, 800)
      },
      {
        config_id: configId,
        response_type: 'code',
        override_default_response_type: true,
        extras: { setup: {}, sessionInfoVersion: '3', ...(mode === 'coexistence' ? { featureType: 'whatsapp_business_app_onboarding' } : {}) },
      },
    )
  }

  return (
    <div className="space-y-3 rounded-xl p-3 ring-1 ring-foreground/10">
      <Script
        src="https://connect.facebook.net/en_US/sdk.js"
        strategy="afterInteractive"
        crossOrigin="anonymous"
        onLoad={() => {
          window.FB?.init({ appId, autoLogAppEvents: true, xfbml: true, version: 'v23.0' })
          setReady(true)
        }}
      />
      <p className="font-medium">Connect a WhatsApp number</p>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <label className="flex min-h-11 items-start gap-3 rounded-lg p-2 text-sm hover:bg-muted/50">
          <input type="radio" name="wa-mode" className="mt-0.5 size-5 accent-primary" checked={mode === 'coexistence'} onChange={() => setMode('coexistence')} />
          <span>
            <span className="font-medium">Number already on WhatsApp Business app</span>
            <span className="block text-muted-foreground">Keeps working on the phone (Coexistence). No new SIM.</span>
          </span>
        </label>
        <label className="flex min-h-11 items-start gap-3 rounded-lg p-2 text-sm hover:bg-muted/50">
          <input type="radio" name="wa-mode" className="mt-0.5 size-5 accent-primary" checked={mode === 'new'} onChange={() => setMode('new')} />
          <span>
            <span className="font-medium">New number (not on WhatsApp)</span>
            <span className="block text-muted-foreground">Used only through the CRM.</span>
          </span>
        </label>
      </fieldset>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Whose phone is it on? (optional)</span>
        <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="h-11 w-full rounded-lg border border-input bg-card px-3 sm:w-80">
          <option value="">Shared company number</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <Button type="button" size="touch" onClick={start} disabled={!ready || phase === 'open' || phase === 'saving'}>
        <MessageCircle aria-hidden />
        {ready ? 'Connect WhatsApp number' : 'Loading Meta…'}
      </Button>
      {message ? (
        <p role="status" className={cn('rounded-lg px-3 py-2 text-sm', phase === 'done' ? 'bg-tone-success-soft text-tone-success-soft-foreground' : phase === 'error' ? 'bg-tone-danger-soft text-tone-danger-soft-foreground' : 'bg-muted')}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
