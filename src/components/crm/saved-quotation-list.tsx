import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SavedQuotationDeleteButton } from '@/components/crm/saved-quotation-picker'
import { QUOTE_SYSTEM_LABEL, QUOTE_TEMPLATE_LABEL, formatRs, quotationLines } from '@/domain/quotation'
import type { SavedQuotationDetail } from '@/domain/view-models'
import { formatPktDateTime } from '@/lib/dates-pkt'

/** Quotations → Saved: how each saved quotation was made, who made it and when — as text and as JSON — with a sample PDF. */
export function SavedQuotationList({ rows }: { rows: SavedQuotationDetail[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((s) => (
        <SavedQuotationCard key={s.id} s={s} />
      ))}
    </ul>
  )
}

function SavedQuotationCard({ s }: { s: SavedQuotationDetail }) {
  const q = s.input
  const { lines, subtotal, discount, total } = quotationLines(q)
  const facts: [string, string][] = [
    ['System', `${QUOTE_SYSTEM_LABEL[q.systemType]}${q.systemKw ? ` · ${q.systemKw} kW` : ''}`],
    ['Total', `Rs ${formatRs(total)}`],
    ['PDF design', QUOTE_TEMPLATE_LABEL[q.template]],
  ]
  const terms: [string, string][] = (
    [
      ['Solar panel warranty', q.panelWarrantyText],
      ['Structure warranty', q.structureWarranty],
      ['Inverter warranty', q.inverterWarranty],
      ['Battery warranty', q.batteryQty || q.batteryModel ? q.batteryWarranty : ''],
      ['Free after-sales service', q.serviceYears ? `${q.serviceYears} years` : ''],
      ['Valid for', `${q.validityDays} days`],
      ['Installation time', q.installationDays],
      ['Payment terms', q.paymentTerms],
    ] as [string, string][]
  ).filter(([, v]) => v)

  return (
    <li className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-1">
        <p className="font-semibold">{s.name}</p>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {facts.map(([k, v]) => (
            <span key={k} className="rounded bg-muted px-2 py-0.5">
              <span className="text-muted-foreground">{k}: </span>
              <span className="font-medium tabular-nums">{v}</span>
            </span>
          ))}
        </div>
      </div>

      <dl className="grid gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        <div>
          <dt className="inline text-muted-foreground">Made by </dt>
          <dd className="inline font-medium">{s.madeBy}</dd>
          <dd className="inline text-muted-foreground"> · {formatPktDateTime(new Date(s.madeAt))}</dd>
        </div>
        <div>
          <dt className="inline text-muted-foreground">How </dt>
          <dd className="inline">{s.sourceQuotationNo ? `saved from quotation ${s.sourceQuotationNo}` : 'saved by hand from the quotation form'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="inline text-muted-foreground">Used </dt>
          <dd className="inline">
            {s.useCount} {s.useCount === 1 ? 'time' : 'times'}
            {s.lastUsedAt ? ` · last ${formatPktDateTime(new Date(s.lastUsedAt))}${s.lastUsedBy ? ` by ${s.lastUsedBy}` : ''}` : ''}
          </dd>
        </div>
      </dl>

      <details className="rounded-lg bg-muted/30 p-3 text-sm">
        <summary className="min-h-11 cursor-pointer content-center font-medium">Full setup</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pe-2">Item</th>
                <th className="py-1 pe-2">Details</th>
                <th className="py-1 pe-2 text-end">Qty</th>
                <th className="py-1 pe-2 text-end">Price</th>
                <th className="py-1 text-end">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="py-1 pe-2 font-medium">{l.item}</td>
                  <td className="py-1 pe-2">{l.description}</td>
                  <td className="py-1 pe-2 text-end tabular-nums">{l.lump ? 'Job' : l.qty}</td>
                  <td className="py-1 pe-2 text-end tabular-nums">{l.unitPrice ? formatRs(l.unitPrice) : 'Included'}</td>
                  <td className="py-1 text-end tabular-nums">{formatRs(l.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs tabular-nums">
          Subtotal Rs {formatRs(subtotal)}
          {discount ? ` · Discount Rs ${formatRs(discount)}` : ''} · <span className="font-semibold">Total Rs {formatRs(total)}</span>
        </p>
        <dl className="mt-2 space-y-1 text-xs">
          {terms.map(([k, v]) => (
            <div key={k}>
              <dt className="inline text-muted-foreground">{k}: </dt>
              <dd className="inline">{v}</dd>
            </div>
          ))}
        </dl>
      </details>

      <details className="rounded-lg bg-muted/30 p-3 text-sm">
        <summary className="min-h-11 cursor-pointer content-center font-medium">Quotation JSON</summary>
        <pre className="mt-2 max-h-80 overflow-auto rounded bg-card p-2 text-xs">{JSON.stringify(q, null, 2)}</pre>
      </details>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="touch">
          <a href={`/api/quotations/saved/${s.id}/pdf`} target="_blank" rel="noreferrer">
            <FileText aria-hidden />
            Make PDF
          </a>
        </Button>
        <Button asChild variant="outline" size="touch">
          <a href={`/api/quotations/saved/${s.id}/pdf?download=1`}>
            <Download aria-hidden />
            Download
          </a>
        </Button>
        {s.canDelete ? <SavedQuotationDeleteButton id={s.id} name={s.name} /> : null}
      </div>
    </li>
  )
}
