import 'server-only'
import { COMPANY, QUOTE_SYSTEM_LABEL, STANDARD_TERMS, formatRs, quotationLines, rupeesInWords, type QuotationInput } from '@/domain/quotation'
import { formatPktDate } from '@/lib/dates-pkt'
import { formatPhone } from '@/lib/phone'
import { VOLTON_LOGO_PNG_BASE64 } from '@/server/lib/brand-logo'
import { DOCUMENT_COLORS } from '@/styles/document-colors'
import { A4, PdfDocument, decodePng, hex, wrap, type FontName, type RGB } from '@/server/lib/pdf'

/** The data the PDF needs (a saved Quotation document). */
export interface QuotationPdfData {
  quotationNo: string
  leadNo: string
  issuedAt: Date
  validUntil: Date
  customer: { name: string; phone: string; address?: string | null }
  preparedBy: { name: string; role: string; phone?: string | null }
  input: QuotationInput
}

const C = DOCUMENT_COLORS
const INK = hex(C.ink)
const GOLD = hex(C.gold)
const GOLD_SOFT = hex(C.goldSoft)
const MUTED = hex(C.muted)
const TEXT = hex(C.text)
const ROW = hex(C.row)
const BORDER = hex(C.border)
const WHITE: RGB = [1, 1, 1]
const M = 40 // page margin
const W = A4.width - 2 * M
const FOOTER_TOP = A4.height - 62

let logo: ReturnType<typeof decodePng> | null = null
const logoImage = () => (logo ??= decodePng(Buffer.from(VOLTON_LOGO_PNG_BASE64, 'base64')))
const LOGO_RATIO = 1229 / 368
const phoneText = (p?: string | null) => (p ? (formatPhone(p) ?? p) : '')

