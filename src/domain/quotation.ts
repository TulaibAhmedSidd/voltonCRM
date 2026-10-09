/**
 * Quotation (lead page → Quotation tab → PDF for the customer). Pure: used by the form (live total),
 * the server action (validation + totals) and the PDF.
 * Defaults follow the Volton website (voltonsolar.com plans / calculator): structure 20,000, wiring 35,000, labour 40,000.
 */
import { z } from 'zod'

export const COMPANY = {
  name: 'VOLTON SOLAR',
  tagline: 'Solar planning, products and execution under one roof',
  address: 'Suite #6, A-137 Block 5, Gulshan-e-Iqbal, Karachi',
  phone: '+92 303 2115055',
  email: 'voltonsolar@gmail.com',
  website: 'voltonsolar.com',
} as const

export const QUOTE_SYSTEM_TYPES = ['on_grid', 'hybrid', 'off_grid'] as const
export type QuoteSystemType = (typeof QUOTE_SYSTEM_TYPES)[number]
export const QUOTE_SYSTEM_LABEL: Record<QuoteSystemType, string> = { on_grid: 'On-Grid', hybrid: 'Hybrid', off_grid: 'Off-Grid' }

export const STRUCTURE_TYPES = ['standard', 'elevated', 'elevated_walkway', 'ground', 'custom'] as const
export type StructureType = (typeof STRUCTURE_TYPES)[number]
export const STRUCTURE_LABEL: Record<StructureType, string> = {
  standard: 'Standard roof structure',
  elevated: 'Elevated structure',
  elevated_walkway: 'Elevated structure with walkway',
  ground: 'Ground-mounted structure',
  custom: 'Custom structure',
}

/** Suggestions only (agents can type any model). From the Volton website catalogue. */
export const PANEL_SUGGESTIONS = ['LONGi Hi-MO X10 645W', 'Jinko 725W N-Type TOPCon', 'Jinko 585W N-Type Bifacial']
export const INVERTER_SUGGESTIONS = [
  'GoodWe 6kW Hybrid (GW6000-EH)',
  'GoodWe ES Uniq 8kW (GW8000-ES-C10)',
  'GoodWe ES Uniq 10kW (GW10K-ES-C10)',
  'GoodWe 12kW SP (GW12K-ES-C10)',
  'Inverex Nitrox 6.6kW 48V',
  'Inverex Nitrox 10kW Hybrid',
  'Inverex NitroX 13kW 3-Phase Hybrid',
  'Inverex Veyron II 6kW',
  'iTel 3kW Pro',
  'iTel 4kW Pro IP54 Hybrid',
  'iTel 6kW Pro Hybrid IP54',
  'iTel 6.6kW IP66 Hybrid',
  'iTel 12kW SP Hybrid',
  'CoreTECH PV5600 4kW Hybrid',
  'CoreTECH NewGen PV9000 6kW Hybrid',
  'CoreTECH NexGen PV16000 8kW Hybrid',
  'CoreTECH NexGen PV20000 10kW Hybrid',
]
export const BATTERY_SUGGESTIONS = [
  'Itel 24V 100Ah LiFePO4 (2.56kWh)',
  'Itel 51.2V 100Ah LiFePO4 ESS',
  'Itel 16kWh 314Ah 51.2V LiFePO4',
  'Pylontech Fidus Plus 16kWh IP65',
  'Dyness PowerBrick Max 16kWh 51.2V',
  'GoodWe 16kWh Lithium IP65 LV',
  'Inverex LV-IP21 16kWh',
]

export const DEFAULT_PAYMENT_TERMS = '50% advance with order confirmation, 40% on delivery of equipment, 10% after installation and testing.'
export const STANDARD_TERMS = [
  'Prices are in Pakistani Rupees (PKR) and include the items listed above only.',
  'Final system design and price are confirmed after the site survey.',
  'Net-metering approval depends on K-Electric / NEPRA rules and processing time.',
  'Panels come with documented manufacturer warranty; inverter and battery carry the manufacturer (company) warranty.',
  'Any civil work, extra cable length or structure change requested at site is charged separately.',
]

const money = z.coerce.number().min(0).max(1_000_000_000)
const qty = z.coerce.number().min(0).max(100_000)
const text = (max: number) => z.string().trim().max(max).optional().default('')

export const extraItemInput = z.object({ description: text(160), qty, unitPrice: money })

export const quotationInput = z.object({
  systemType: z.enum(QUOTE_SYSTEM_TYPES),
  systemKw: z.coerce.number().min(0).max(10_000),
  panelModel: text(120),
  panelWatt: z.coerce.number().min(0).max(2000),
  panelQty: qty,
  panelPrice: money,
  inverterModel: text(120),
  inverterQty: qty,
  inverterPrice: money,
  batteryModel: text(120),
  batteryQty: qty,
  batteryPrice: money,
  structureType: z.enum(STRUCTURE_TYPES),
  structureDetails: text(160),
  structurePrice: money,
  wiringDetails: text(200),
  wiringPrice: money,
  protectionDetails: text(200),
  protectionPrice: money,
  netMetering: z.boolean(),
  netMeteringPrice: money,
  transportPrice: money,
  labourDetails: text(160),
  labourPrice: money,
  extras: z.array(extraItemInput).max(8),
  discount: money,
  panelWarrantyYears: z.coerce.number().min(0).max(40),
  inverterWarranty: text(80),
  batteryWarranty: text(80),
  serviceYears: z.coerce.number().min(0).max(20),
  validityDays: z.coerce.number().int().min(1).max(90),
  installationDays: text(60),
  paymentTerms: text(400),
  notes: text(1000),
})
export type QuotationInput = z.infer<typeof quotationInput>

