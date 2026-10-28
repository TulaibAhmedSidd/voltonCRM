import Link from 'next/link'
import { Download, ExternalLink, FileText, Search } from 'lucide-react'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { NewQuotationDialog } from '@/components/crm/new-quotation-dialog'
import { websiteCatalog } from '@/server/services/website'
import { QuotationStatusSelect } from '@/components/crm/quotation-status-select'
import { QuotationWhatsAppButton } from '@/components/crm/quotation-whatsapp-button'
import { QuotationManagerButton } from '@/components/crm/quotation-manager-button'
import { SavedQuotationList } from '@/components/crm/saved-quotation-list'
import { requireUser } from '@/server/auth/session'
import { listCentralQuotations } from '@/server/services/quotations'
import { countSavedQuotations, savedQuotationsPage } from '@/server/services/saved-quotations'
import { listLeads } from '@/server/services/queries'
import { formatRs } from '@/domain/quotation'
import { formatPhone } from '@/lib/phone'
import { formatPktDateTime } from '@/lib/dates-pkt'
import { QUOTATION_STATUSES, type QuotationStatus } from '@/domain/constants'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Quotation Builder' }

export default async function QuotationsPage(props: PageProps<'/quotations'>) {
  const user = await requireUser()
  const sp = await props.searchParams
  const q = typeof sp.q === 'string' ? sp.q : undefined
  const status = typeof sp.status === 'string' && QUOTATION_STATUSES.includes(sp.status as QuotationStatus)
    ? (sp.status as QuotationStatus)
    : undefined
  const page = typeof sp.page === 'string' ? Math.max(1, parseInt(sp.page, 10) || 1) : 1
  const view = sp.view === 'saved' ? 'saved' : undefined

  const [{ rows, total }, openLeadsRes, catalog, saved, savedCount] = await Promise.all([
    view ? Promise.resolve({ rows: [], total: 0 }) : listCentralQuotations(user, { q, status, page }),
    listLeads(user, { view: user.role === 'agent' ? 'mine' : 'all' }),
    websiteCatalog(),
    view ? savedQuotationsPage(user, { q, page }) : null,
    countSavedQuotations(user),
  ])

  const leadOptions = openLeadsRes.rows.map((l) => ({
    id: l.id,
    leadNo: l.leadNo,
    customerName: l.name,
    customerPhone: l.phone,
  }))

  const buildUrl = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    if (view) params.set('view', view)
    if (q) params.set('q', q)
    if (status) params.set('status', status)
    if (page > 1) params.set('page', String(page))

    for (const [key, val] of Object.entries(updates)) {
      if (val === undefined || val === '') {
        params.delete(key)
      } else {
        params.set(key, val)
      }
    }
    const qs = params.toString()
    return `/quotations${qs ? `?${qs}` : ''}`
  }

  const statusFilters: { label: string; value?: QuotationStatus }[] = [
    { label: 'All Quotations', value: undefined },
    { label: 'Draft', value: 'draft' },
    { label: 'Sent', value: 'sent' },
    { label: 'Accepted', value: 'accepted' },
    { label: 'Rejected', value: 'rejected' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          title="Quotation Builder"
          description="Create, preview, and track customer quotations with live pricing and WhatsApp sharing."
        />
        <div className="shrink-0">
          <NewQuotationDialog leadsList={leadOptions} catalog={catalog} />
        </div>
      </div>

      <nav aria-label="Quotation views" className="flex flex-wrap gap-2">
        {[
          { label: 'Quotations', value: undefined },
          { label: `Saved quotations (${savedCount})`, value: 'saved' },
        ].map((tab) => (
          <Link
            key={tab.label}
            href={buildUrl({ view: tab.value, status: undefined, page: undefined, q: undefined })}
            aria-current={tab.value === view ? 'page' : undefined}
            className={cn(
              'inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium transition-colors',
              tab.value === view ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80',
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {saved ? (
        <SectionCard
          title="Saved quotations"
          description="Every quotation made is saved here without the customer, so the same setup is quick next time. To use one: New Quotation (or the Quotation tab on a lead) → Start from a saved quotation."
        >
          <div className="space-y-4">
            <form method="GET" action="/quotations" className="relative w-full max-w-xs">
              <input type="hidden" name="view" value="saved" />
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <input
                type="search"
                name="q"
                defaultValue={q ?? ''}
                placeholder="Search name, made by, quotation #…"
                className="h-11 w-full rounded-lg border border-input bg-card ps-9 pe-3 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
            </form>
            <p className="text-xs text-muted-foreground">
              Showing {saved.rows.length} of {saved.total} saved quotation{saved.total === 1 ? '' : 's'}
            </p>
            {saved.rows.length === 0 ? (
              <EmptyState
                title="No saved quotations yet"
                description={q ? 'Nothing matches your search.' : 'Make a quotation (or press “Save this setup” in the quotation form) and it shows up here.'}
              />
            ) : (
              <SavedQuotationList rows={saved.rows} />
            )}
            {saved.total > saved.pageSize ? (
              <div className="flex items-center justify-between pt-2 text-xs">
                <Button asChild variant="outline" size="touch" disabled={page <= 1}>
                  <Link href={buildUrl({ page: String(Math.max(1, page - 1)) })}>Previous</Link>
                </Button>
                <span className="text-muted-foreground">
                  Page {page} of {Math.ceil(saved.total / saved.pageSize)}
                </span>
                <Button asChild variant="outline" size="touch" disabled={page >= Math.ceil(saved.total / saved.pageSize)}>
                  <Link href={buildUrl({ page: String(page + 1) })}>Next</Link>
                </Button>
              </div>
            ) : null}
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Quotation Records">
          {/* Search & Filter Toolbar */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Status pills */}
              <div className="flex flex-wrap gap-1.5">
                {statusFilters.map((tab) => {
                  const isActive = (tab.value === undefined && !status) || tab.value === status
                  return (
                    <Link
                      key={tab.label}
                      href={buildUrl({ status: tab.value, page: undefined })}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {tab.label}
                    </Link>
                  )
                })}
              </div>
  
              {/* Search Input */}
              <form method="GET" action="/quotations" className="relative w-full max-w-xs">
                {status && <input type="hidden" name="status" value={status} />}
                <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <input
                  type="search"
                  name="q"
                  defaultValue={q ?? ''}
                  placeholder="Search quotations, customers…"
                  className="h-9 w-full rounded-lg border border-input bg-card ps-9 pe-3 text-sm outline-none focus:ring-1 focus:ring-primary"
                />
              </form>
            </div>
  
            {/* Results count */}
            <div className="text-xs text-muted-foreground">
              Showing {rows.length} of {total} quotation{total === 1 ? '' : 's'}
            </div>
  
            {rows.length === 0 ? (
              <EmptyState
                title="No quotations found"
                description={
                  q || status
                    ? 'No quotations match the active filters. Try clearing your search.'
                    : 'Get started by creating your first quotation using the "New Quotation" button above.'
                }
              />
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Quotation #</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Lead</th>
                        <th className="px-4 py-3">System</th>
                        <th className="px-4 py-3">Total</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Prepared By</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((row) => {
                        const digits = row.customer.phone.replace(/\D/g, '')
  
                        return (
                          <tr key={row.id} className="transition-colors hover:bg-muted/20">
                            <td className="whitespace-nowrap px-4 py-3 font-medium">
                              <a
                                href={`/api/quotations/${row.id}/pdf`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 font-semibold text-primary underline underline-offset-2 hover:opacity-80"
                              >
                                <FileText className="size-3.5" aria-hidden />
                                <span>{row.quotationNo}</span>
                              </a>
                            </td>
  
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">{row.customer.name}</p>
                              <p className="text-xs text-muted-foreground">{formatPhone(row.customer.phone)}</p>
                            </td>
  
                            <td className="whitespace-nowrap px-4 py-3">
                              {row.leadId ? (
                                <Link
                                  href={`/leads/${row.leadId}?returnTo=${encodeURIComponent('/quotations')}`}
                                  className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-xs font-medium hover:bg-muted/80"
                                >
                                  {row.leadNo ?? 'Lead'}
                                  <ExternalLink className="size-3" aria-hidden />
                                </Link>
                              ) : (
                                <span className="text-xs text-muted-foreground">Standalone</span>
                              )}
                            </td>
  
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className="font-medium">{row.systemKw > 0 ? `${row.systemKw} kW` : 'Custom'}</span>
                            </td>
  
                            <td className="whitespace-nowrap px-4 py-3">
                              <span className="font-semibold tabular-nums">Rs {formatRs(row.total)}</span>
                            </td>
  
                            <td className="whitespace-nowrap px-4 py-3">
                              <QuotationStatusSelect quotationId={row.id} currentStatus={row.status} />
                            </td>
  
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                              {row.preparedBy.name}
                            </td>
  
                            <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                              {formatPktDateTime(new Date(row.issuedAt))}
                            </td>
  
                            <td className="whitespace-nowrap px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button asChild variant="ghost" size="touch" className="size-8 p-0" title="Open PDF">
                                  <a href={`/api/quotations/${row.id}/pdf`} target="_blank" rel="noreferrer">
                                    <FileText className="size-4" aria-hidden />
                                    <span className="sr-only">Open PDF</span>
                                  </a>
                                </Button>
  
                                <Button asChild variant="ghost" size="touch" className="size-8 p-0" title="Download PDF">
                                  <a href={`/api/quotations/${row.id}/pdf?download=1`}>
                                    <Download className="size-4" aria-hidden />
                                    <span className="sr-only">Download</span>
                                  </a>
                                </Button>
  
                                {digits && <QuotationWhatsAppButton quotationId={row.id} phone={row.customer.phone} variant="icon" />}
                                <QuotationManagerButton quotationId={row.id} variant="icon" />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
  
                {/* Mobile Card View */}
                <div className="space-y-3 md:hidden">
                  {rows.map((row) => {
                    const digits = row.customer.phone.replace(/\D/g, '')
  
                    return (
                      <div
                        key={row.id}
                        className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <a
                            href={`/api/quotations/${row.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-semibold text-primary underline underline-offset-2"
                          >
                            {row.quotationNo}
                          </a>
                          <QuotationStatusSelect quotationId={row.id} currentStatus={row.status} />
                        </div>
  
                        <div className="text-sm">
                          <p className="font-semibold">{row.customer.name}</p>
                          <p className="text-xs text-muted-foreground">{formatPhone(row.customer.phone)}</p>
                        </div>
  
                        <div className="flex items-center justify-between border-y border-border py-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">System: </span>
                            <span className="font-medium">{row.systemKw > 0 ? `${row.systemKw} kW` : 'Custom'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total: </span>
                            <span className="font-bold tabular-nums">Rs {formatRs(row.total)}</span>
                          </div>
                        </div>
  
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>By {row.preparedBy.name}</span>
                          <span>{formatPktDateTime(new Date(row.issuedAt))}</span>
                        </div>
  
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button asChild variant="outline" size="touch" className="h-9 flex-1 gap-1.5 text-xs">
                            <a href={`/api/quotations/${row.id}/pdf`} target="_blank" rel="noreferrer">
                              <FileText className="size-3.5" aria-hidden />
                              <span>View PDF</span>
                            </a>
                          </Button>
                          <Button asChild variant="outline" size="touch" className="h-9 gap-1.5 text-xs">
                            <a href={`/api/quotations/${row.id}/pdf?download=1`}>
                              <Download className="size-3.5" aria-hidden />
                              <span>Download</span>
                            </a>
                          </Button>
                          {digits && <QuotationWhatsAppButton quotationId={row.id} phone={row.customer.phone} variant="compact" />}
                          <QuotationManagerButton quotationId={row.id} variant="compact" />
                        </div>
                      </div>
                    )
                  })}
                </div>
  
                {/* Pagination */}
                {total > 25 && (
                  <div className="flex items-center justify-between pt-2 text-xs">
                    <Button
                      asChild
                      variant="outline"
                      size="touch"
                      disabled={page <= 1}
                    >
                      <Link href={buildUrl({ page: String(Math.max(1, page - 1)) })}>
                        Previous
                      </Link>
                    </Button>
                    <span className="text-muted-foreground">
                      Page {page} of {Math.ceil(total / 25)}
                    </span>
                    <Button
                      asChild
                      variant="outline"
                      size="touch"
                      disabled={page >= Math.ceil(total / 25)}
                    >
                      <Link href={buildUrl({ page: String(page + 1) })}>
                        Next
                      </Link>
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
