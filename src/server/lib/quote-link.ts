import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Customer link to a quotation PDF (no sign-in): /api/quotations/share/<token>. The token names one quotation and an
 * expiry, signed with AUTH_SECRET, so it cannot be guessed or changed to open another quotation.
 */
const b64 = (v: string | Buffer) => Buffer.from(v).toString('base64url')
const sign = (part: string, secret: string) => b64(createHmac('sha256', `quote-link:${secret}`).update(part).digest()).slice(0, 32)

export const QUOTE_LINK_DAYS = 30

export function makeQuoteToken(quotationId: string, secret: string, days = QUOTE_LINK_DAYS, now = Date.now()): string {
  const part = b64(`${quotationId}.${Math.floor(now / 1000) + days * 86_400}`)
  return `${part}.${sign(part, secret)}`
}

/** The quotation id, or null when the link is broken, changed or expired. */
export function readQuoteToken(token: string, secret: string, now = Date.now()): string | null {
  const [part, sig] = String(token).split('.')
  if (!part || !sig) return null
  const expected = Buffer.from(sign(part, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  const [id, exp] = Buffer.from(part, 'base64url').toString('utf8').split('.')
  if (!/^[a-f0-9]{24}$/i.test(id ?? '') || !(Number(exp) * 1000 > now)) return null
  return id
}
