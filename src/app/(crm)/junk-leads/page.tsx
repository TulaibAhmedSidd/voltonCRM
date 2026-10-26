import { Suspense } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/common/page-header'
import { SearchBox } from '@/components/common/search-box'
import { DataTable, type Column } from '@/components/common/data-table'
import { EmptyState } from '@/components/common/states'
import { LeadSelectBox } from '@/components/crm/lead-bulk-actions'
import { SourceBadge } from '@/components/crm/badges'
import { ActionForm } from '@/components/common/action-form'
import { deleteLeadsAction, purgeAllJunkLeadsAction, revertJunkAction } from '@/server/actions'
import type { LeadSummary } from '@/domain/view-models'
import { formatPktDateTime } from '@/lib/dates-pkt'
import { formatPhone, maskPhone } from '@/lib/phone'
import { requireUser } from '@/server/auth/session'
import { RotateCcw, Trash2 } from 'lucide-react'
import { listLeads, PAGE_SIZE } from '@/server/services/queries'
import { SubmitButton } from '@/components/common/submit-button'

export const metadata = { title: 'Junk Leads' }

export default async function JunkLeadsPage(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser()
  const sp = await props.searchParams
  const one = (k: string) => (typeof sp[k] === 'string' ? (sp[k] as string) : undefined)
  const canManage = user.role === 'manager' || user.role === 'admin' || user.role === 'super_admin'
  const page = Number(one('page') ?? 1)

  const { rows, total } = await listLeads(user, {
    view: 'junk',
    q: one('q'),
    page,
    sort: one('sort'),
    dir: one('dir') === 'asc' ? 'asc' : 'desc',
  })

  const href = (params: Record<string, string | number | undefined>) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries({ q: one('q'), sort: one('sort'), dir: one('dir'), ...params })) {
      if (v !== undefined && v !== '') q.set(k, String(v))
    }
    return `/junk-leads?${q}`
  }

  const columns: Column<LeadSummary>[] = [
    ...(canManage ? [{ key: 'select', header: '', cell: (l: LeadSummary) => <LeadSelectBox leadId={l.id} label={`${l.name} ${l.leadNo}`} /> }] : []),
    {
      key: 'name',
      header: 'Customer',
      cell: (l) => (
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Link
              href={`/leads/${l.id}?returnTo=${encodeURIComponent(href({}))}`}
              className="font-medium underline-offset-4 hover:underline"
            >
              {l.name}
            </Link>
            <SourceBadge channel={l.channel} detail={l.sourceDetail} platform={l.platform} isAd={l.isAd} size="sm" />
          </div>
          <span className="block text-xs text-muted-foreground">
            {l.maskPhone ? maskPhone(l.phone) : formatPhone(l.phone)} · {l.leadNo}
          </span>
        </div>
      ),
    },
    {
      key: 'agent',
      header: 'Agent',
      cell: (l) => (
        <span className="text-sm text-muted-foreground">{l.agent?.name ?? 'Unassigned'}</span>
      ),
    },
    {
      key: 'junkedBy',
      header: 'Junked By & Reason',
      cell: (l) => (
        <div className="space-y-0.5 text-xs">
          <span className="font-semibold text-foreground">
            {l.junkedBy?.name ?? 'CRM User'}
          </span>
          {l.junkedBy?.reason ? (
            <span className="block max-w-[220px] text-tone-danger-soft-foreground font-medium" title={l.junkedBy.reason}>
              {l.junkedBy.reason}
            </span>
          ) : null}
          {l.junkedBy?.at ? (
            <span className="block text-muted-foreground">
              {formatPktDateTime(new Date(l.junkedBy.at))}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'received',
      header: 'Received',
      sortable: true,
      cell: (l) => formatPktDateTime(new Date(l.receivedAt)),
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: 'Actions',
            cell: (l: LeadSummary) => (
              <div className="flex items-center gap-2">
                <ActionForm action={revertJunkAction}>
                  <input type="hidden" name="leadId" value={l.id} />
                  <Button type="submit" size="xs" variant="outline" className="h-8 gap-1.5 text-xs">
                    <RotateCcw className="size-3.5" aria-hidden />
                    <span>Revert to New</span>
                  </Button>
                </ActionForm>

                <ActionForm action={deleteLeadsAction}>
                  <input type="hidden" name="leadId" value={l.id} />
                  <input type="hidden" name="reason" value="Permanently deleted from Junk Leads" />
                  <Button type="submit" size="xs" variant="ghost" className="h-8 gap-1.5 text-xs text-tone-danger-soft-foreground hover:bg-tone-danger-soft">
                    <Trash2 className="size-3.5" aria-hidden />
                    <span>Delete</span>
                  </Button>
                </ActionForm>
              </div>
            ),
          },
        ]
      : []),
  ]

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <>
      <PageHeader
        title="Junk Leads"
        description={`${total} junk or invalid leads. Managers can revert them back to active status at any time.`}
        actions={
          canManage && rows.length > 0 ? (
            <ActionForm action={purgeAllJunkLeadsAction}>
              <SubmitButton
                size="touch"
                variant="outline"
                className="gap-2 border-tone-danger/30 text-tone-danger-soft-foreground hover:bg-tone-danger-soft"
              >
                <Trash2 className="size-4" aria-hidden />
                <span>Purge All Junk Leads</span>
              </SubmitButton>
            </ActionForm>
          ) : undefined
        }
      />

      <Suspense>
        <SearchBox />
      </Suspense>

      {rows.length === 0 ? (
        <EmptyState
          title="No junk leads found"
          description="Leads marked as junk or spam will appear here. You can move any lead to junk using the trash icon in the Leads table."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={rows}
            getRowKey={(l) => l.id}
            sort={{ key: one('sort') ?? 'received', direction: one('dir') === 'asc' ? 'asc' : 'desc' }}
            sortHref={(key, dir) => href({ sort: key, dir, page: undefined })}
            caption="Junk Leads"
          />

          {pages > 1 ? (
            <nav className="flex items-center justify-between" aria-label="Pages">
              {page > 1 ? (
                <Button asChild variant="outline" size="touch">
                  <Link href={href({ page: page - 1 })}>Previous</Link>
                </Button>
              ) : (
                <span />
              )}
              <span className="text-sm text-muted-foreground">
                Page {page} of {pages}
              </span>
              {page < pages ? (
                <Button asChild variant="outline" size="touch">
                  <Link href={href({ page: page + 1 })}>Next</Link>
                </Button>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </>
  )
}
