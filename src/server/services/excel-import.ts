import 'server-only'
// @ts-expect-error yauzl has no bundled types
import yauzl from 'yauzl'
import { INSTALL_LOCATIONS, INSTALL_TIMELINES, SYSTEM_SIZE_RANGES, type Department } from '@/domain/constants'
import { buildRowKey, detectColumns, mapSheetRow, parseFormAnswer, parseSheetDate, routeDepartment } from '@/domain/sheet-columns'
import { isAdminRole } from '@/server/auth/scope'
import type { SessionUser } from '@/server/auth/session'
import { Department as DepartmentModel, User } from '@/server/db/models'
import { UserError } from '@/server/services/common'
import { ingestLead } from '@/server/services/ingest'
import { matchAgent } from '@/server/services/sheet'
import { formatPktDate } from '@/lib/dates-pkt'

/**
 * Leads page → Upload Excel / CSV. Same column rules as the Google Sheet import (src/domain/sheet-columns.ts), so the
 * client's lead sheet (Date · campaign · KW / System size · Install location / timeline · Customer Name · Phone ·
 * Agent · follow-ups · Lead Status …) imports as-is:
 *  - each lead goes to the CRM agent named in the "Agent" column (already accepted); unknown names wait in Unassigned
 *  - form answers (5_to_15_kw, home, within_a_month) are stored as the lead's form answers
 *  - Lead Status, follow-up and comment columns are kept on the lead ("Sheet details")
 *  - the same file uploaded twice creates nothing twice
 */

export interface ParsedSpreadsheet {
  sheetName: string
  headers: string[]
  rows: Record<string, string>[]
}

export interface ImportSpreadsheetResult {
  sheetName: string
  totalRows: number
  created: number
  /** of the created ones: given to the agent named in the file */
  assigned: number
  duplicates: number
  invalid: number
  /** rows with no customer at all (empty template rows that only hold formulas) — ignored */
  emptyRows: number
  /** sheet row numbers (2 = first data row) without a valid phone, first 10 */
  invalidRows: number[]
  /** "Agent" names in the file that match no active CRM agent of the department */
  unknownAgents: string[]
}

// ── XLSX reading (zip + XML, no extra packages) ──

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }
const unescapeXml = (v: string) => v.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e: string) => (e[0] === '#' ? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : XML_ENTITIES[e.toLowerCase()]))
/** Text of an <si> / <is> element: all <t> runs joined (rich text), phonetic hints left out. */
const textOf = (xml: string) => unescapeXml([...xml.replace(/<rPh[\s\S]*?<\/rPh>/g, '').matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => m[1]).join(''))
/** "AB12" → 27 (0-based column index 27) */
export function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0].toUpperCase() ?? ''
  return [...letters].reduce((n, c) => n * 26 + (c.charCodeAt(0) - 64), 0) - 1
}

function unzipEntries(buffer: Buffer): Promise<Record<string, string>> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err: Error | null, zipfile: any) => {
      if (err) return reject(new UserError('This is not a valid Excel (.xlsx) file. Old .xls files: open in Excel and "Save As" .xlsx (or CSV).'))
      const files: Record<string, string> = {}
      zipfile.readEntry()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      zipfile.on('entry', (entry: any) => {
        if (!/^(xl\/(workbook\.xml|sharedStrings\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^/]+\.xml))$/.test(entry.fileName)) return zipfile.readEntry()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        zipfile.openReadStream(entry, (streamErr: Error | null, stream: any) => {
          if (streamErr) return reject(new UserError('Could not read the Excel file.'))
          const chunks: Buffer[] = []
          stream.on('data', (chunk: Buffer) => chunks.push(chunk))
          stream.on('end', () => {
            files[entry.fileName] = Buffer.concat(chunks).toString('utf8')
            zipfile.readEntry()
          })
        })
      })
      zipfile.on('end', () => resolve(files))
      zipfile.on('error', () => reject(new UserError('Could not read the Excel file.')))
    })
  })
}

