/**
 * Number boxes are plain text boxes (type="number" kept a stuck "0" and let people type "031000"). These rules clean
 * what is typed: digits only (plus one "." when decimals are allowed), no leading zeros, a sensible length.
 */

/** Regex for the browser's `pattern` check (whole value). */
export const INTEGER_PATTERN = '\\d+'
export const DECIMAL_PATTERN = '\\d+(\\.\\d+)?'

/**
 * "031,000" → "31000" · "abc12" → "12" · "00.50" → "0.50" · "1.2.3" → "1.23" · "" → "".
 * Keeps a trailing "." while typing ("2." stays "2.") so decimals can be entered.
 */
export function cleanNumberText(raw: string, opts: { decimals?: boolean; maxDigits?: number } = {}): string {
  const maxDigits = opts.maxDigits ?? 12
  let s = String(raw ?? '').replace(opts.decimals ? /[^\d.]/g : /\D/g, '')
  if (opts.decimals) {
    const dot = s.indexOf('.')
    if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '')
    if (s.startsWith('.')) s = `0${s}`
  }
  const [whole = '', frac] = s.split('.')
  const trimmedWhole = whole.replace(/^0+(?=\d)/, '').slice(0, maxDigits)
  return frac === undefined ? trimmedWhole : `${trimmedWhole}.${frac.slice(0, 4)}`
}

/** The number in a cleaned text ("" → 0, "2." → 2). */
export function numberFromText(text: string): number {
  const n = Number.parseFloat(text)
  return Number.isFinite(n) ? n : 0
}

/** How a stored number shows in a box: 0 shows as empty (the placeholder says 0). */
export const textFromNumber = (n: number | null | undefined): string => (n === null || n === undefined || !Number.isFinite(n) || n === 0 ? '' : String(n))

/** Problem with the value for the box, or null. */
export function numberProblem(text: string, opts: { min?: number; max?: number; required?: boolean; label?: string } = {}): string | null {
  const what = opts.label ?? 'This'
  if (!text) return opts.required ? `${what} is required` : null
  const n = numberFromText(text)
  if (opts.min !== undefined && n < opts.min) return `${what} must be at least ${opts.min}`
  if (opts.max !== undefined && n > opts.max) return `${what} must be at most ${opts.max}`
  return null
}
