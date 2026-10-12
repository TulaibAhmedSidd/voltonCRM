import 'server-only'
// @ts-expect-error yauzl has no bundled types
import yauzl from 'yauzl'
import { normalizePhone } from '@/lib/phone'
import { UserError } from '@/server/services/common'
import { ingestLead, type IngestInput } from '@/server/services/ingest'
import type { SessionUser } from '@/server/auth/session'
import type { Department, LeadChannel } from '@/domain/constants'
import { Department as DepartmentModel } from '@/server/db/models'

export interface ParsedSpreadsheet {
  sheetName: string
  headers: string[]
  rows: Record<string, string>[]
}

export interface ImportSpreadsheetResult {
  sheetName: string
  totalRows: number
  created: number
  duplicates: number
  invalid: number
}

// Column matching regexes
const COL_NAME = /^(?:customer|name|client|full\s*name|customer\s*name)$/i
const COL_PHONE = /^(?:phone|mobile|contact|cell|number|phone\s*number|mobile\s*number)$/i
const COL_WHATSAPP = /^(?:whatsapp|whatsapp\s*number|whatsapp\s*\(if\s*different\))$/i
const COL_CITY = /^(?:city|location|town|area)$/i
const COL_DEPT = /^(?:department|dept)$/i
const COL_SOURCE = /^(?:source|channel)$/i
const COL_CAMPAIGN = /^(?:campaign|campaign\s*\/\s*form\s*\/\s*ad|form|ad|campaign\s*name|ad\s*name)$/i
const COL_KW = /^(?:kw|system\s*size|kw\s*\/\s*system\s*size|target\s*kw|capacity)$/i
const COL_DATE = /^(?:received\s*\(pkt\)|received|date|created\s*at|date\s*received)$/i