/** Rows of one worksheet as arrays, every value in its real column (empty cells are often left out of the XML). */
export function worksheetRows(sheetXml: string, sharedStrings: string[]): string[][] {
  const out: string[][] = []
  for (const rowXml of sheetXml.match(/<row\b[^>]*\/>|<row\b[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    const cells: string[] = []
    let next = 0
    // Self-closing cells first, so an empty <c/> never swallows the next cell.
    for (const cell of rowXml.match(/<c\b[^>]*\/>|<c\b[^>]*>[\s\S]*?<\/c>/g) ?? []) {
      const open = /^<c\b[^>]*>/.exec(cell)?.[0] ?? ''
      const ref = /\br="([A-Z]+)\d*"/i.exec(open)?.[1]
      const col = ref ? columnIndex(ref) : next
      next = col + 1
      if (open.endsWith('/>')) continue
      const type = /\bt="([^"]+)"/.exec(open)?.[1]
      const v = /<v>([\s\S]*?)<\/v>/.exec(cell)?.[1]
      let value = ''
      if (type === 's') value = sharedStrings[Number(v)] ?? ''
      else if (type === 'inlineStr') value = textOf(/<is>[\s\S]*?<\/is>/.exec(cell)?.[0] ?? '')
      else if (type === 'b') value = v === '1' ? 'TRUE' : v === '0' ? 'FALSE' : ''
      else value = v !== undefined ? unescapeXml(v) : ''
      cells[col] = value.trim()
    }
    out.push(Array.from(cells, (c) => c ?? ''))
  }
  return out
}

async function parseXlsx(buffer: Buffer): Promise<ParsedSpreadsheet> {
  const files = await unzipEntries(buffer)
  const workbook = files['xl/workbook.xml']
  if (!workbook) throw new UserError('This is not a valid Excel (.xlsx) file.')
  const sharedStrings = (files['xl/sharedStrings.xml']?.match(/<si>[\s\S]*?<\/si>/g) ?? []).map(textOf)
  const rels = new Map<string, string>()
  for (const m of (files['xl/_rels/workbook.xml.rels'] ?? '').matchAll(/<Relationship\b[^>]*>/g)) {
    const id = /\bId="([^"]+)"/.exec(m[0])?.[1]
    const target = /\bTarget="([^"]+)"/.exec(m[0])?.[1]
    if (id && target) rels.set(id, target.startsWith('/') ? target.slice(1) : `xl/${target}`)
  }
  const sheets = [...workbook.matchAll(/<sheet\b[^>]*>/g)].map((m, i) => {
    const name = unescapeXml(/\bname="([^"]*)"/.exec(m[0])?.[1] ?? `Sheet${i + 1}`)
    const rid = /\br:id="([^"]+)"/.exec(m[0])?.[1]
    return { name, file: (rid && rels.get(rid)) || `xl/worksheets/sheet${i + 1}.xml` }
  })
  if (!sheets.length) throw new UserError('No sheets found in the Excel file.')
  const tables = sheets.map((s) => ({ name: s.name, rows: worksheetRows(files[s.file] ?? '', sharedStrings).filter((r) => r.some((c) => c !== '')) }))
  // A tab called "Leads" wins; else the first tab whose first row has a phone column.
  const hasPhone = (t: (typeof tables)[number]) => t.rows.length > 0 && detectColumns(uniqueHeaders(t.rows[0])).missingRequired.length === 0
  const pick = tables.find((t) => /^leads?$/i.test(t.name.trim()) && t.rows.length) ?? tables.find(hasPhone) ?? tables[0]
  return toTable(pick.name, pick.rows)
}

/** Blank headers get "Column C"; repeated headers ("Comment" ×3) get "Comment (2)", "Comment (3)". */
function uniqueHeaders(raw: string[]): string[] {
  const seen = new Map<string, number>()
  return raw.map((h, i) => {
    const base = h.replace(/\s+/g, ' ').trim() || `Column ${String.fromCharCode(65 + (i % 26))}`
    const n = (seen.get(base.toLowerCase()) ?? 0) + 1
    seen.set(base.toLowerCase(), n)
    return n === 1 ? base : `${base} (${n})`
  })
}

