import 'server-only'
import { deflateSync, inflateSync } from 'node:zlib'

/**
 * Minimal PDF writer (no dependency) for A4 documents: text (Helvetica / Helvetica-Bold / Helvetica-Oblique /
 * Times-Italic), filled rectangles, lines and PNG images (with transparency).
 * Coordinates are from the TOP-LEFT of the page in points (1 pt = 1/72 inch). Text is WinAnsi (English).
 */
export const A4 = { width: 595.28, height: 841.89 }
export type FontName = 'regular' | 'bold' | 'italic' | 'sign'
const FONT_KEY: Record<FontName, string> = { regular: 'F1', bold: 'F2', italic: 'F3', sign: 'F4' }
const BASE_FONT: Record<FontName, string> = { regular: 'Helvetica', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique', sign: 'Times-Italic' }

// Standard 14 font widths (1/1000 em) for character codes 32..126.
const HELV = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584]
const HELV_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584]

/** Unicode → WinAnsi byte. Anything else becomes "?". */
const WIN_ANSI: Record<string, number> = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '•': 0x95, '–': 0x96, '—': 0x97, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '™': 0x99 }
function encode(text: string): number[] {
  const out: number[] = []
  for (const ch of text.normalize('NFC')) {
    const c = ch.codePointAt(0)!
    if (c >= 32 && c <= 126) out.push(c)
    else if (WIN_ANSI[ch]) out.push(WIN_ANSI[ch])
    else if (c >= 160 && c <= 255) out.push(c)
    else if (ch === '\n' || ch === '\t') out.push(32)
    else out.push(63)
  }
  return out
}

function charWidth(code: number, font: FontName): number {
  const table = font === 'bold' ? HELV_BOLD : HELV
  if (code >= 32 && code <= 126) return table[code - 32] * (font === 'sign' ? 0.92 : 1)
  if (code === 0x97 || code === 0x85) return 1000
  if (code === 0x96) return 556
  if (code === 0x95) return 350
  return 556
}

export function textWidth(text: string, font: FontName, size: number): number {
  return (encode(text).reduce((n, c) => n + charWidth(c, font), 0) * size) / 1000
}

/** Word-wrap to a width; very long words are split. */
export function wrap(text: string, font: FontName, size: number, maxWidth: number): string[] {
  const out: string[] = []
  for (const para of text.split(/\r?\n/)) {
    let line = ''
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word
      if (textWidth(next, font, size) <= maxWidth) {
        line = next
        continue
      }
      if (line) out.push(line)
      let w = word
      while (textWidth(w, font, size) > maxWidth && w.length > 1) {
        let cut = w.length - 1
        while (cut > 1 && textWidth(w.slice(0, cut), font, size) > maxWidth) cut--
        out.push(w.slice(0, cut))
        w = w.slice(cut)
      }
      line = w
    }
    out.push(line)
  }
  return out
}

export type RGB = [number, number, number]
export const hex = (h: string): RGB => {
  const v = h.replace('#', '')
  return [parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255]
}
const n2 = (n: number) => (Math.round(n * 100) / 100).toString()
const rgb = (c: RGB) => c.map((v) => n2(v)).join(' ')

interface PdfImage {
  width: number
  height: number
  rgb: Buffer // deflated
  alpha: Buffer | null // deflated
}