function cleanCell(val: string): string {
  return val
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

/** Parse an XLSX buffer in memory using yauzl (zero external dependencies). */
async function parseXlsx(buffer: Buffer): Promise<ParsedSpreadsheet> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (err: Error | null, zipfile: any) => {
      if (err) return reject(new UserError('Invalid or corrupted Excel (.xlsx) file.'))

      const files: Record<string, string> = {}
      zipfile.readEntry()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      zipfile.on('entry', (entry: any) => {
        const name = entry.fileName
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        zipfile.openReadStream(entry, (streamErr: Error | null, stream: any) => {
          if (streamErr) return reject(new UserError('Could not read Excel file entries.'))
          const chunks: Buffer[] = []
          stream.on('data', (chunk: Buffer) => chunks.push(chunk))
          stream.on('end', () => {
            files[name] = Buffer.concat(chunks).toString('utf8')
            zipfile.readEntry()
          })
        })
      })

      zipfile.on('end', () => {
        try {
          const workbookXml = files['xl/workbook.xml'] || ''
          const sheetMatches = [...workbookXml.matchAll(/<sheet[^>]+name="([^"]+)"[^>]+(?:r:id="([^"]+)"|sheetId="([^"]+)")/g)]
          if (!sheetMatches.length) return reject(new UserError('No sheets found in Excel file.'))

          // Shared strings table
          const sharedStringsXml = files['xl/sharedStrings.xml'] || ''
          const sharedStrings: string[] = []
          if (sharedStringsXml) {
            const siMatches = sharedStringsXml.match(/<si>[\s\S]*?<\/si>/g) || []
            for (const si of siMatches) {
              const tMatches = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)]
              sharedStrings.push(cleanCell(tMatches.map((m) => m[1]).join('')))
            }
          }

          // Resolve worksheet relationship paths
          const relsXml = files['xl/_rels/workbook.xml.rels'] || ''
          const relMap: Record<string, string> = {}
          for (const m of relsXml.matchAll(/<Relationship[^>]+Id="([^"]+)"[^>]+Target="([^"]+)"/g)) {
            relMap[m[1]] = m[2].replace(/^\/?/, 'xl/')
          }

          // Sheet candidates: prefer sheet named "Leads" or "Lead"
          let targetSheetFile: string | null = null
          let targetSheetName = 'Leads'

          for (const m of sheetMatches) {
            const name = m[1]
            const rId = m[2]
            const filePath = relMap[rId] || `xl/worksheets/sheet${m[3] || 1}.xml`
            if (/^leads?$/i.test(name.trim())) {
              targetSheetFile = filePath
              targetSheetName = name
              break
            }
          }

          // If no "Leads" tab, find any sheet that has lead-like headers
          if (!targetSheetFile) {
            for (const m of sheetMatches) {
              const filePath = relMap[m[2]] || `xl/worksheets/sheet${m[3] || 1}.xml`
              const xml = files[filePath] || ''
              if (xml.includes('Phone') || xml.includes('Customer') || xml.includes('Mobile')) {
                targetSheetFile = filePath
                targetSheetName = m[1]
                break
              }
            }
          }

          if (!targetSheetFile) {
            targetSheetFile = relMap[sheetMatches[0][2]] || 'xl/worksheets/sheet1.xml'
            targetSheetName = sheetMatches[0][1]
          }

          const sheetXml = files[targetSheetFile] || ''
          const rowMatches = sheetXml.match(/<row[^>]*>[\s\S]*?<\/row>/g) || []
          if (!rowMatches.length) return reject(new UserError(`Sheet "${targetSheetName}" contains no data rows.`))

          const rawRows: string[][] = []
          for (const rXml of rowMatches) {
            const cells: string[] = []
            const cMatches = rXml.match(/<c[^>]*>[\s\S]*?<\/c>|<c[^>]*\/>/g) || []
            for (const cXml of cMatches) {
              const typeMatch = cXml.match(/t="([^"]+)"/)
              const type = typeMatch ? typeMatch[1] : null

              let val = ''
              if (type === 'inlineStr') {
                const tMatch = cXml.match(/<t[^>]*>([\s\S]*?)<\/t>/)
                val = tMatch ? cleanCell(tMatch[1]) : ''
              } else if (type === 's') {
                const vMatch = cXml.match(/<v>([\s\S]*?)<\/v>/)
                const idx = vMatch ? parseInt(vMatch[1], 10) : -1
                val = idx >= 0 && idx < sharedStrings.length ? sharedStrings[idx] : ''
              } else {
                const vMatch = cXml.match(/<v>([\s\S]*?)<\/v>/)
                val = vMatch ? cleanCell(vMatch[1]) : ''
              }
              cells.push(val)
            }
            if (cells.some((c) => c !== '')) rawRows.push(cells)
          }

          if (!rawRows.length) return reject(new UserError(`Sheet "${targetSheetName}" has no data.`))

          const headers = rawRows[0].map((h) => h.trim())
          const rows: Record<string, string>[] = []

          for (let i = 1; i < rawRows.length; i++) {
            const r = rawRows[i]
            const rowObj: Record<string, string> = {}
            headers.forEach((h, idx) => {
              if (h) rowObj[h] = r[idx] ?? ''
            })
            if (Object.values(rowObj).some((v) => v !== '')) rows.push(rowObj)
          }

          resolve({ sheetName: targetSheetName, headers, rows })
        } catch (e) {
          reject(e instanceof Error ? e : new UserError('Failed to parse Excel workbook.'))
        }
      })
    })
  })
}

/** Parse CSV text into headers and rows. */
function parseCsv(text: string): ParsedSpreadsheet {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (!lines.length) throw new UserError('CSV file is empty.')

  const parseLine = (line: string): string[] => {
    const cells: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if ((ch === ',' || ch === '\t' || ch === ';') && !inQuotes) {
        cells.push(cur.trim().replace(/^"|"$/g, ''))
        cur = ''
      } else {
        cur += ch
      }
    }
    cells.push(cur.trim().replace(/^"|"$/g, ''))
    return cells
  }

  const headers = parseLine(lines[0])
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseLine(lines[i])
    const rowObj: Record<string, string> = {}
    headers.forEach((h, idx) => {
      if (h) rowObj[h] = cells[idx] ?? ''
    })
    if (Object.values(rowObj).some((v) => v !== '')) rows.push(rowObj)
  }

  return { sheetName: 'CSV Data', headers, rows }
}