export function defaultQuotation(targetKw?: number | null): QuotationInput {
  return {
    systemType: 'hybrid',
    systemKw: targetKw ?? 0,
    panelModel: PANEL_SUGGESTIONS[0],
    panelWatt: 645,
    panelQty: targetKw ? Math.ceil((targetKw * 1000) / 645) : 0,
    panelPrice: 0,
    inverterModel: '',
    inverterQty: 1,
    inverterPrice: 0,
    batteryModel: '',
    batteryQty: 0,
    batteryPrice: 0,
    structureType: 'elevated',
    structureDetails: '14 gauge, galvanised',
    structurePrice: 20_000,
    wiringDetails: 'DC: Pak Cable 4mm · AC: Pakistan Cable',
    wiringPrice: 35_000,
    protectionDetails: 'Chint AC / DC breakers, SPD, DB box, earthing',
    protectionPrice: 0,
    netMetering: false,
    netMeteringPrice: 0,
    transportPrice: 0,
    labourDetails: 'Installation, testing and commissioning',
    labourPrice: 40_000,
    extras: [],
    discount: 0,
    panelWarrantyYears: 12,
    inverterWarranty: 'Company warranty',
    batteryWarranty: 'Company warranty',
    serviceYears: 2,
    validityDays: 7,
    installationDays: '7–10 working days after advance',
    paymentTerms: DEFAULT_PAYMENT_TERMS,
    notes: '',
  }
}

export interface QuoteLine {
  item: string
  description: string
  qty: number
  unitPrice: number
  amount: number
}

const round = (n: number) => Math.round(n)

/** The lines that go in the PDF table (empty lines are left out) and the totals. */
export function quotationLines(q: QuotationInput): { lines: QuoteLine[]; subtotal: number; discount: number; total: number; panelKwp: number } {
  const lines: QuoteLine[] = []
  const add = (item: string, description: string, qty: number, unitPrice: number) => {
    if (!qty && !unitPrice && !description) return
    lines.push({ item, description, qty, unitPrice, amount: round(qty * unitPrice) })
  }
  const lump = (item: string, description: string, price: number) => {
    if (!price && !description) return
    lines.push({ item, description, qty: 1, unitPrice: price, amount: round(price) })
  }
  const panelKwp = Math.round(((q.panelWatt || 0) * (q.panelQty || 0)) / 10) / 100
  const wattInModel = q.panelWatt && q.panelModel.replace(/s/g, '').toLowerCase().includes(`${q.panelWatt}w`)
  add('Solar panels', [q.panelModel, q.panelWatt && !wattInModel ? `${q.panelWatt}W` : '', panelKwp ? `${panelKwp} kWp total` : ''].filter(Boolean).join(' · '), q.panelQty, q.panelPrice)
  add('Inverter', q.inverterModel, q.inverterQty, q.inverterPrice)
  if (q.batteryQty || q.batteryModel) add('Battery', q.batteryModel, q.batteryQty, q.batteryPrice)
  lump('Structure', [STRUCTURE_LABEL[q.structureType], q.structureDetails].filter(Boolean).join(' · '), q.structurePrice)
  lump('Wiring & cables', q.wiringDetails, q.wiringPrice)
  lump('Protection & accessories', q.protectionDetails, q.protectionPrice)
  if (q.netMetering) lump('Net metering', 'K-Electric net-metering application, documentation and meter', q.netMeteringPrice)
  if (q.transportPrice) lump('Transportation', 'Delivery of equipment to site', q.transportPrice)
  lump('Labour & installation', q.labourDetails, q.labourPrice)
  for (const e of q.extras) if (e.description || e.unitPrice) add('Other', e.description, e.qty || 1, e.unitPrice)
  const subtotal = lines.reduce((n, l) => n + l.amount, 0)
  const discount = Math.min(round(q.discount || 0), subtotal)
  return { lines, subtotal, discount, total: subtotal - discount, panelKwp }
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
const below100 = (n: number) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`)
const below1000 = (n: number) => [n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred` : '', below100(n % 100)].filter(Boolean).join(' ')

/** 1202800 → "Twelve Lakh Two Thousand Eight Hundred Rupees Only" (Pakistani lakh / crore). */
export function rupeesInWords(amount: number): string {
  let n = Math.round(Math.max(0, amount))
  if (n === 0) return 'Zero Rupees Only'
  const parts: string[] = []
  const crore = Math.floor(n / 10_000_000)
  n %= 10_000_000
  const lakh = Math.floor(n / 100_000)
  n %= 100_000
  const thousand = Math.floor(n / 1000)
  n %= 1000
  if (crore) parts.push(`${crore >= 100 ? below1000(crore) : below100(crore)} Crore`)
  if (lakh) parts.push(`${below100(lakh)} Lakh`)
  if (thousand) parts.push(`${below100(thousand)} Thousand`)
  if (n) parts.push(below1000(n))
  return `${parts.join(' ')} Rupees Only`
}

/** "1,202,800" */
export const formatRs = (n: number) => Math.round(n).toLocaleString('en-US')