/** Decode an 8-bit RGB / RGBA, non-interlaced PNG into deflated RGB + alpha planes for the PDF. */
export function decodePng(png: Buffer): PdfImage {
  if (png.readUInt32BE(0) !== 0x89504e47) throw new Error('Not a PNG')
  let i = 8
  let width = 0
  let height = 0
  let colorType = 0
  const idat: Buffer[] = []
  while (i < png.length) {
    const len = png.readUInt32BE(i)
    const type = png.toString('latin1', i + 4, i + 8)
    const data = png.subarray(i + 8, i + 8 + len)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      if (data[8] !== 8 || data[12] !== 0) throw new Error('Only 8-bit, non-interlaced PNG')
      colorType = data[9]
    } else if (type === 'IDAT') idat.push(data)
    else if (type === 'IEND') break
    i += 12 + len
  }
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : 0
  if (!channels) throw new Error('Only RGB / RGBA PNG')
  const raw = inflateSync(Buffer.concat(idat))
  const stride = width * channels
  const pixels = Buffer.alloc(stride * height)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const out = pixels.subarray(y * stride, (y + 1) * stride)
    const prev = y ? pixels.subarray((y - 1) * stride, y * stride) : null
    for (let x = 0; x < stride; x++) {
      const a = x >= channels ? out[x - channels] : 0
      const b = prev ? prev[x] : 0
      const c = prev && x >= channels ? prev[x - channels] : 0
      let v = line[x]
      if (filter === 1) v += a
      else if (filter === 2) v += b
      else if (filter === 3) v += Math.floor((a + b) / 2)
      else if (filter === 4) {
        const p = a + b - c
        const pa = Math.abs(p - a)
        const pb = Math.abs(p - b)
        const pc = Math.abs(p - c)
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c
      }
      out[x] = v & 0xff
    }
  }
  const rgbBuf = Buffer.alloc(width * height * 3)
  const alphaBuf = channels === 4 ? Buffer.alloc(width * height) : null
  for (let p = 0; p < width * height; p++) {
    rgbBuf[p * 3] = pixels[p * channels]
    rgbBuf[p * 3 + 1] = pixels[p * channels + 1]
    rgbBuf[p * 3 + 2] = pixels[p * channels + 2]
    if (alphaBuf) alphaBuf[p] = pixels[p * channels + 3]
  }
  return { width, height, rgb: deflateSync(rgbBuf), alpha: alphaBuf ? deflateSync(alphaBuf) : null }
}

export class PdfDocument {
  private pages: string[][] = []
  private images = new Map<string, PdfImage>()
  private info: Record<string, string>

  constructor(info: { title: string; author?: string; subject?: string } = { title: 'Document' }) {
    this.info = { Title: info.title, Author: info.author ?? '', Subject: info.subject ?? '', Producer: 'Volton CRM' }
    this.addPage()
  }

  get pageCount() {
    return this.pages.length
  }
  private cursor = -1
  private get ops() {
    return this.pages[this.cursor]
  }
  /** Draw on an earlier page (e.g. "Page 1 of 3" footers at the end). */
  onPage<T>(index: number, fn: () => T): T {
    const saved = this.cursor
    this.cursor = index
    try {
      return fn()
    } finally {
      this.cursor = saved
    }
  }

  addPage() {
    this.pages.push([])
    this.cursor = this.pages.length - 1
  }

  registerImage(name: string, image: PdfImage) {
    this.images.set(name, image)
  }

  text(str: string, x: number, y: number, opts: { font?: FontName; size?: number; color?: RGB; align?: 'left' | 'right' | 'center' } = {}) {
    const font = opts.font ?? 'regular'
    const size = opts.size ?? 10
    const w = textWidth(str, font, size)
    const left = opts.align === 'right' ? x - w : opts.align === 'center' ? x - w / 2 : x
    const bytes = Buffer.from(encode(str)).toString('hex')
    this.ops.push(`BT /${FONT_KEY[font]} ${n2(size)} Tf ${rgb(opts.color ?? [0.12, 0.16, 0.22])} rg ${n2(left)} ${n2(A4.height - y)} Td <${bytes}> Tj ET`)
  }

