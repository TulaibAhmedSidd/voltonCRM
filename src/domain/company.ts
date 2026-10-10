/** Volton Solar company details — one place for the PDF quotation, the footer and the legal pages. */
export const COMPANY = {
  name: 'VOLTON SOLAR',
  legalName: 'Volton Solar',
  tagline: 'Solar planning, products and execution under one roof',
  address: 'Suite #6, A-137 Block 5, Gulshan-e-Iqbal, Karachi, Pakistan',
  phone: '+92 303 2115055',
  whatsapp: '+923032115055',
  email: 'voltonsolarenergy@gmail.com',
  /** Shown on quotations sent to customers. */
  quoteEmail: 'info@voltonsolar.com',
  website: 'voltonsolar.com',
} as const

/** Public legal pages (no login). Give these links to Meta: App settings → Basic. */
export const LEGAL_LINKS = [
  { href: '/privacy', label: 'Privacy policy' },
  { href: '/data-deletion', label: 'Data deletion' },
] as const
