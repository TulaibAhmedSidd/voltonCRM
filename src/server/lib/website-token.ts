import 'server-only'
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import type { WebsiteAccess } from '@/domain/constants'

/**
 * Short-lived signed pass for "Website admin" (CRM → voltonsolar.com/admin/sso). Format:
 * base64url(JSON payload) + "." + base64url(HMAC-SHA256(WEBSITE_SSO_SECRET, payload part)).
 * The website checks it with the same secret (voltonWithoutnode app/lib/crmAuth.js).
 */
export interface WebsitePass {
  sub: string
  name: string
  email: string
  access: Exclude<WebsiteAccess, 'none'>
  aud: 'voltonsolar-admin'
  iat: number
  exp: number
  jti: string
}

const b64 = (b: Buffer | string) => Buffer.from(b).toString('base64url')
const sign = (part: string, secret: string) => b64(createHmac('sha256', secret).update(part).digest())

export function makeWebsitePass(user: { id: string; name: string; email: string; access: WebsitePass['access'] }, secret: string, ttlSec = 60, now = Date.now()): string {
  const iat = Math.floor(now / 1000)
  const payload: WebsitePass = { sub: user.id, name: user.name, email: user.email, access: user.access, aud: 'voltonsolar-admin', iat, exp: iat + ttlSec, jti: randomUUID() }
  const part = b64(JSON.stringify(payload))
  return `${part}.${sign(part, secret)}`
}

/** For tests and symmetry with the website: null when the signature, audience or time is wrong. */
export function readWebsitePass(token: string, secret: string, now = Date.now()): WebsitePass | null {
  const [part, sig] = token.split('.')
  if (!part || !sig) return null
  const expected = Buffer.from(sign(part, secret))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  try {
    const p = JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as WebsitePass
    return p.aud === 'voltonsolar-admin' && p.exp * 1000 > now ? p : null
  } catch {
    return null
  }
}

/** Server-to-server calls from the website carry "Authorization: Bearer <WEBSITE_SSO_SECRET>". */
export function websiteCallAllowed(authorization: string | null, secret: string | undefined): boolean {
  if (!secret || !authorization?.startsWith('Bearer ')) return false
  const given = Buffer.from(authorization.slice(7))
  const expected = Buffer.from(secret)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
