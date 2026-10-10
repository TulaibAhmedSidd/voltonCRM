import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { SelectField, TextAreaField, TextField } from '@/components/common/fields'
import { FilterBar, FilterChip } from '@/components/common/filter-bar'
import { PageHeader } from '@/components/common/page-header'
import { SectionCard } from '@/components/common/section-card'
import { EmptyState } from '@/components/common/states'
import { StatusBadge } from '@/components/common/status-badge'
import { INSTRUCTION_PRIORITIES, INSTRUCTION_STATUSES, type InstructionStatus } from '@/domain/constants'
import { INSTRUCTION_PRIORITY_META, INSTRUCTION_STATUS_META } from '@/domain/ui-maps'
import { formatPktDate, formatPktDateTime } from '@/lib/dates-pkt'
import { requireUser } from '@/server/auth/session'
import { isAdminRole } from '@/server/auth/scope'
import { createInstructionAction, updateInstructionAction } from '@/server/actions'
import { instructionPeople, listInstructions, type InstructionView, type InstructionView_ } from '@/server/services/work'
import { cn } from '@/lib/utils'

export const metadata = { title: 'Instructions' }

const VIEW_LABEL: Record<InstructionView_, string> = { mine: 'For me', given: 'I gave', team: 'Whole team' }

/** Which status buttons each side gets. The person doing it moves it along; the giver / manager can set anything. */
function nextStatuses(i: InstructionView): InstructionStatus[] {
  if (i.canManage) return INSTRUCTION_STATUSES.filter((s) => s !== i.status)
  const flow: Record<InstructionStatus, InstructionStatus[]> = { todo: ['in_progress', 'on_hold'], in_progress: ['review', 'on_hold'], review: ['in_progress'], on_hold: ['in_progress'], completed: [] }
  return flow[i.status]
}

function InstructionCard({ i }: { i: InstructionView }) {
  const options = nextStatuses(i)
  return (
    <article className={cn('space-y-3 rounded-xl bg-card p-4 ring-1', i.overdue ? 'ring-tone-danger' : 'ring-foreground/10')}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold">{i.title}</h3>
          <p className="text-xs text-muted-foreground">
            {i.giver.name} → <span className="font-medium text-foreground">{i.assignee.name}</span> · given {formatPktDate(new Date(i.createdAt))}
            {i.dueAt ? <span className={cn(i.overdue && 'font-semibold text-tone-danger')}> · due {formatPktDate(new Date(i.dueAt))}{i.overdue ? ' (late)' : ''}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {i.priority !== 'normal' ? <StatusBadge {...INSTRUCTION_PRIORITY_META[i.priority]} size="sm" /> : null}
          <StatusBadge {...INSTRUCTION_STATUS_META[i.status]} size="sm" />
        </div>
      </div>
      {i.details ? <p className="whitespace-pre-line text-sm">{i.details}</p> : null}
      {i.updates.length > 1 ? (
        <details>
          <summary className="flex min-h-11 cursor-pointer items-center text-sm text-muted-foreground">History ({i.updates.length})</summary>
          <ol className="space-y-1 border-s-2 border-border ps-3 text-sm">
            {i.updates.map((u, idx) => (
              <li key={idx}>
                <span className="text-xs text-muted-foreground">{formatPktDateTime(new Date(u.at))} · {u.by}</span>
                <br />
                {u.status ? <span className="font-medium">{INSTRUCTION_STATUS_META[u.status].label}</span> : null}
                {u.status && u.note ? ' — ' : ''}
                {u.note}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      {i.status !== 'completed' || i.canManage ? (
        <ActionForm action={updateInstructionAction} resetOnSuccess className="space-y-2">
          <input type="hidden" name="id" value={i.id} />
          <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto] sm:items-end">
            <SelectField id={`status-${i.id}`} label="Change status" name="status" placeholder="— keep —" defaultValue="" options={options.map((s) => ({ value: s, label: s === 'review' ? 'Send for review' : INSTRUCTION_STATUS_META[s].label }))} />
            <TextField id={`note-${i.id}`} label="Note (optional)" name="note" maxLength={1000} placeholder={i.mine ? 'What did you do? Any problem?' : 'Feedback or next step'} />
            <Button type="submit" size="touch">
              Update
            </Button>
          </div>
        </ActionForm>
      ) : null}
    </article>
  )
}

export default async function InstructionsPage(props: PageProps<'/instructions'>) {
  const user = await requireUser()
  const sp = await props.searchParams
  const isManager = isAdminRole(user.role) || user.role === 'manager'
  const views: InstructionView_[] = isManager ? ['mine', 'given', 'team'] : ['mine', 'given']
  const view = views.find((v) => v === sp.view) ?? (isManager ? 'team' : 'mine')
  const status = INSTRUCTION_STATUSES.find((s) => s === sp.status)
  const [{ rows, counts }, people] = await Promise.all([listInstructions(user, view, status), instructionPeople(user)])
  const href = (q: Record<string, string | undefined>) => `/instructions?${new URLSearchParams(Object.entries({ view, status, ...q }).filter(([, v]) => v) as [string, string][])}`

  return (
    <>
      <PageHeader title="Instructions" description="Work given to people (any role) — with To do, In progress, In review and Completed. Both sides update it and get notified." />

      {people.length ? (
        <SectionCard title="Give an instruction">
          <details>
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-tone-info">+ New instruction</summary>
            <ActionForm action={createInstructionAction} resetOnSuccess className="space-y-3 pt-2">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField label="To" name="assigneeId" required placeholder="Choose a person" options={people.map((p) => ({ value: p.id, label: `${p.name} — ${p.title}` }))} />
                <TextField label="What needs to be done" name="title" required minLength={3} maxLength={140} placeholder="e.g. Install 10 kW at Gulshan site on Monday" />
                <SelectField label="Priority" name="priority" defaultValue="normal" options={INSTRUCTION_PRIORITIES.map((p) => ({ value: p, label: INSTRUCTION_PRIORITY_META[p].label }))} />
                <TextField label="Due date (optional)" name="dueAt" type="date" />
              </div>
              <TextAreaField label="Details (optional)" name="details" rows={3} maxLength={4000} placeholder="Address, contact, materials, steps…" />
              <Button type="submit" size="touch">
                Send instruction
              </Button>
            </ActionForm>
          </details>
        </SectionCard>
      ) : null}

      <FilterBar>
        {views.map((v) => (
          <FilterChip key={v} label={VIEW_LABEL[v]} href={href({ view: v, status: undefined })} active={v === view} count={counts[v]} />
        ))}
      </FilterBar>
      <FilterBar>
        <FilterChip label="All" href={href({ status: undefined })} active={!status} />
        {INSTRUCTION_STATUSES.map((s) => (
          <FilterChip key={s} label={INSTRUCTION_STATUS_META[s].label} href={href({ status: s })} active={status === s} />
        ))}
      </FilterBar>

      {rows.length === 0 ? (
        <EmptyState title="No instructions here" description={view === 'mine' ? 'Work given to you appears here, and you get a notification.' : 'Use “New instruction” above to give work to someone.'} />
      ) : (
        <div className="space-y-3">
          {rows.map((i) => (
            <InstructionCard key={i.id} i={i} />
          ))}
        </div>
      )}
      <p className="text-sm text-muted-foreground">
        Counts show open work (not completed). <Link href="/help" className="underline underline-offset-4">Help</Link>
      </p>
    </>
  )
}
