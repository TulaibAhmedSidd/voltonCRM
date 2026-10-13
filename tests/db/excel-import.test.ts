/**
 * Leads → Upload Excel / CSV, with a hand-made .xlsx shaped like the client's lead sheet: shared strings, empty cells
 * left out or self-closing, Excel day-number dates, form answers (5_to_15_kw…), repeated "Comment" headers, an Agent
 * column, and ~template rows that only hold formulas. (Made-up names and numbers.)
 */
import mongoose, { type Types } from 'mongoose'
import { afterAll, beforeAll, describe, expect, inject, it, vi } from 'vitest'

vi.mock('react', async (importOriginal) => ({ ...(await importOriginal<typeof import('react')>()), cache: <T,>(fn: T) => fn }))

const { ALL_MODELS, Department, Lead, Team, User } = await import('@/server/db/models')
const { importLeadsFromSpreadsheet, parseCsv, parseImportDate, worksheetRows, columnIndex, fixPhoneText } = await import('@/server/services/excel-import')
const { zip } = await import('@/server/lib/xlsx')
type SessionUser = import('@/server/auth/session').SessionUser

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
/** Build an .xlsx like Google Sheets / Excel save it: workbook → rels (rId5) → sheet1, shared strings. */
function clientLikeXlsx(): Buffer {
  const strings = ['Date', 'campaign', 'KW / System size', 'Install location (form)', 'Install timeline (form)\n', 'Customer Name', ' Phone', 'Agent', 'Follow up 1/2', 'Stage', 'Comment', 'Follow up 2/2', '2nd Stage', 'Lead Status',
    'Solar Oct Campaign', '5_to_15_kw', 'home', 'within_a_month', 'Ali Test', '+923001112233', 'usaid ', 'Answered - Interested', 'wants 10 kW & net metering', 'more_than_40_kw', 'industry', 'within_7_to_15_days', 'Sara Test', 'No Answer', 'Nobody Known', 'New']
  const s = (text: string) => `t="s"><v>${strings.indexOf(text)}</v>`
  const sst = `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="x" count="${strings.length}">${strings.map((t) => `<si><t xml:space="preserve">${esc(t)}</t></si>`).join('')}</sst>`
  const header = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].map((c, i) => `<c r="${c}1" s="1" ${s([strings[0], strings[1], strings[2], strings[3], strings[4], strings[5], strings[6], strings[7], strings[8], strings[9], strings[10], strings[11], strings[12], strings[13]][i])}</c>`).join('')
  const rows = [
    `<row r="1">${header}</row>`,
    // all columns; Lead Status empty (self-closing) in the middle
    `<row r="2"><c r="A2" s="6"><v>46305.0</v></c><c r="B2" ${s('Solar Oct Campaign')}</c><c r="C2" ${s('5_to_15_kw')}</c><c r="D2" ${s('home')}</c><c r="E2" ${s('within_a_month')}</c><c r="F2" ${s('Ali Test')}</c><c r="G2" ${s('+923001112233')}</c><c r="H2" ${s('usaid ')}</c><c r="I2" s="9"><v>46306</v></c><c r="J2" ${s('Answered - Interested')}</c><c r="K2" ${s('wants 10 kW & net metering')}</c><c r="L2" s="9"/><c r="M2" s="10"/><c r="N2" s="11"/></row>`,
    // phone saved as a NUMBER, empty cells simply missing (no B, I-M), unknown agent
    `<row r="3"><c r="A3"><v>46304</v></c><c r="C3" ${s('more_than_40_kw')}</c><c r="D3" ${s('industry')}</c><c r="E3" ${s('within_7_to_15_days')}</c><c r="F3" ${s('Sara Test')}</c><c r="G3"><v>923004445566</v></c><c r="H3" ${s('Nobody Known')}</c><c r="J3" ${s('No Answer')}</c></row>`,
    // a name with a broken phone
    `<row r="4"><c r="F4" ${s('Nobody Known')}</c><c r="G4" t="inlineStr"><is><t>12345</t></is></c></row>`,
    // template rows: only formulas (Lead Status = "New")
    ...Array.from({ length: 5 }, (_, i) => `<row r="${5 + i}"><c r="N${5 + i}" t="str"><f t="shared" si="2"/><v>New</v></c></row>`),
  ]
  const files: [string, string][] = [
    ['[Content_Types].xml', '<Types/>'],
    ['xl/workbook.xml', '<workbook><sheets><sheet state="visible" name="Leads" sheetId="1" r:id="rId5"/></sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<Relationships><Relationship Id="rId1" Type="theme" Target="theme/theme1.xml"/><Relationship Id="rId5" Type="worksheet" Target="worksheets/sheet1.xml"/></Relationships>'],
    ['xl/sharedStrings.xml', sst],
    ['xl/worksheets/sheet1.xml', `<worksheet><sheetData>${rows.join('')}</sheetData></worksheet>`],
  ]
  return zip(files.map(([n, t]) => [n, Buffer.from(t, 'utf8')]))
}

let mgr: SessionUser
let usaid: { _id: Types.ObjectId }

