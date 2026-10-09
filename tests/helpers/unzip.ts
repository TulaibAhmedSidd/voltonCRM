import { inflateRawSync } from 'node:zlib'

/** Read every file of a ZIP (local headers, deflate or stored). Test helper for the .xlsx writer. */
export function unzip(buf: Buffer): Map<string, string> {
  const out = new Map<string, string>()
  let i = 0
  while (buf.readUInt32LE(i) === 0x04034b50) {
    const method = buf.readUInt16LE(i + 8)
    const size = buf.readUInt32LE(i + 18)
    const nameLen = buf.readUInt16LE(i + 26)
    const extraLen = buf.readUInt16LE(i + 28)
    const name = buf.subarray(i + 30, i + 30 + nameLen).toString('utf8')
    const start = i + 30 + nameLen + extraLen
    const data = buf.subarray(start, start + size)
    out.set(name, (method === 8 ? inflateRawSync(data) : data).toString('utf8'))
    i = start + size
  }
  return out
}

/** Cell texts of one worksheet XML, row by row. */
export function sheetRows(xml: string): string[][] {
  return [...xml.matchAll(/<row r="\d+">(.*?)<\/row>/g)].map((r) =>
    [...r[1].matchAll(/<c r="[A-Z]+\d+"[^>]*>(?:<is><t[^>]*>(.*?)<\/t><\/is>|<v>(.*?)<\/v>)<\/c>/g)].map((c) =>
      (c[1] ?? c[2] ?? '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
    ),
  )
}