/** Verify columns and import leads with anti-duplicate protection. */
export async function importLeadsFromSpreadsheet(
  user: SessionUser,
  buffer: Buffer,
  filename: string,
): Promise<ImportSpreadsheetResult> {
  const isCsv = /\.csv$/i.test(filename)
  const parsed = isCsv ? parseCsv(buffer.toString('utf8')) : await parseXlsx(buffer)

  // Column verification
  const headerKeys = parsed.headers
  const nameCol = headerKeys.find((h) => COL_NAME.test(h))
  const phoneCol = headerKeys.find((h) => COL_PHONE.test(h))
  const whatsappCol = headerKeys.find((h) => COL_WHATSAPP.test(h))
  const cityCol = headerKeys.find((h) => COL_CITY.test(h))
  const deptCol = headerKeys.find((h) => COL_DEPT.test(h))
  const sourceCol = headerKeys.find((h) => COL_SOURCE.test(h))
  const campaignCol = headerKeys.find((h) => COL_CAMPAIGN.test(h))
  const kwCol = headerKeys.find((h) => COL_KW.test(h))
  const dateCol = headerKeys.find((h) => COL_DATE.test(h))

  if (!nameCol || !phoneCol) {
    const foundList = headerKeys.filter(Boolean).join(', ') || 'none'
    throw new UserError(
      `Missing required columns in tab "${parsed.sheetName}". Required: "Customer" (or "Name") and "Phone" (or "Mobile"). Found columns: [${foundList}].`,
    )
  }

  // Determine user's fallback department
  let defaultDepartment: Department = 'INSTALLATION'
  if (user.departmentId) {
    const d = await DepartmentModel.findById(user.departmentId).lean()
    if (d?.code) defaultDepartment = d.code as Department
  }

  let created = 0
  let duplicates = 0
  let invalid = 0

  for (const row of parsed.rows) {
    const rawName = row[nameCol]?.trim()
    const rawPhone = row[phoneCol]?.trim()
    if (!rawName || !rawPhone) {
      invalid++
      continue
    }

    const normPhone = normalizePhone(rawPhone)
    if (!normPhone) {
      invalid++
      continue
    }

    // Parse department
    let rowDept: Department = defaultDepartment
    if (deptCol && row[deptCol]) {
      const dVal = row[deptCol].trim().toLowerCase()
      if (dVal.includes('trad')) rowDept = 'TRADING'
      else if (dVal.includes('install')) rowDept = 'INSTALLATION'
    }

    // Parse channel
    const channel: LeadChannel = 'csv_import'

    // Parse system size
    const kwVal = kwCol ? parseFloat(row[kwCol].replace(/[^0-9.]/g, '')) : NaN

    // Parse received date
    let receivedAt = new Date()
    if (dateCol && row[dateCol]) {
      const parsedDate = new Date(row[dateCol].trim())
      if (!isNaN(parsedDate.getTime())) receivedAt = parsedDate
    }

    const input: IngestInput = {
      name: rawName,
      phone: normPhone,
      whatsapp: whatsappCol && row[whatsappCol] ? normalizePhone(row[whatsappCol]) || undefined : undefined,
      city: cityCol && row[cityCol] ? row[cityCol].trim() : undefined,
      department: rowDept,
      channel,
      source: {
        campaignName: campaignCol && row[campaignCol] ? row[campaignCol].trim() : (sourceCol && row[sourceCol] ? row[sourceCol].trim() : `Import: ${filename}`),
        formName: `Tab: ${parsed.sheetName}`,
        submittedAt: receivedAt,
      },
      site: !isNaN(kwVal) && kwVal > 0 ? { targetKw: kwVal } : undefined,
      actorId: user.id,
      receivedAt,
      quiet: true, // Don't trigger mass SMS/Push alerts for historic lead imports
    }

    const result = await ingestLead(input)
    if (result.status === 'created') {
      created++
    } else if (result.status === 'reinquiry' || result.status === 'duplicate_row') {
      duplicates++
    } else {
      invalid++
    }
  }

  return {
    sheetName: parsed.sheetName,
    totalRows: parsed.rows.length,
    created,
    duplicates,
    invalid,
  }
}
