import { inflateSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { defaultQuotation, quotationInput, quotationLines, rupeesInWords } from '@/domain/quotation'
import { buildQuotationPdf, templateOf } from '@/server/services/quotation-pdf'
import { decodePng, textWidth, wrap } from '@/server/lib/pdf'
import { VOLTON_LOGO_PNG_BASE64 } from '@/server/lib/brand-logo'

const sample = () => ({ ...defaultQuotation(10), panelQty: 16, panelPrice: 24_500, inverterModel: 'GoodWe 12kW SP', inverterPrice: 365_000, batteryModel: 'Itel 51.2V', batteryQty: 2, batteryPrice: 95_000, protectionPrice: 0, discount: 15_000 })

describe('quotation maths', () => {
  it('lines and totals: qty × price, lump sums, Included items, discount', () => {
    const r = quotationLines(sample())
    expect(r.lines.map((l) => [l.item, l.amount])).toEqual([
      ['Solar panels', 392_000],
      ['Inverter', 365_000],
      ['Battery', 190_000],
      ['Structure', 20_000],
      ['Wiring & cables', 35_000],
      ['Protection & accessories', 0],
      ['Labour & installation', 40_000],
    ])
    expect(r).toMatchObject({ subtotal: 1_042_000, discount: 15_000, total: 1_027_000, panelKwp: 10.32 })
    expect(r.lines[0].description).toBe('LONGi Hi-MO X10 645W · 10.32 kWp total') // watt not repeated
  })
  it('discount can never make the total negative; net metering only when ticked', () => {
    const r = quotationLines({ ...sample(), discount: 99_999_999, netMetering: false, netMeteringPrice: 50_000 })
    expect(r.total).toBe(0)
    expect(r.lines.some((l) => l.item === 'Net metering')).toBe(false)
  })
  it('amounts in words use lakh and crore', () => {
    expect(rupeesInWords(1_202_800)).toBe('Twelve Lakh Two Thousand Eight Hundred Rupees Only')
    expect(rupeesInWords(25_000_000)).toBe('Two Crore Fifty Lakh Rupees Only')
    expect(rupeesInWords(0)).toBe('Zero Rupees Only')
  })
  it('the input schema rejects bad values', () => {
    expect(quotationInput.safeParse({ ...sample(), panelQty: -1 }).success).toBe(false)
    expect(quotationInput.safeParse({ ...sample(), systemType: 'nuclear' }).success).toBe(false)
    expect(quotationInput.safeParse(sample()).success).toBe(true)
  })
})

describe('PDF writer', () => {
  it('decodes the logo PNG and measures / wraps text', () => {
    const logo = decodePng(Buffer.from(VOLTON_LOGO_PNG_BASE64, 'base64'))
    expect([logo.width, logo.height, !!logo.alpha]).toEqual([1229, 368, true])
    expect(textWidth('Volton', 'regular', 10)).toBeGreaterThan(25)
    expect(wrap('one two three four five six', 'regular', 10, 50).length).toBeGreaterThan(1)
  })
  it('builds a valid multi-page PDF with a correct cross-reference table', async () => {
    const pdf = await buildQuotationPdf({
      quotationNo: 'VO-1001',
      leadNo: 'VL-00001',
      issuedAt: new Date('2026-10-09T08:00:00Z'),
      validUntil: new Date('2026-10-16T08:00:00Z'),
      customer: { name: 'Test Customer', phone: '+923001234567', address: 'Gulshan, Karachi' },
      preparedBy: { name: 'Asad Agent', role: 'Sales Consultant', phone: '+923111111111' },
      input: { ...sample(), notes: 'Long note. '.repeat(120), extras: Array.from({ length: 8 }, (_, i) => ({ description: `Extra item ${i}`, qty: 1, unitPrice: 1000 })) },
    })
    const s = pdf.toString('latin1')
    expect(s.startsWith('%PDF-1.4')).toBe(true)
    expect(s.trimEnd().endsWith('%%EOF')).toBe(true)
    expect(Number(/\/Count (\d+)/.exec(s)?.[1])).toBeGreaterThanOrEqual(2)
    // every xref offset points at "N 0 obj"
    const start = Number(/startxref\n(\d+)/.exec(s)![1])
    const offsets = s
      .slice(start)
      .split('\n')
      .filter((l) => / 00000 n $/.test(l))
      .map((l) => Number(l.slice(0, 10)))
    expect(offsets.length).toBeGreaterThan(5)
    offsets.forEach((o, i) => expect(s.slice(o, o + 12)).toMatch(new RegExp(`^${i + 1} 0 obj`)))
    expect(s).toContain('/BaseFont /Times-Italic')
    expect(s).toContain('/SMask')
  })
})

describe('Volton classic template', () => {
  const data = () => ({
    quotationNo: 'VO-1002',
    leadNo: 'VL-00002',
    issuedAt: new Date('2026-10-10T08:00:00Z'),
    validUntil: new Date('2026-10-17T08:00:00Z'),
    customer: { name: 'Mr Yawar', phone: '+923001234567', address: 'Defence Phase 2, Karachi' },
    preparedBy: { name: 'Hayat ul Hassan', role: 'Sales Consultant', phone: '+923134801568' },
    input: sample(),
  })
  const hexOf = (text: string) => Buffer.from(text, 'latin1').toString('hex')
  /** All page drawing commands (page streams are compressed). */
  const pageText = (pdf: Buffer) => {
    const raw = pdf.toString('latin1')
    const out: string[] = []
    for (const m of raw.matchAll(/stream\n([\s\S]*?)\nendstream/g)) {
      try {
        out.push(inflateSync(Buffer.from(m[1], 'latin1')).toString('latin1'))
      } catch {
        // JPEG pages are not compressed streams
      }
    }
    return out.join('\n')
  }

  it("is Volton's own 5-page set: cover, services, quotation table, acknowledgement, contact (with info@voltonsolar.com)", async () => {
    const pdf = await buildQuotationPdf(data(), 'classic')
    const s = pdf.toString('latin1')
    const drawn = pageText(pdf)
    expect(Number(/\/Count (\d+)/.exec(s)?.[1])).toBe(5)
    expect((s.match(/\/Filter \/DCTDecode/g) ?? []).length).toBe(4) // the 4 original pages
    expect(drawn).toContain(hexOf('info@voltonsolar.com'))
    expect(drawn).toContain(hexOf('Sales Representative : Hayat ul Hassan'))
  })

  it('new quotations default to classic; ones saved before templates keep the modern look; ?template= overrides', () => {
    expect(defaultQuotation().template).toBe('classic')
    expect(templateOf({ systemType: 'hybrid' })).toBe('modern')
    expect(templateOf({ template: 'classic' })).toBe('classic')
    expect(templateOf({ template: 'classic' }, 'modern')).toBe('modern')
  })
})

