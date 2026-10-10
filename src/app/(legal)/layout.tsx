import Link from 'next/link'
import { BrandLogo } from '@/components/common/brand-logo'
import { SiteFooter } from '@/components/common/site-footer'

/** Public legal pages (no login): Privacy policy, Data deletion. Linked from Meta app settings and every footer. */
export default function LegalLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="bg-sidebar">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Link href="/" aria-label="Volton Solar CRM home">
            <BrandLogo height={40} priority />
          </Link>
          <Link href="/login" className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-sidebar-foreground ring-1 ring-sidebar-foreground/30 hover:bg-sidebar-accent">
            Staff sign in
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <article className="space-y-4 rounded-2xl bg-card p-6 text-sm leading-6 text-card-foreground shadow-sm ring-1 ring-foreground/10 md:p-10 [&_h1]:font-heading [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:pt-4 [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:ms-5 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:space-y-1 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4">
          {children}
        </article>
      </main>
      <div className="bg-sidebar px-4 py-6">
        <SiteFooter />
      </div>
    </div>
  )
}