  rect(x: number, y: number, w: number, h: number, opts: { fill?: RGB; stroke?: RGB; lineWidth?: number } = {}) {
    const parts = []
    if (opts.fill) parts.push(`${rgb(opts.fill)} rg`)
    if (opts.stroke) parts.push(`${rgb(opts.stroke)} RG ${n2(opts.lineWidth ?? 0.75)} w`)
    parts.push(`${n2(x)} ${n2(A4.height - y - h)} ${n2(w)} ${n2(h)} re ${opts.fill && opts.stroke ? 'B' : opts.fill ? 'f' : 'S'}`)
    this.ops.push(`q ${parts.join(' ')} Q`)
  }

  line(x1: number, y1: number, x2: number, y2: number, opts: { color?: RGB; width?: number } = {}) {
    this.ops.push(`q ${rgb(opts.color ?? [0.8, 0.82, 0.85])} RG ${n2(opts.width ?? 0.75)} w ${n2(x1)} ${n2(A4.height - y1)} m ${n2(x2)} ${n2(A4.height - y2)} l S Q`)
  }

  image(name: string, x: number, y: number, w: number, h: number) {
    if (!this.images.has(name)) throw new Error(`Image ${name} not registered`)
    this.ops.push(`q ${n2(w)} 0 0 ${n2(h)} ${n2(x)} ${n2(A4.height - y - h)} cm /${name} Do Q`)
  }

  /** Serialise to PDF bytes. */
  build(): Buffer {
    const objects: Buffer[] = []
    const add = (body: string | Buffer) => {
      objects.push(typeof body === 'string' ? Buffer.from(body, 'latin1') : body)
      return objects.length
    }
    const stream = (dict: string, data: Buffer) => Buffer.concat([Buffer.from(`<< ${dict} /Length ${data.length} >>\nstream\n`, 'latin1'), data, Buffer.from('\nendstream', 'latin1')])

    const catalogId = add('') // placeholder
    const pagesId = add('')
    const fontIds = (Object.keys(FONT_KEY) as FontName[]).map((f) => [FONT_KEY[f], add(`<< /Type /Font /Subtype /Type1 /BaseFont /${BASE_FONT[f]} /Encoding /WinAnsiEncoding >>`)] as const)
    const imageIds: [string, number][] = []
    for (const [name, img] of this.images) {
      const smask = img.alpha ? add(stream(`/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, img.alpha)) : null
      imageIds.push([name, add(stream(`/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode${smask ? ` /SMask ${smask} 0 R` : ''}`, img.rgb))])
    }
    const resources = `<< /Font << ${fontIds.map(([k, id]) => `/${k} ${id} 0 R`).join(' ')} >> /XObject << ${imageIds.map(([k, id]) => `/${k} ${id} 0 R`).join(' ')} >> >>`
    const pageIds = this.pages.map((ops) => {
      const content = add(stream('/Filter /FlateDecode', deflateSync(Buffer.from(ops.join('\n'), 'latin1'))))
      return add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${A4.width} ${A4.height}] /Resources ${resources} /Contents ${content} 0 R >>`)
    })
    objects[pagesId - 1] = Buffer.from(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`, 'latin1')
    objects[catalogId - 1] = Buffer.from(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`, 'latin1')
    const pdfString = (s: string) => `<${Buffer.from([0xfe, 0xff, ...Buffer.from(s, 'utf16le').swap16()]).toString('hex')}>`
    const infoId = add(`<< ${Object.entries(this.info).map(([k, v]) => `/${k} ${pdfString(v)}`).join(' ')} >>`)

    const chunks: Buffer[] = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'latin1')]
    const offsets: number[] = []
    let pos = chunks[0].length
    objects.forEach((body, idx) => {
      offsets.push(pos)
      const head = Buffer.from(`${idx + 1} 0 obj\n`, 'latin1')
      const tail = Buffer.from('\nendobj\n', 'latin1')
      chunks.push(head, body, tail)
      pos += head.length + body.length + tail.length
    })
    const xref = [`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)].join('')
    chunks.push(Buffer.from(`${xref}trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${pos}\n%%EOF\n`, 'latin1'))
    return Buffer.concat(chunks)
  }
}