beforeAll(async () => {
  await mongoose.connect(inject('mongoUri'), { dbName: 'volton_excel_import_test' })
  globalThis.__voltonMongoose = Promise.resolve(mongoose)
  await Promise.all(ALL_MODELS.map((m) => m.syncIndexes()))
  const inst = await Department.create({ code: 'INSTALLATION', name: 'Installation', stages: [], routingKeywords: [] })
  await Department.create({ code: 'TRADING', name: 'Trading', stages: [], routingKeywords: [] })
  const m = await User.create({ name: 'Manager M', email: 'm@x.test', role: 'manager', departmentId: inst._id })
  usaid = await User.create({ name: 'Usaid Khan', email: 'u@x.test', role: 'agent', departmentId: inst._id })
  await Team.create({ departmentId: inst._id, managerId: m._id, name: 'Installation', memberOrder: [usaid._id] })
  mgr = { id: String(m._id), name: 'Manager M', email: 'm@x.test', role: 'manager', departmentId: String(inst._id), departmentCode: 'INSTALLATION', managerId: null, mustChangePassword: false } as SessionUser
})

afterAll(async () => {
  await mongoose.connection.db?.dropDatabase()
  await mongoose.disconnect()
})

describe('reading', () => {
  it('puts every value in its real column (missing and self-closing cells), reads Excel dates and number phones', () => {
    expect(columnIndex('A1')).toBe(0)
    expect(columnIndex('AB12')).toBe(27)
    expect(worksheetRows('<row r="1"><c r="A1" s="1"/><c r="C1"><v>x</v></c><c r="B1" t="inlineStr"><is><t>y</t></is></c></row>', [])[0]).toEqual(['', 'y', 'x'])
    expect(parseImportDate('46305.0')?.toISOString()).toBe('2026-10-09T19:00:00.000Z') // 10 Oct 2026, 00:00 Karachi
    expect(parseImportDate('10/3/26')?.getUTCMonth()).toBe(9)
    expect(fixPhoneText('923004445566')).toBe('+923004445566')
    expect(fixPhoneText('3004445566')).toBe('03004445566')
  })
  it('CSV with quotes, commas inside quotes and a repeated header', () => {
    const t = parseCsv('Name,Phone,Comment,Comment\n"Khan, Ali",03001234567,"said ""yes""",later\n')
    expect(t.headers).toEqual(['Name', 'Phone', 'Comment', 'Comment (2)'])
    expect(t.rows[0]).toEqual({ Name: 'Khan, Ali', Phone: '03001234567', Comment: 'said "yes"', 'Comment (2)': 'later' })
  })
})

describe('import', () => {
  it("imports the client's sheet: right agent, form answers, dates, comment; template rows ignored; bad phone reported", async () => {
    const r = await importLeadsFromSpreadsheet(mgr, clientLikeXlsx(), 'Solar_CRM_Leads.xlsx')
    expect(r).toMatchObject({ sheetName: 'Leads', totalRows: 3, created: 2, assigned: 1, duplicates: 0, invalid: 1, emptyRows: 5, invalidRows: [4] })
    expect(r.unknownAgents).toEqual(['Nobody Known'])

    const ali = await Lead.findOne({ 'source.sheetRow': 2 }).lean()
    expect(ali?.receivedAt?.toISOString()).toBe('2026-10-09T19:00:00.000Z')
    expect(ali?.site).toMatchObject({ systemSizeRange: '5_to_15_kw', installLocation: 'home', installTimeline: 'within_a_month' })
    expect(ali?.assignment).toMatchObject({ state: 'accepted' })
    expect(String(ali?.assignment?.agentId)).toBe(String(usaid._id))
    expect(ali?.source).toMatchObject({ channel: 'csv_import', campaignName: 'Solar Oct Campaign', sheetTab: 'Leads' })
    expect(ali?.extra).toMatchObject({ 'Follow up 1/2': '11 Oct 2026', Stage: 'Answered - Interested', 'Agent (file)': 'usaid' })

    const sara = await Lead.findOne({ 'source.sheetRow': 3 }).lean()
    expect(sara?.site).toMatchObject({ systemSizeRange: 'more_than_40_kw', installLocation: 'industry' })
    expect(sara?.assignment?.agentId ?? null).toBeNull() // unknown agent → waits for the manager
  })

  it('uploading the same file again creates nothing', async () => {
    const before = await Lead.countDocuments()
    const again = await importLeadsFromSpreadsheet(mgr, clientLikeXlsx(), 'copy.xlsx')
    expect(again).toMatchObject({ created: 0, duplicates: 2 })
    expect(await Lead.countDocuments()).toBe(before)
  })

  it('a file without a phone column is refused with the columns it found', async () => {
    await expect(importLeadsFromSpreadsheet(mgr, Buffer.from('Name,City\nAli,Karachi\n'), 'x.csv')).rejects.toThrow(/no phone column.*Name, City/)
    await expect(importLeadsFromSpreadsheet(mgr, Buffer.from('not a zip'), 'x.xlsx')).rejects.toThrow(/not a valid Excel/)
  })
})