export function buildQuotationPdf(q: QuotationPdfData): Buffer {
  const doc = new PdfDocument({ title: `Quotation ${q.quotationNo} — ${q.customer.name}`, author: `${COMPANY.name} · ${q.preparedBy.name}`, subject: 'Solar system quotation' })
  doc.registerImage('Logo', logoImage())
  const { lines, subtotal, discount, total, panelKwp } = quotationLines(q.input)
  const input = q.input
  let y = 0

  const say = (str: string, x: number, yy: number, font: FontName = 'regular', size = 9.5, color: RGB = TEXT, align: 'left' | 'right' | 'center' = 'left') => doc.text(str, x, yy, { font, size, color, align })
  const para = (str: string, x: number, width: number, font: FontName = 'regular', size = 9.5, color: RGB = TEXT, lead = 13) => {
    for (const l of wrap(str, font, size, width)) {
      ensure(lead)
      say(l, x, y, font, size, color)
      y += lead
    }
  }

  // ── page furniture ──
  const bigHeader = () => {
    doc.rect(0, 0, A4.width, 100, { fill: INK })
    const h = 52
    doc.image('Logo', M, 24, h * LOGO_RATIO, h)
    say('QUOTATION', A4.width - M, 46, 'bold', 24, GOLD, 'right')
    say(`No. ${q.quotationNo}`, A4.width - M, 64, 'bold', 10, WHITE, 'right')
    say(`Date: ${formatPktDate(q.issuedAt)}   ·   Valid until: ${formatPktDate(q.validUntil)}`, A4.width - M, 79, 'regular', 9, WHITE, 'right')
    doc.rect(0, 100, A4.width, 4, { fill: GOLD })
  }
  const smallHeader = () => {
    doc.rect(0, 0, A4.width, 56, { fill: INK })
    const h = 30
    doc.image('Logo', M, 13, h * LOGO_RATIO, h)
    say(`Quotation ${q.quotationNo} (continued)`, A4.width - M, 33, 'bold', 10, WHITE, 'right')
    doc.rect(0, 56, A4.width, 3, { fill: GOLD })
  }
  const newPage = () => {
    doc.addPage()
    smallHeader()
    y = 82
  }
  /** Start a new page when the next block does not fit above the footer. */
  const ensure = (height: number) => {
    if (y + height > FOOTER_TOP - 10) newPage()
  }
  const sectionTitle = (title: string) => {
    ensure(34)
    y += 8
    doc.rect(M, y - 10, 4, 13, { fill: GOLD })
    say(title.toUpperCase(), M + 10, y, 'bold', 10.5, INK)
    y += 14
  }

  bigHeader()
  y = 124

  // ── Prepared for / by ──
  const boxW = (W - 14) / 2
  const boxH = 92
  for (const [i, label] of ['PREPARED FOR', 'PREPARED BY'].entries()) {
    const x = M + i * (boxW + 14)
    doc.rect(x, y, boxW, boxH, { fill: ROW })
    doc.rect(x, y, 3, boxH, { fill: i === 0 ? GOLD : INK })
    say(label, x + 12, y + 16, 'bold', 8, MUTED)
  }
  const cx = M + 12
  say(q.customer.name, cx, y + 33, 'bold', 12.5, INK)
  say(phoneText(q.customer.phone), cx, y + 48, 'regular', 9.5)
  const addr = wrap(q.customer.address || '', 'regular', 9, boxW - 24).slice(0, 2)
  addr.forEach((l, i) => say(l, cx, y + 62 + i * 12, 'regular', 9, MUTED))
  say(`Ref: ${q.leadNo}`, cx, y + boxH - 8, 'regular', 8, MUTED)
  const px = M + boxW + 14 + 12
  say(q.preparedBy.name, px, y + 33, 'bold', 12.5, INK)
  say(`${q.preparedBy.role}, ${COMPANY.name}`, px, y + 48, 'regular', 9.5)
  if (q.preparedBy.phone) say(phoneText(q.preparedBy.phone), px, y + 62, 'regular', 9, MUTED)
  say(`${COMPANY.phone} · ${COMPANY.email}`, px, y + 75, 'regular', 9, MUTED)
  y += boxH + 16

  // ── System summary strip ──
  const facts: [string, string][] = [
    ['SYSTEM TYPE', QUOTE_SYSTEM_LABEL[input.systemType]],
    ['SYSTEM SIZE', input.systemKw ? `${input.systemKw} kW` : '—'],
    ['PANEL CAPACITY', panelKwp ? `${panelKwp} kWp (${input.panelQty} × ${input.panelWatt}W)` : '—'],
    ['BATTERY BACKUP', input.batteryQty ? `${input.batteryQty} × battery` : 'Not included'],
  ]
  doc.rect(M, y, W, 46, { fill: GOLD_SOFT, stroke: GOLD, lineWidth: 0.6 })
  const fw = W / facts.length
  facts.forEach(([label, value], i) => {
    const x = M + i * fw + 10
    say(label, x, y + 17, 'bold', 7.5, MUTED)
    const v = wrap(value, 'bold', 10, fw - 16)[0] ?? ''
    say(v, x, y + 33, 'bold', 10, INK)
  })
  y += 62

  // ── Items table ──
  sectionTitle('System components & charges')
  const cols = [
    { title: '#', w: 22, align: 'left' as const },
    { title: 'Item', w: 112, align: 'left' as const },
    { title: 'Description / specification', w: 199, align: 'left' as const },
    { title: 'Qty', w: 38, align: 'right' as const },
    { title: 'Unit price (Rs)', w: 72, align: 'right' as const },
    { title: 'Amount (Rs)', w: 72, align: 'right' as const },
  ]
  const tableHeader = () => {
    doc.rect(M, y, W, 22, { fill: INK })
    let x = M
    for (const c of cols) {
      say(c.title, c.align === 'right' ? x + c.w - 6 : x + 6, y + 14.5, 'bold', 8.5, WHITE, c.align)
      x += c.w
    }
    y += 22
  }
  tableHeader()
  lines.forEach((line, idx) => {
    const desc = wrap(line.description || '—', 'regular', 8.8, cols[2].w - 12)
    const item = wrap(line.item, 'bold', 9, cols[1].w - 12)
    const h = Math.max(desc.length, item.length) * 11.5 + 10
    if (y + h > FOOTER_TOP - 10) {
      newPage()
      tableHeader()
    }
    if (idx % 2 === 1) doc.rect(M, y, W, h, { fill: ROW })
    let x = M
    const base = y + 15
    say(String(idx + 1), x + 6, base, 'regular', 9, MUTED)
    x += cols[0].w
    item.forEach((l, i) => say(l, x + 6, base + i * 11.5, 'bold', 9, INK))
    x += cols[1].w
    desc.forEach((l, i) => say(l, x + 6, base + i * 11.5, 'regular', 8.8))
    x += cols[2].w
    say(String(line.qty), x + cols[3].w - 6, base, 'regular', 9, TEXT, 'right')
    x += cols[3].w
    // Items without a separate charge (e.g. breakers in the package) say Included instead of 0.
    say(line.amount ? formatRs(line.unitPrice) : '—', x + cols[4].w - 6, base, 'regular', 9, line.amount ? TEXT : MUTED, 'right')
    x += cols[4].w
    say(line.amount ? formatRs(line.amount) : 'Included', x + cols[5].w - 6, base, line.amount ? 'bold' : 'italic', 9, line.amount ? TEXT : MUTED, 'right')
    y += h
    doc.line(M, y, M + W, y, { color: BORDER, width: 0.5 })
  })

  // ── Totals ──
  ensure(discount ? 96 : 76)
  y += 10
  const tx = M + W - 230
  const totalRow = (label: string, value: string, bold = false) => {
    say(label, tx + 10, y + 13, bold ? 'bold' : 'regular', 9.5, TEXT)
    say(value, M + W - 8, y + 13, bold ? 'bold' : 'regular', 9.5, TEXT, 'right')
    y += 18
  }
  const wordsY = y
  totalRow('Subtotal', `Rs ${formatRs(subtotal)}`)
  if (discount) totalRow('Discount', `– Rs ${formatRs(discount)}`)
  doc.rect(tx, y + 2, 230, 26, { fill: INK })
  say('TOTAL', tx + 10, y + 19.5, 'bold', 11, GOLD)
  say(`Rs ${formatRs(total)}`, M + W - 8, y + 19.5, 'bold', 12, WHITE, 'right')
  const words = wrap(`Amount in words: ${rupeesInWords(total)}`, 'italic', 9, W - 250)
  words.forEach((l, i) => say(l, M, wordsY + 14 + i * 12, 'italic', 9, MUTED))
  y += 40

  // ── Warranty & service ──
  sectionTitle('Warranty & after-sales service')
  const bullets: string[] = []
  if (input.panelQty) bullets.push(`Solar panels: ${input.panelWarrantyYears ? `${input.panelWarrantyYears} years documented warranty` : 'manufacturer warranty'}`)
  if (input.inverterQty || input.inverterModel) bullets.push(`Inverter: ${input.inverterWarranty || 'company warranty'}`)
  if (input.batteryQty) bullets.push(`Battery: ${input.batteryWarranty || 'company warranty'}`)
  if (input.serviceYears) bullets.push(`Free after-sales service: ${input.serviceYears} year${input.serviceYears === 1 ? '' : 's'} from installation`)
  for (const b of bullets) {
    ensure(14)
    doc.rect(M + 2, y - 6, 4, 4, { fill: GOLD })
    para(b, M + 12, W - 12)
  }

  // ── Terms ──
  sectionTitle('Terms & conditions')
  const terms = [
    `Validity: this quotation is valid for ${input.validityDays} day${input.validityDays === 1 ? '' : 's'} (until ${formatPktDate(q.validUntil)}).`,
    ...(input.installationDays ? [`Installation: ${input.installationDays}.`] : []),
    ...(input.paymentTerms ? [`Payment: ${input.paymentTerms}`] : []),
    ...STANDARD_TERMS,
  ]
  terms.forEach((t, i) => {
    ensure(14)
    say(`${i + 1}.`, M + 2, y, 'regular', 9, MUTED)
    para(t, M + 18, W - 18, 'regular', 9, TEXT, 12.5)
  })
  if (input.notes) {
    sectionTitle('Notes')
    para(input.notes, M, W, 'regular', 9.5)
  }

  // ── Signatures (kept together) ──
  ensure(128)
  y += 18
  const sw = (W - 30) / 2
  say('PREPARED & SIGNED BY', M, y, 'bold', 8, MUTED)
  say('CUSTOMER ACCEPTANCE', M + sw + 30, y, 'bold', 8, MUTED)
  say(q.preparedBy.name, M + 4, y + 36, 'sign', 22, INK)
  doc.line(M, y + 46, M + sw, y + 46, { color: INK, width: 0.8 })
  doc.line(M + sw + 30, y + 46, M + W, y + 46, { color: INK, width: 0.8 })
  say(q.preparedBy.name, M, y + 60, 'bold', 9.5, INK)
  say(`${q.preparedBy.role} · ${COMPANY.name}`, M, y + 73, 'regular', 8.5, MUTED)
  say(`Issued electronically on ${formatPktDate(q.issuedAt)}${q.preparedBy.phone ? ` · ${phoneText(q.preparedBy.phone)}` : ''}`, M, y + 85, 'regular', 8.5, MUTED)
  say('Name, signature & date', M + sw + 30, y + 60, 'regular', 8.5, MUTED)
  y += 96

  // ── Footer on every page ──
  const pages = doc.pageCount
  for (let p = 0; p < pages; p++) {
    doc.onPage(p, () => {
      doc.rect(M, FOOTER_TOP, W, 1.2, { fill: GOLD })
      say(`${COMPANY.name}  ·  ${COMPANY.address}`, M, FOOTER_TOP + 16, 'bold', 8, INK)
      say(`${COMPANY.phone}  ·  ${COMPANY.email}  ·  ${COMPANY.website}`, M, FOOTER_TOP + 28, 'regular', 8, MUTED)
      say(`${q.quotationNo}  ·  Page ${p + 1} of ${pages}`, M + W, FOOTER_TOP + 16, 'regular', 8, MUTED, 'right')
      say(COMPANY.tagline, M + W, FOOTER_TOP + 28, 'italic', 8, MUTED, 'right')
    })
  }
  return doc.build()
}
