/**
 * Turns the role guides in docs/guide/roles/*.md into styled PDFs (same folder) with Playwright and the Edge /
 * Chrome already on the PC — no extra packages. Supports the Markdown the guides use: headings, paragraphs, lists
 * (incl. "- [ ]" checklists), tables, blockquotes, **bold**, *italic*, `code`, links and "---".
 *
 *   node scripts/guides-to-pdf.mjs
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from '@playwright/test'

const DIR = resolve('docs/guide/roles')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) =>
  esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

function toHtml(md) {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out = []
  let i = 0
  const isList = (l) => /^\s*([-*]|\d+\.)\s+/.test(l)
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line)
    if (h) {
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`)
      i++
    } else if (/^---+\s*$/.test(line)) {
      out.push('<hr>')
      i++
    } else if (line.startsWith('>')) {
      const buf = []
      while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, ''))
      out.push(`<blockquote>${buf.map(inline).join('<br>')}</blockquote>`)
    } else if (line.startsWith('|')) {
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++])
      const cells = (r) => r.replace(/^\||\|\s*$/g, '').split('|').map((c) => c.trim())
      const body = rows.filter((r) => !/^\|[\s:|-]+\|?\s*$/.test(r))
      const [head, ...rest] = body
      out.push(`<table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${rest.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`)
    } else if (isList(line)) {
      // nested lists by indentation (2+ spaces = one level)
      const stack = []
      const html = []
      while (i < lines.length && (isList(lines[i]) || (lines[i].startsWith('  ') && lines[i].trim()))) {
        const l = lines[i++]
        if (!isList(l)) {
          html.push(` ${inline(l.trim())}`)
          continue
        }
        const depth = Math.floor(l.match(/^\s*/)[0].length / 2)
        const ordered = /^\s*\d+\./.test(l)
        let text = l.replace(/^\s*([-*]|\d+\.)\s+/, '')
        let cls = ''
        const box = /^\[( |x)\]\s+/.exec(text)
        if (box) {
          text = text.slice(box[0].length)
          cls = ' class="task"'
          text = `<span class="box">${box[1] === 'x' ? '&#10003;' : ''}</span>${inline(text)}`
        } else text = inline(text)
        while (stack.length > depth + 1) html.push(`</li></${stack.pop()}>`)
        if (stack.length === depth + 1) html.push('</li>')
        while (stack.length < depth + 1) {
          const tag = ordered ? 'ol' : 'ul'
          stack.push(tag)
          html.push(`<${tag}>`)
        }
        html.push(`<li${cls}>${text}`)
      }
      while (stack.length) html.push(`</li></${stack.pop()}>`)
      out.push(html.join(''))
    } else {
      const buf = []
      while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|>|\||---)/.test(lines[i]) && !isList(lines[i])) buf.push(lines[i++])
      out.push(`<p>${inline(buf.join(' '))}</p>`)
    }
  }
  return out.join('\n')
}

const CSS = `
@page { size: A4; margin: 16mm 15mm 18mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", Arial, sans-serif; color: #1c2430; font-size: 10.5pt; line-height: 1.5; }
h1 { font-size: 22pt; margin: 0 0 4px; color: #0d2a4a; border-bottom: 4px solid #f2b705; padding-bottom: 8px; }
h2 { font-size: 15pt; color: #0d2a4a; margin: 22px 0 6px; padding: 6px 10px; background: #eef3f9; border-left: 5px solid #f2b705; break-after: avoid; }
h3 { font-size: 12pt; color: #0d2a4a; margin: 14px 0 4px; break-after: avoid; }
h4 { font-size: 11pt; margin: 10px 0 2px; }
p { margin: 4px 0 8px; }
ul, ol { margin: 4px 0 8px; padding-left: 22px; }
li { margin: 2px 0; }
li.task { list-style: none; margin-left: -20px; }
.box { display: inline-block; width: 12px; height: 12px; border: 1.5px solid #0d2a4a; border-radius: 2px; margin-right: 7px; vertical-align: -1px; font-size: 9px; line-height: 10px; text-align: center; }
table { width: 100%; border-collapse: collapse; margin: 6px 0 12px; font-size: 9.5pt; break-inside: auto; }
tr { break-inside: avoid; }
th { background: #0d2a4a; color: #fff; text-align: left; padding: 5px 7px; }
td { border-bottom: 1px solid #d7dee8; padding: 5px 7px; vertical-align: top; }
tbody tr:nth-child(even) td { background: #f6f8fb; }
blockquote { margin: 8px 0 12px; padding: 8px 12px; background: #fff8e1; border-left: 4px solid #f2b705; border-radius: 4px; }
code { background: #eef1f5; padding: 0 4px; border-radius: 3px; font-size: 9.5pt; }
hr { border: 0; border-top: 1px solid #d7dee8; margin: 16px 0; }
a { color: #0b5cad; text-decoration: none; }
`

const browser = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }))
const page = await browser.newPage()
for (const f of readdirSync(DIR).filter((name) => name.endsWith('.md'))) {
  const md = readFileSync(join(DIR, f), 'utf8')
  const title = /^#s+(.*)$/m.exec(md)?.[1] ?? f
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${CSS}</style></head><body>${toHtml(md)}</body></html>`
  if (process.env.KEEP_HTML) writeFileSync(join(DIR, f.replace(/.md$/, '.html')), html)
  await page.setContent(html, { waitUntil: 'load' })
  const pdfPath = join(DIR, f.replace(/.md$/, '.pdf'))
  await page.pdf({ path: pdfPath, format: 'A4', preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: `<div style="width:100%;font-size:8px;color:#888;text-align:center">${esc(title)} · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>` })
  console.log('made', pdfPath)
}
await browser.close()
