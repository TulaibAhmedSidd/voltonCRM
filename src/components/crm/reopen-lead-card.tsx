import { RotateCcw } from 'lucide-react'
import { ActionForm } from '@/components/common/action-form'
import { SelectField, TextField } from '@/components/common/fields'
import { SubmitButton } from '@/components/common/submit-button'
import { reopenLeadAction } from '@/server/actions'

export interface ReopenLeadCardProps {
  leadId: string
  /** "Lost — Price", "Dead (no answer 3 times)", "Won (Rs 1.2M)", … */
  closedAs: string
  /** The close is still waiting in Proof review. */
  pendingReview?: boolean
  stages: { value: string; label: string }[]
  previousAgent: { id: string; name: string } | null
  agents: { id: string; name: string; checkedIn: boolean }[]
}

/**
 * Lead page (managers) on a closed lead: re-open it — back to New (or another stage), 3 fresh tries, and straight to
 * the same agent (no Accept), another agent, or the next agent in order. For leads closed by mistake.
 */
export function ReopenLeadCard({ leadId, closedAs, pendingReview, stages, previousAgent, agents }: ReopenLeadCardProps) {
  const options = [
    ...(previousAgent ? [{ value: 'same', label: `Back to ${previousAgent.name} (same agent)` }] : []),
    ...agents.filter((a) => a.id !== previousAgent?.id).map((a) => ({ value: a.id, label: `${a.name} · ${a.checkedIn ? 'in' : 'out'}` })),
    { value: 'queue', label: 'Next agent in order (asks to accept)' },
  ]
  return (
    <section aria-label="Re-open this lead" className="space-y-3 rounded-2xl bg-tone-warning-soft p-4 text-tone-warning-soft-foreground ring-1 ring-tone-warning/30">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-card text-foreground">
          <RotateCcw className="size-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-heading text-base font-semibold">This lead is closed: {closedAs}</h2>
          <p className="text-sm">
            Closed by mistake, or the customer is back? Re-open it — it starts again with 3 new tries. Old calls, notes and proof stay in the history.
            {pendingReview ? ' This also settles the close waiting in Proof review.' : ''}
          </p>
        </div>
      </div>
      <ActionForm action={reopenLeadAction} className="space-y-3 rounded-xl bg-card p-3 text-foreground">
        <input type="hidden" name="leadId" value={leadId} />
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Re-open as" name="stage" id={`reopen-stage-${leadId}`} defaultValue="new" options={stages} />
          <SelectField label="Give it to" name="giveTo" id={`reopen-to-${leadId}`} defaultValue={previousAgent ? 'same' : 'queue'} options={options} />
        </div>
        <TextField label="Why? (optional, saved in the timeline)" name="note" id={`reopen-note-${leadId}`} maxLength={300} placeholder="e.g. Marked lost by mistake — customer is still interested" />
        <SubmitButton size="touch" className="w-full sm:w-auto" pendingText="Re-opening…">
          <RotateCcw aria-hidden />
          Re-open lead
        </SubmitButton>
      </ActionForm>
    </section>
  )
}
