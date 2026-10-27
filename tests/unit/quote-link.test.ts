import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const { makeQuoteToken, readQuoteToken } = await import('@/server/lib/quote-link')

const SECRET = 'x'.repeat(40)
const ID = '6aca3bff76d8b0b8e5860554'

describe('customer link to a quotation PDF', () => {
  it('opens the one quotation it was made for, for 30 days', () => {
    const now = Date.now()
    const t = makeQuoteToken(ID, SECRET, 30, now)
    expect(readQuoteToken(t, SECRET, now)).toBe(ID)
    expect(readQuoteToken(t, SECRET, now + 29 * 86_400_000)).toBe(ID)
    expect(readQuoteToken(t, SECRET, now + 31 * 86_400_000)).toBeNull()
  })
  it('cannot be changed to open another quotation, or used with another secret', () => {
    const t = makeQuoteToken(ID, SECRET)
    const [, sig] = t.split('.')
    const other = Buffer.from(`6aca3bff76d8b0b8e5860555.${Math.floor(Date.now() / 1000) + 86_400}`).toString('base64url')
    expect(readQuoteToken(`${other}.${sig}`, SECRET)).toBeNull()
    expect(readQuoteToken(t, 'y'.repeat(40))).toBeNull()
    expect(readQuoteToken('garbage', SECRET)).toBeNull()
  })
})
