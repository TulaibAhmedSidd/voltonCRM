'use client'

import { useMemo, useState, useTransition } from 'react'
import { Download, FileText, MessageCircle, Plus, Send, Share2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  BATTERY_SUGGESTIONS,
  INVERTER_SUGGESTIONS,
  PANEL_SUGGESTIONS,
  QUOTE_SYSTEM_LABEL,
  QUOTE_SYSTEM_TYPES,
  STRUCTURE_LABEL,
  STRUCTURE_TYPES,
  formatRs,
  quotationLines,
  rupeesInWords,
  type QuotationInput,
} from '@/domain/quotation'
import { createQuotationAction, sendQuotationWhatsAppAction } from '@/server/actions'
import { cn } from '@/lib/utils'

export interface QuotationRow {
  id: string
  quotationNo: string
  total: number
  systemKw: number
  issuedAt: string
  validUntil: string
  preparedBy: string
}

const control = 'h-11 w-full rounded-lg border border-input bg-card px-3 text-base md:text-sm'

function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block text-sm', className)}>
      <span className="mb-1 block font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 rounded-xl p-3 ring-1 ring-foreground/10">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-secondary text-xs text-secondary-foreground">{n}</span>
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

/** Open / download a quotation and get it to the customer: from the CRM on WhatsApp, the customer's WhatsApp chat, or the phone's share menu. */
function PdfButtons({ id, no, total, customer, onShare }: { id: string; no: string; total: number; customer: { name: string; phone: string }; onShare: (id: string, no: string) => void }) {
  const [sending, startSend] = useTransition()
  const [sent, setSent] = useState<{ ok: boolean; message?: string } | null>(null)
  const digits = customer.phone.replace(/\D/g, '')
  const text = encodeURIComponent(`Assalam o Alaikum ${customer.name}, here is your Volton Solar quotation ${no} (Rs ${formatRs(total)}). The PDF is attached.`)
  return (
    <div className="w-full space-y-2 sm:w-auto">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="touch"
          disabled={sending}
          onClick={() =>
            startSend(async () => {
              setSent(await sendQuotationWhatsAppAction(id))
            })
          }
        >
          <Send aria-hidden />
          {sending ? 'Sending…' : 'Send to customer on WhatsApp'}
        </Button>
        <Button asChild variant="outline" size="touch">
          <a href={`/api/quotations/${id}/pdf`} target="_blank" rel="noreferrer">
            <FileText aria-hidden />
            Open PDF
          </a>
        </Button>
        <Button asChild variant="outline" size="touch">
          <a href={`/api/quotations/${id}/pdf?download=1`}>
            <Download aria-hidden />
            Download
          </a>
        </Button>
        <Button type="button" variant="outline" size="touch" onClick={() => onShare(id, no)}>
          <Share2 aria-hidden />
          Share from phone
        </Button>
        {digits ? (
          <Button asChild variant="outline" size="touch">
            <a href={`https://wa.me/${digits}?text=${text}`} target="_blank" rel="noreferrer">
              <MessageCircle aria-hidden />
              Open customer&apos;s WhatsApp
            </a>
          </Button>
        ) : null}
      </div>
      {sent?.message ? <p className={cn('rounded-lg px-3 py-2 text-xs', sent.ok ? 'bg-tone-success-soft text-tone-success-soft-foreground' : 'bg-tone-warning-soft text-tone-warning-soft-foreground')}>{sent.message}</p> : null}
    </div>
  )
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Karachi' })

/** Lead page → Quotation tab: fill the quotation, see the total live, generate a numbered PDF to send to the customer. */
export function QuotationBuilder({ leadId, initial, quotations, canCreate, customer }: { leadId: string; initial: QuotationInput; quotations: QuotationRow[]; canCreate: boolean; customer: { name: string; phone: string } }) {
  const [q, setQ] = useState<QuotationInput>(initial)
  const [markSent, setMarkSent] = useState(true)
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; message?: string; quotationId?: string; quotationNo?: string } | null>(null)
  const totals = useMemo(() => quotationLines(q), [q])

  const set = <K extends keyof QuotationInput>(key: K, value: QuotationInput[K]) => setQ((prev) => ({ ...prev, [key]: value }))
  const num = (key: keyof QuotationInput) => ({
    type: 'number' as const,
    inputMode: 'decimal' as const,
    min: 0,
    value: Number.isFinite(q[key] as number) ? (q[key] as number) : 0,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, (e.target.value === '' ? 0 : Number(e.target.value)) as never),
    className: control,
  })
  const txt = (key: keyof QuotationInput, list?: string) => ({ value: String(q[key] ?? ''), onChange: (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value as never), className: control, list })

  function generate() {
    setResult(null)
    start(async () => {
      const r = await createQuotationAction({ leadId, quotation: q, markSent })
      setResult(r)
    })
  }

  async function share(id: string, no: string) {
    try {
      const blob = await (await fetch(`/api/quotations/${id}/pdf`)).blob()
      const file = new File([blob], `Volton-Quotation-${no}.pdf`, { type: 'application/pdf' })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `Volton Solar quotation ${no}`, text: `Assalam o Alaikum ${customer.name}, please find your Volton Solar quotation ${no} attached.` })
      else window.open(`/api/quotations/${id}/pdf?download=1`, '_blank')
    } catch {
      // share sheet closed — nothing to do
    }
  }

  return (
    <div className="space-y-4">
      {quotations.length ? (
        <div className="rounded-xl p-3 ring-1 ring-foreground/10">
          <p className="mb-2 font-medium">Quotations for {customer.name}</p>
          <ul className="divide-y divide-border">
            {quotations.map((x) => (
              <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  <span className="font-semibold">{x.quotationNo}</span> · Rs {formatRs(x.total)}
                  {x.systemKw ? ` · ${x.systemKw} kW` : ''}
                  <span className="block text-xs text-muted-foreground">
                    {fmtDate(x.issuedAt)} by {x.preparedBy} · valid until {fmtDate(x.validUntil)}
                  </span>
                </span>
                <PdfButtons id={x.id} no={x.quotationNo} total={x.total} customer={customer} onShare={share} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!canCreate ? (
        <p className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">Accept the lead to make a quotation. Closed leads cannot get a new quotation.</p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            generate()
          }}
        >
          <datalist id="q-panels">{PANEL_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
          <datalist id="q-inverters">{INVERTER_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>
          <datalist id="q-batteries">{BATTERY_SUGGESTIONS.map((s) => <option key={s} value={s} />)}</datalist>

          <Section n={1} title="System">
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="System type">
                <select value={q.systemType} onChange={(e) => set('systemType', e.target.value as QuotationInput['systemType'])} className={control}>
                  {QUOTE_SYSTEM_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {QUOTE_SYSTEM_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="System size (kW)" hint={totals.panelKwp ? `Panels give ${totals.panelKwp} kWp` : undefined}>
                <input {...num('systemKw')} step="0.5" />
              </Field>
            </div>
          </Section>

          <Section n={2} title="Solar panels">
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Brand / model" className="sm:col-span-2">
                <input {...txt('panelModel', 'q-panels')} placeholder="e.g. LONGi Hi-MO X10 645W" />
              </Field>
              <Field label="Watt per panel">
                <input {...num('panelWatt')} />
              </Field>
              <Field label="Quantity">
                <input {...num('panelQty')} />
              </Field>
              <Field label="Price per panel (Rs)" className="sm:col-span-2">
                <input {...num('panelPrice')} />
              </Field>
            </div>
          </Section>

          <Section n={3} title="Inverter">
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Brand / model" className="sm:col-span-2">
                <input {...txt('inverterModel', 'q-inverters')} placeholder="e.g. GoodWe 12kW SP" />
              </Field>
              <Field label="Quantity">
                <input {...num('inverterQty')} />
              </Field>
              <Field label="Price each (Rs)">
                <input {...num('inverterPrice')} />
              </Field>
            </div>
          </Section>

          <Section n={4} title="Battery (leave quantity 0 for no battery)">
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Brand / model" className="sm:col-span-2">
                <input {...txt('batteryModel', 'q-batteries')} placeholder="e.g. Itel 51.2V 100Ah LiFePO4" />
              </Field>
              <Field label="Quantity">
                <input {...num('batteryQty')} />
              </Field>
              <Field label="Price each (Rs)">
                <input {...num('batteryPrice')} />
              </Field>
            </div>
          </Section>

          <Section n={5} title="Structure, wiring, protection">
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Structure type">
                <select value={q.structureType} onChange={(e) => set('structureType', e.target.value as QuotationInput['structureType'])} className={control}>
                  {STRUCTURE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {STRUCTURE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Structure details" className="sm:col-span-2">
                <input {...txt('structureDetails')} placeholder="e.g. 14 gauge, galvanised, with walkway" />
              </Field>
              <Field label="Structure price (Rs)">
                <input {...num('structurePrice')} />
              </Field>
              <Field label="Wiring & cables" className="sm:col-span-3">
                <input {...txt('wiringDetails')} placeholder="e.g. DC Pak Cable 4mm, AC Pakistan Cable" />
              </Field>
              <Field label="Wiring price (Rs)">
                <input {...num('wiringPrice')} />
              </Field>
              <Field label="Protection & accessories" className="sm:col-span-3">
                <input {...txt('protectionDetails')} placeholder="Breakers, SPD, DB box, earthing" />
              </Field>
              <Field label="Price (Rs)" hint="0 = shown as Included">
                <input {...num('protectionPrice')} />
              </Field>
            </div>
          </Section>

          <Section n={6} title="Net metering, transport, labour">
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
                <input type="checkbox" className="size-5 accent-primary" checked={q.netMetering} onChange={(e) => set('netMetering', e.target.checked)} />
                Include net metering (K-Electric application & meter)
              </label>
              <Field label="Net metering price (Rs)">
                <input {...num('netMeteringPrice')} disabled={!q.netMetering} />
              </Field>
              <Field label="Transportation (Rs)">
                <input {...num('transportPrice')} />
              </Field>
              <Field label="Labour / installation" className="sm:col-span-3">
                <input {...txt('labourDetails')} />
              </Field>
              <Field label="Labour price (Rs)">
                <input {...num('labourPrice')} />
              </Field>
            </div>
          </Section>

          <Section n={7} title="Other items">
            {q.extras.map((e, i) => (
              <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_6rem_9rem_auto]">
                <Field label="Description">
                  <input className={control} value={e.description} onChange={(ev) => set('extras', q.extras.map((x, j) => (j === i ? { ...x, description: ev.target.value } : x)))} />
                </Field>
                <Field label="Qty">
                  <input className={control} type="number" min={0} value={e.qty} onChange={(ev) => set('extras', q.extras.map((x, j) => (j === i ? { ...x, qty: Number(ev.target.value) || 0 } : x)))} />
                </Field>
                <Field label="Price each (Rs)">
                  <input className={control} type="number" min={0} value={e.unitPrice} onChange={(ev) => set('extras', q.extras.map((x, j) => (j === i ? { ...x, unitPrice: Number(ev.target.value) || 0 } : x)))} />
                </Field>
                <Button type="button" variant="ghost" size="icon-touch" aria-label="Remove item" onClick={() => set('extras', q.extras.filter((_, j) => j !== i))}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            {q.extras.length < 8 ? (
              <Button type="button" variant="outline" size="touch" onClick={() => set('extras', [...q.extras, { description: '', qty: 1, unitPrice: 0 }])}>
                <Plus aria-hidden />
                Add item
              </Button>
            ) : null}
          </Section>

          <Section n={8} title="Warranty & service">
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Panel warranty (years)">
                <input {...num('panelWarrantyYears')} />
              </Field>
              <Field label="Inverter warranty">
                <input {...txt('inverterWarranty')} />
              </Field>
              <Field label="Battery warranty">
                <input {...txt('batteryWarranty')} />
              </Field>
              <Field label="Free after-sales service (years)">
                <input {...num('serviceYears')} />
              </Field>
            </div>
          </Section>

          <Section n={9} title="Terms">
            <div className="grid gap-3 sm:grid-cols-4">
              <Field label="Valid for (days)">
                <input {...num('validityDays')} min={1} max={90} />
              </Field>
              <Field label="Installation time" className="sm:col-span-3">
                <input {...txt('installationDays')} />
              </Field>
            </div>
            <Field label="Payment terms">
              <textarea rows={2} value={q.paymentTerms} onChange={(e) => set('paymentTerms', e.target.value)} className="w-full rounded-lg border border-input bg-card p-3 text-base md:text-sm" />
            </Field>
            <Field label="Notes for the customer (optional)">
              <textarea rows={2} value={q.notes} onChange={(e) => set('notes', e.target.value)} className="w-full rounded-lg border border-input bg-card p-3 text-base md:text-sm" />
            </Field>
          </Section>

          <div className="sticky bottom-20 z-10 space-y-3 rounded-xl bg-card p-3 shadow-lg ring-1 ring-foreground/10 md:bottom-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
              <div className="text-sm">
                <p>
                  Subtotal <span className="font-medium tabular-nums">Rs {formatRs(totals.subtotal)}</span>
                  {totals.discount ? ` · Discount Rs ${formatRs(totals.discount)}` : ''}
                </p>
                <p className="font-heading text-xl font-semibold tabular-nums">Total Rs {formatRs(totals.total)}</p>
                <p className="text-xs text-muted-foreground">{rupeesInWords(totals.total)}</p>
              </div>
              <Field label="Discount (Rs)">
                <input {...num('discount')} />
              </Field>
            </div>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="size-5 accent-primary" checked={markSent} onChange={(e) => setMarkSent(e.target.checked)} />
              Move the lead to “Quotation sent”
            </label>
            <Button type="submit" size="touch" className="w-full" disabled={pending || totals.total <= 0}>
              <FileText aria-hidden />
              {pending ? 'Making the PDF…' : 'Generate quotation PDF'}
            </Button>
            {result ? (
              <div role="status" className={cn('space-y-2 rounded-lg px-3 py-2 text-sm', result.ok ? 'bg-tone-success-soft text-tone-success-soft-foreground' : 'bg-tone-danger-soft text-tone-danger-soft-foreground')}>
                <p>{result.message}</p>
                {result.ok && result.quotationId && result.quotationNo ? <PdfButtons id={result.quotationId} no={result.quotationNo} total={totals.total} customer={customer} onShare={share} /> : null}
              </div>
            ) : null}
          </div>
        </form>
      )}
    </div>
  )
}
