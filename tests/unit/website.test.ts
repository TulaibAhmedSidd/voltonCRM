import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

const { defaultWebsiteAccess, websiteAccessEditable, websiteAccessOf, WEBSITE_ACCESS_SINCE } = await import('@/domain/website')
const { makeWebsitePass, readWebsitePass, websiteCallAllowed } = await import('@/server/lib/website-token')
const { productKind, toCatalogItem } = await import('@/server/services/website')

const SECRET = 'x'.repeat(40)
const after = new Date(WEBSITE_ACCESS_SINCE.getTime() + 86_400_000)
const before = new Date(WEBSITE_ACCESS_SINCE.getTime() - 86_400_000)

describe('website access', () => {
  it('managers and above are website admins; people already in the CRM are admins; new call agents / marketing are editors', () => {
    expect(defaultWebsiteAccess('manager', null, after)).toBe('admin')
    expect(defaultWebsiteAccess('super_admin')).toBe('admin')
    expect(defaultWebsiteAccess('field_agent', null, before)).toBe('admin')
    expect(defaultWebsiteAccess('agent', null, after)).toBe('editor')
    expect(defaultWebsiteAccess('staff', 'Marketing lead', after)).toBe('editor')
    expect(defaultWebsiteAccess('field_agent', null, after)).toBe('none')
    expect(defaultWebsiteAccess('staff', 'Installer', after)).toBe('none')
  })
  it("a manager's choice wins over the default; managers cannot change admins", () => {
    expect(websiteAccessOf({ role: 'manager', websiteAccess: 'none' })).toBe('none')
    expect(websiteAccessOf({ role: 'field_agent', createdAt: after, websiteAccess: 'editor' })).toBe('editor')
    expect(websiteAccessEditable('manager')).not.toContain('admin')
    expect(websiteAccessEditable('manager')).not.toContain('manager')
    expect(websiteAccessEditable('agent')).toEqual([])
  })
})

describe('website sign-in pass', () => {
  it('round-trips, and rejects a wrong secret, a changed payload and an expired pass', () => {
    const now = Date.now()
    const pass = makeWebsitePass({ id: 'u1', name: 'Ifran', email: 'i@v.test', access: 'editor' }, SECRET, 60, now)
    expect(readWebsitePass(pass, SECRET, now)).toMatchObject({ sub: 'u1', access: 'editor', aud: 'voltonsolar-admin' })
    expect(readWebsitePass(pass, 'y'.repeat(40), now)).toBeNull()
    const [, sig] = pass.split('.')
    const forged = `${Buffer.from(JSON.stringify({ sub: 'u1', access: 'admin', aud: 'voltonsolar-admin', exp: 9e9 })).toString('base64url')}.${sig}`
    expect(readWebsitePass(forged, SECRET, now)).toBeNull()
    expect(readWebsitePass(pass, SECRET, now + 61_000)).toBeNull()
  })
  it('server-to-server calls need the exact shared secret', () => {
    expect(websiteCallAllowed(`Bearer ${SECRET}`, SECRET)).toBe(true)
    expect(websiteCallAllowed(`Bearer ${SECRET}x`, SECRET)).toBe(false)
    expect(websiteCallAllowed(null, SECRET)).toBe(false)
    expect(websiteCallAllowed(`Bearer ${SECRET}`, undefined)).toBe(false)
  })
})

describe('website products → quotation dropdowns', () => {
  it('sorts by category name, else by the fields only that kind has', () => {
    expect(productKind({ _id: 1 }, 'Inverters')).toBe('inverters')
    expect(productKind({ _id: 1 }, 'Batteries')).toBe('batteries')
    expect(productKind({ _id: 1 }, 'Solar Panels')).toBe('panels')
    expect(productKind({ _id: 1, inverterType: 'Hybrid' }, '')).toBe('inverters')
    expect(productKind({ _id: 1, capacityAh: 100 }, '')).toBe('batteries')
    expect(productKind({ _id: 1 }, 'Accessories')).toBeNull()
  })
  it('adds the brand once and reads the panel watt', () => {
    expect(toCatalogItem({ _id: 'p1', name: 'Hi-MO X10 645W', price: 24500 }, 'LONGi', 'panels')).toEqual({ id: 'p1', label: 'LONGi Hi-MO X10 645W', price: 24500, watt: 645 })
    expect(toCatalogItem({ _id: 'i1', name: 'GoodWe 12kW SP', price: 365000.4 }, 'GoodWe', 'inverters')).toEqual({ id: 'i1', label: 'GoodWe 12kW SP', price: 365000 })
    expect(toCatalogItem({ _id: 'p2', name: 'Tiger Neo', wattage: 585, price: 0 }, 'Jinko', 'panels')).toMatchObject({ label: 'Jinko Tiger Neo', watt: 585, price: 0 })
  })
})
