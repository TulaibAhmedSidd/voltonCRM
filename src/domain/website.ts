/**
 * The main website (voltonsolar.com) and the CRM share products and logins. Pure types / rules only.
 */
import type { Role, WebsiteAccess } from '@/domain/constants'
import { en } from '@/i18n/en'

export { WEBSITE_ACCESS, type WebsiteAccess } from '@/domain/constants'

/** A website product as offered in the quotation builder dropdowns. */
export interface CatalogItem {
  id: string
  /** "Brand Model", shown in the dropdown and written into the quotation. */
  label: string
  /** Website price in Rs (0 = not set). */
  price: number
  /** Panels only: watt per panel. */
  watt?: number
}

export interface WebsiteCatalog {
  /** false = the website database is not connected or could not be read (the builder uses its own suggestions). */
  ok: boolean
  items: { panels: CatalogItem[]; inverters: CatalogItem[]; batteries: CatalogItem[] }
}

/**
 * What a CRM user may do in the website admin.
 * admin = everything (products, prices, plans, content, settings) · editor = content and products, not settings ·
 * none = no website access.
 */
export const WEBSITE_ACCESS_LABEL: Record<WebsiteAccess, string> = en.websiteAccess
export const WEBSITE_ACCESS_HINT: Record<WebsiteAccess, string> = {
  admin: 'Can change everything on voltonsolar.com: products, prices, plans, content and settings.',
  editor: 'Can change content and products on voltonsolar.com, not the settings.',
  none: 'Cannot open the website admin.',
}

/** Everyone already in the CRM before the website was connected is a website admin (owner's decision). */
export const WEBSITE_ACCESS_SINCE = new Date('2026-10-11T00:00:00+05:00')

/**
 * Default when nobody chose for the person: people who were in the CRM before the website was connected are
 * website admins. After that: managers and above → admin; call agents and anyone whose job title mentions
 * marketing → editor; everyone else → no access.
 */
export function defaultWebsiteAccess(role: Role, jobTitle?: string | null, createdAt?: Date | string | null): WebsiteAccess {
  if (role === 'super_admin' || role === 'admin' || role === 'manager') return 'admin'
  if (createdAt && new Date(createdAt) < WEBSITE_ACCESS_SINCE) return 'admin'
  if (role === 'agent' || /market/i.test(jobTitle ?? '')) return 'editor'
  return 'none'
}

/** Whose website access the viewer may change (never their own). */
export function websiteAccessEditable(viewer: Role): Role[] {
  if (viewer === 'super_admin') return ['admin', 'manager', 'agent', 'field_agent', 'staff']
  if (viewer === 'admin') return ['manager', 'agent', 'field_agent', 'staff']
  if (viewer === 'manager') return ['agent', 'field_agent', 'staff']
  return []
}

export function websiteAccessOf(user: { role: Role; jobTitle?: string | null; createdAt?: Date | string | null; websiteAccess?: WebsiteAccess | null }): WebsiteAccess {
  return user.websiteAccess ?? defaultWebsiteAccess(user.role, user.jobTitle, user.createdAt)
}
