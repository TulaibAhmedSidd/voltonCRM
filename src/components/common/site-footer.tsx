import Link from 'next/link'
import { COMPANY, LEGAL_LINKS } from '@/domain/company'
import { cn } from '@/lib/utils'

/** Company footer for public pages (sign-in, privacy, data deletion): address, contacts and the legal links. */
export function SiteFooter({ className }: { className?: string }) {
  return (
    <footer className={cn('space-y-2 text-center text-xs text-sidebar-foreground/75', className)}>
      <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        {LEGAL_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center font-medium text-sidebar-foreground underline underline-offset-4">
            {l.label}
          </Link>
        ))}
        <a href={`https://${COMPANY.website}`} className="inline-flex min-h-11 items-center font-medium text-sidebar-foreground underline underline-offset-4" target="_blank" rel="noreferrer">
          {COMPANY.website}
        </a>
      </nav>
      <p>
        {COMPANY.legalName} · {COMPANY.address}
      </p>
      <p>
        <a href={`tel:${COMPANY.whatsapp}`} className="underline-offset-4 hover:underline">
          {COMPANY.phone}
        </a>{' '}
        ·{' '}
        <a href={`mailto:${COMPANY.email}`} className="underline-offset-4 hover:underline">
          {COMPANY.email}
        </a>
      </p>
      <p>
        © {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.
      </p>
    </footer>
  )
}
