import 'server-only'
import mongoose, { type Connection } from 'mongoose'
import { getServerEnv } from '@/lib/env'
import type { CatalogItem, WebsiteCatalog } from '@/domain/website'

/**
 * The main website (voltonsolar.com) keeps its own MongoDB: products, brands, categories. The CRM only READS it
 * (quotation builder dropdowns), so products added in the website admin show up here without copying anything.
 */
declare global {
  var __voltonWebsiteDb: Promise<Connection> | undefined
}

function websiteDb(): Promise<Connection> | null {
  const uri = getServerEnv().MAIN_SITE_MONGODB_URI
  if (!uri) return null
  if (!globalThis.__voltonWebsiteDb) {
    globalThis.__voltonWebsiteDb = mongoose
      .createConnection(uri, { maxPoolSize: 3, maxIdleTimeMS: 5_000, serverSelectionTimeoutMS: 8_000, readPreference: 'secondaryPreferred' })
      .asPromise()
      .catch((error: unknown) => {
        globalThis.__voltonWebsiteDb = undefined
        throw error
      })
  }
  return globalThis.__voltonWebsiteDb
}

interface RawProduct {
  _id: unknown
  name?: string
  brand?: unknown
  category?: unknown
  price?: number
  active?: boolean
  size?: string
  wattage?: number | string | null
  inverterType?: string
  batteryTech?: string
  capacityAh?: number | null
  voltageV?: number | null
  cellType?: string
}

type Kind = keyof WebsiteCatalog['items']

/** Which dropdown a product belongs to: by its category name first, then by the fields only that kind has. */
export function productKind(p: RawProduct, categoryName: string): Kind | null {
  const c = categoryName.toLowerCase()
  if (/invert/.test(c)) return 'inverters'
  if (/batter|lithium|storage/.test(c)) return 'batteries'
  if (/panel|module|solar/.test(c)) return 'panels'
  if (p.inverterType) return 'inverters'
  if (p.batteryTech || p.capacityAh) return 'batteries'
  if (p.cellType || p.wattage) return 'panels'
  return null
}

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? Number.parseFloat(v) : Number.NaN)

export function toCatalogItem(p: RawProduct, brand: string, kind: Kind): CatalogItem {
  const name = (p.name ?? '').trim()
  // "LONGi Hi-MO X10 645W" — add the brand only when the name does not already start with it.
  const label = brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? `${brand} ${name}` : name
  const watt = kind === 'panels' ? num(p.wattage) || num(/(\d{3,4})\s*w/i.exec(name)?.[1]) : Number.NaN
  return { id: String(p._id), label, price: Math.max(0, Math.round(num(p.price) || 0)), ...(Number.isFinite(watt) && watt > 0 ? { watt } : {}) }
}

let cache: { at: number; value: WebsiteCatalog } | null = null
const FRESH_MS = 5 * 60_000

/** Test hook: forget the cached list. */
export const resetWebsiteCatalogCache = () => {
  cache = null
}

/**
 * Active website products grouped for the quotation builder. Cached for 5 minutes. Never throws — when the website
 * database is not set up or cannot be reached, `ok` is false and the builder falls back to its own suggestions.
 */
export async function websiteCatalog(timeoutMs = 3_000): Promise<WebsiteCatalog> {
  if (cache && Date.now() - cache.at < FRESH_MS) return cache.value
  const empty: WebsiteCatalog = { ok: false, items: { panels: [], inverters: [], batteries: [] } }
  // The lead page waits for this — never longer than timeoutMs (the old list / suggestions are used instead).
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<WebsiteCatalog>((resolve) => {
    timer = setTimeout(() => resolve(cache?.value ?? empty), timeoutMs)
  })
  return Promise.race([loadCatalog(empty), late]).finally(() => clearTimeout(timer))
}

async function loadCatalog(empty: WebsiteCatalog): Promise<WebsiteCatalog> {
  const pending = websiteDb()
  if (!pending) return empty
  try {
    const db = (await pending).db!
    const [products, brands, categories] = await Promise.all([
      db.collection<RawProduct>('products').find({ active: { $ne: false } }).sort({ name: 1 }).limit(500).toArray(),
      db.collection<{ _id: unknown; name?: string }>('brands').find({}, { projection: { name: 1 } }).toArray(),
      db.collection<{ _id: unknown; name?: string }>('categories').find({}, { projection: { name: 1 } }).toArray(),
    ])
    const brandName = new Map(brands.map((b) => [String(b._id), b.name ?? '']))
    const categoryName = new Map(categories.map((c) => [String(c._id), c.name ?? '']))
    const value: WebsiteCatalog = { ok: true, items: { panels: [], inverters: [], batteries: [] } }
    for (const p of products) {
      if (!p.name?.trim()) continue
      const kind = productKind(p, categoryName.get(String(p.category)) ?? '')
      if (kind) value.items[kind].push(toCatalogItem(p, brandName.get(String(p.brand)) ?? '', kind))
    }
    cache = { at: Date.now(), value }
    return value
  } catch (error) {
    console.error('[website catalog]', error)
    return cache?.value ?? empty
  }
}