function toTable(sheetName: string, rows: string[][]): ParsedSpreadsheet {
  if (!rows.length) throw new UserError(`Tab "${sheetName}" has no data.`)
  const headers = uniqueHeaders(rows[0])
  const data = rows.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ''])))
  return { sheetName, headers, rows: data }
}

/** CSV with quoted fields (commas / new lines inside quotes, "" = quote). Separator: comma, semicolon or tab. */
export function parseCsv(text: string): ParsedSpreadsheet {
  const body = text.replace(/^﻿/, '')
  const firstLine = body.split(/\r?\n/, 1)[0] ?? ''
  const sep = [',', ';', '\t'].map((s) => [s, firstLine.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0]
  const rows: string[][] = []
  let row: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (quoted) {
      if (ch === '"' && body[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) {
      row.push(cur.trim())
      cur = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && body[i + 1] === '\n') i++
      row.push(cur.trim())
      rows.push(row)
      row = []
      cur = ''
    } else cur += ch
  }
  if (cur || row.length) {
    row.push(cur.trim())
    rows.push(row)
  }
  const filled = rows.filter((r) => r.some((c) => c !== ''))
  if (!filled.length) throw new UserError('The CSV file is empty.')
  return toTable('CSV', filled)
}

// ── Values ──

/** Excel stores dates as day numbers (46305 = 9 Oct 2026). Read as Pakistan time. Text dates use the Sheet rules. */
export function parseImportDate(value: string | undefined): Date | undefined {
  const v = value?.trim()
  if (!v) return undefined
  if (/^\d{5}(\.\d+)?$/.test(v)) {
    const serial = Number(v)
    if (serial > 20000 && serial < 80000) return new Date(Date.UTC(1899, 11, 30) + Math.round(serial * 86_400_000) - 5 * 3_600_000)
  }
  return parseSheetDate(v)
}

/** Phones saved as numbers lose the "+" / leading 0: 923001234567 → +923001234567, 3001234567 → 03001234567. */
export function fixPhoneText(value: string): string {
  const v = value.trim().replace(/\.0+$/, '')
  if (/^92\d{10}$/.test(v)) return `+${v}`
  if (/^3\d{9}$/.test(v)) return `0${v}`
  return v
}

// ── Import ──

export async function importLeadsFromSpreadsheet(user: SessionUser, buffer: Buffer, filename: string): Promise<ImportSpreadsheetResult> {
  const parsed = /\.csv$/i.test(filename) ? parseCsv(buffer.toString('utf8')) : await parseXlsx(buffer)
  const detection = detectColumns(parsed.headers)
  const fieldOf = (field: string) => Object.entries(detection.mapping).find(([, f]) => f === field)?.[0]
  if (detection.missingRequired.length) {
    throw new UserError(`Tab "${parsed.sheetName}" has no phone column. Name one column "Phone" (or Mobile / WhatsApp). Columns found: ${parsed.headers.filter(Boolean).join(', ') || 'none'}.`)
  }

  // Department: managers import into their own; admins by the file's Department / campaign words, else Installation.
  const departments = await DepartmentModel.find().select('code routingKeywords').lean()
  const keywords = Object.fromEntries(departments.map((d) => [d.code, d.routingKeywords ?? []])) as Record<Department, string[]>
  const own = user.departmentId ? (departments.find((d) => String(d._id) === user.departmentId)?.code as Department | undefined) : undefined
  const agents = await User.find({ role: 'agent', isActive: true, deletedAt: null }).select('_id name departmentId').lean()
  const deptIdOf = new Map(departments.map((d) => [d.code as Department, String(d._id)]))
  const phoneCols = [fieldOf('phone'), fieldOf('whatsapp'), fieldOf('altPhone')].filter((h): h is string => !!h)

  const result: ImportSpreadsheetResult = { sheetName: parsed.sheetName, totalRows: parsed.rows.length, created: 0, assigned: 0, duplicates: 0, invalid: 0, emptyRows: 0, invalidRows: [], unknownAgents: [] }
  const unknown = new Set<string>()
  for (const [index, raw] of parsed.rows.entries()) {
    const row = { ...raw }
    for (const h of phoneCols) if (row[h]) row[h] = fixPhoneText(row[h])
    const mapped = mapSheetRow(row, detection)
    const f = mapped.fields
    // Template rows that only carry formulas (e.g. Lead Status = "New") have no customer: skip them quietly.
    if (!f.name && !f.phone && !f.whatsapp && !f.altPhone) {
      result.emptyRows++
      continue
    }
    if (!mapped.phone) {
      result.invalid++
      if (result.invalidRows.length < 10) result.invalidRows.push(index + 2)
      continue
    }
    const department: Department = !isAdminRole(user.role) && own ? own : (routeDepartment(f, keywords) ?? own ?? 'INSTALLATION')
    const submittedAt = parseImportDate(f.submittedAt)
    // "KW / System size" often holds a form answer (5_to_15_kw) instead of a number.
    const kwNumber = f.targetKw && /^\d+(\.\d+)?\s*(kw)?$/i.test(f.targetKw.trim()) ? Number.parseFloat(f.targetKw) : undefined
    const site = {
      systemSizeRange: parseFormAnswer(f.systemSizeRange ?? (kwNumber === undefined ? f.targetKw : undefined), SYSTEM_SIZE_RANGES),
      installLocation: parseFormAnswer(f.installLocation, INSTALL_LOCATIONS),
      installTimeline: parseFormAnswer(f.installTimeline, INSTALL_TIMELINES),
      ...(kwNumber && kwNumber > 0 && kwNumber < 10_000 ? { targetKw: kwNumber } : {}),
    }
    const departmentAgents = agents.filter((a) => String(a.departmentId) === deptIdOf.get(department))
    const agentId = matchAgent(f.agentName, departmentAgents)
    if (f.agentName && !agentId) unknown.add(f.agentName.trim())
    const kept: Record<string, string> = { ...mapped.extra }
    // Date columns (Follow up 1/2, Next Follow-up Due Date…) come as Excel day numbers — keep them readable.
    for (const [k, v] of Object.entries(kept)) {
      if (/date|follow|due|time|day/i.test(k) && /^\d{5}(\.\d+)?$/.test(v)) {
        const d = parseImportDate(v)
        if (d) kept[k] = formatPktDate(d)
      }
    }
    if (f.status) kept['Lead Status (file)'] = f.status
    if (f.agentName) kept['Agent (file)'] = f.agentName
    for (const key of ['systemSizeRange', 'installLocation', 'installTimeline'] as const) if (f[key] && !site[key]) kept[`${key} (file)`] = f[key]!
    if (f.targetKw && !site.targetKw && !site.systemSizeRange) kept['KW / System size (file)'] = f.targetKw

    const r = await ingestLead({
      name: f.name ?? '',
      phone: mapped.phone,
      whatsapp: f.whatsapp,
      altPhones: f.altPhone ? [f.altPhone] : [],
      email: f.email,
      city: f.city,
      area: f.area,
      address: f.address,
      department,
      channel: 'csv_import',
      source: {
        rowKey: buildRowKey({ tab: `file:${parsed.sheetName}`, phone: mapped.phone, submittedAt: f.submittedAt }),
        submittedAt,
        campaignName: f.campaignName,
        adsetName: f.adsetName,
        adName: f.adName,
        formName: f.formName ?? `File: ${filename}`.slice(0, 120),
        sheetTab: parsed.sheetName,
        sheetRow: index + 2,
        platform: /^(fb|facebook)$/i.test(f.platform ?? '') ? 'facebook' : /^(ig|instagram)$/i.test(f.platform ?? '') ? 'instagram' : undefined,
      },
      site,
      extra: kept,
      notes: f.notes,
      receivedAt: submittedAt,
      agentId,
      actorId: user.id,
      quiet: true, // old leads: no alerts, no round-robin
    })
    if (r.status === 'created') {
      result.created++
      if (agentId) result.assigned++
    } else if (r.status === 'reinquiry' || r.status === 'duplicate_row') result.duplicates++
    else {
      result.invalid++
      if (result.invalidRows.length < 10) result.invalidRows.push(index + 2)
    }
  }
  result.totalRows -= result.emptyRows
  result.unknownAgents = [...unknown].slice(0, 10)
  return result
}
