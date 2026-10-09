import { describe, expect, it } from 'vitest'
import { buildXlsx, columnName, crc32 } from '@/server/lib/xlsx'
import { sheetRows, unzip } from '../helpers/unzip'

describe('xlsx writer', () => {
  it('column names and crc32 are right', () => {
    expect([columnName(0), columnName(25), columnName(26), columnName(701)]).toEqual(['A', 'Z', 'AA', 'ZZ'])
    expect(crc32(Buffer.from('hello'))).toBe(0x3610a686)
  })
  it('writes a valid workbook: parts, sheet names, escaped text, numbers, frozen header, filter', () => {
    const file = buildXlsx([
      { name: 'Leads/Report: [Oct]', columns: [{ header: 'Name', width: 20 }, { header: 'Tries' }], rows: [['Ali & <Sons> "x"\u0007', 3], [null, 0]] },
      { name: 'Leads/Report: [Oct]', columns: [{ header: 'Empty' }], rows: [] },
    ])
    expect(file.subarray(0, 2).toString()).toBe('PK')
    const parts = unzip(file)
    expect([...parts.keys()]).toEqual(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml'])
    const wb = parts.get('xl/workbook.xml')!
    expect(wb).toContain('name="Leads Report   Oct"') // forbidden chars removed
    expect(wb).toContain('name="Leads Report   Oct 2"') // duplicate name made unique
    const s1 = parts.get('xl/worksheets/sheet1.xml')!
    expect(sheetRows(s1)).toEqual([['Name', 'Tries'], ['Ali & <Sons> "x"', '3'], ['0']])
    expect(s1).toContain('state="frozen"')
    expect(s1).toContain('<autoFilter ref="A1:B3"/>')
    expect(parts.get('xl/worksheets/sheet2.xml')).not.toContain('autoFilter')
  })
})
