'use client'

import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Timeline, TimelineItem } from '@/components/common/timeline'
import { ACTIVITY_TYPE_META, ATTEMPT_CHANNEL_META, CALL_RESULT_META, STAGE_META } from '@/domain/ui-maps'
import type { ActivityType, CallResult, Stage } from '@/domain/constants'
import { en } from '@/i18n/en'
import { formatPktDateTime } from '@/lib/dates-pkt'

export interface ActivityItem {
  id: string
  type: string
  at: string
  actor?: string
  data: Record<string, unknown>
}

function describe(type: string, d: Record<string, unknown>, actor?: string): string {
  if (type === 'lead_created' || type === 'lead_reinquiry') {
    const parts: string[] = []
    if (d.channel) {
      const channelLabel =
        d.channel === 'sheet'
          ? 'Google Sheet'
          : d.channel === 'meta' || d.channel === 'meta_webhook'
            ? 'Meta / Facebook'
            : d.channel === 'whatsapp'
              ? 'WhatsApp'
              : String(d.channel)
      parts.push(`Received via ${channelLabel}`)
    }
    if (d.campaign) parts.push(`Campaign: ${d.campaign}`)
    if (d.form) parts.push(`Form: ${d.form}`)
    if (d.ad) parts.push(`Ad: ${d.ad}`)
    if (d.notes) parts.push(`Note: ${d.notes}`)
    return parts.length ? parts.join(' · ') : 'Lead received'
  }
  if (type === 'assigned') {
    const target = (d.targetAgentName as string) || (d.agentName as string) || 'agent'
    const method = d.method === 'auto' ? 'auto round-robin' : actor ? `by ${actor}` : 'manual'
    return `Assigned to ${target} (${method})`
  }
  if (type === 'reassigned') {
    const from = (d.fromAgentName as string) || ''
    const target = (d.targetAgentName as string) || (d.agentName as string) || 'round-robin queue'
    const by = actor ? `by ${actor}` : 'system'
    const reason = d.reason ? ` · Reason: ${d.reason}` : ''
    if (from) {
      return `Reassigned from ${from} to ${target} (${by})${reason}`
    }
    return `Reassigned to ${target} (${by})${reason}`
  }
  if (type === 'accepted') {
    return `Accepted by ${actor || 'agent'}`
  }
  if (type === 'attempt_logged') {
    const channel = d.channel ? ATTEMPT_CHANNEL_META[d.channel as keyof typeof ATTEMPT_CHANNEL_META]?.label : ''
    const result = d.result ? CALL_RESULT_META[d.result as CallResult]?.label : ''
    return [channel, result, d.remarks].filter(Boolean).join(' · ')
  }
  if (type === 'stage_changed' && d.stage) {
    const stageName = STAGE_META[d.stage as Stage]?.label ?? String(d.stage)
    const lostReason = d.lostReason ? ` (${en.lostReason[d.lostReason as keyof typeof en.lostReason] ?? d.lostReason})` : ''
    return `Moved to stage: ${stageName}${lostReason}`
  }
  if (type === 'status_changed') {
    const parts: string[] = []
    if (d.status) parts.push(`Status: ${d.status}`)
    if (d.reason) parts.push(`Reason: ${d.reason}`)
    if (d.transferredTo) parts.push(`Transferred to: ${d.transferredTo}`)
    return parts.join(' · ') || String(d.status ?? '')
  }
  if (type === 'proof_reviewed') {
    return `Proof review: ${d.decision ?? 'reviewed'}${d.note ? ` · ${d.note}` : ''}`
  }
  if (type === 'follow_up_scheduled') {
    const due = d.dueAt ? formatPktDateTime(new Date(String(d.dueAt))) : ''
    return `Follow-up #${d.number ?? 1} scheduled${due ? ` for ${due}` : ''}`
  }
  if (type === 'quotation_issued') {
    return `Quotation issued${d.text ? `: ${d.text}` : ''}`
  }
  if (type === 'visit_assigned') {
    return `Site visit assigned${d.kw ? ` (${d.kw} kW)` : ''}`
  }
  if (type === 'visit_updated') {
    return `Site visit updated: ${d.status ?? ''}${d.feedback ? ` · ${d.feedback}` : ''}`
  }
  if (d.text) return String(d.text)
  return ''
}

type FilterKind = 'all' | 'notes' | 'calls' | 'assignments'

const INITIAL_LIMIT = 8

export function LeadTimeline({ activities }: { activities: ActivityItem[] }) {
  const [filter, setFilter] = useState<FilterKind>('all')
  const [expanded, setExpanded] = useState(false)

  const counts = useMemo(() => {
    return {
      all: activities.length,
      notes: activities.filter((a) => a.type === 'note_added').length,
      calls: activities.filter((a) => a.type === 'attempt_logged' || a.type === 'proof_reviewed').length,
      assignments: activities.filter((a) => a.type === 'assigned' || a.type === 'reassigned' || a.type === 'accepted').length,
    }
  }, [activities])

  const filtered = useMemo(() => {
    if (filter === 'notes') return activities.filter((a) => a.type === 'note_added')
    if (filter === 'calls') return activities.filter((a) => a.type === 'attempt_logged' || a.type === 'proof_reviewed')
    if (filter === 'assignments') return activities.filter((a) => a.type === 'assigned' || a.type === 'reassigned' || a.type === 'accepted')
    return activities
  }, [activities, filter])

  const displayed = expanded ? filtered : filtered.slice(0, INITIAL_LIMIT)
  const hasMore = filtered.length > INITIAL_LIMIT

  return (
    <div className="space-y-4">
      {/* Category filters */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border pb-3">
        <Filter className="size-4 text-muted-foreground me-1" aria-hidden />
        <Button
          type="button"
          size="xs"
          variant={filter === 'all' ? 'default' : 'ghost'}
          onClick={() => setFilter('all')}
        >
          All ({counts.all})
        </Button>
        {counts.notes > 0 ? (
          <Button
            type="button"
            size="xs"
            variant={filter === 'notes' ? 'default' : 'ghost'}
            onClick={() => setFilter('notes')}
          >
            Notes ({counts.notes})
          </Button>
        ) : null}
        {counts.calls > 0 ? (
          <Button
            type="button"
            size="xs"
            variant={filter === 'calls' ? 'default' : 'ghost'}
            onClick={() => setFilter('calls')}
          >
            Calls & Proof ({counts.calls})
          </Button>
        ) : null}
        {counts.assignments > 0 ? (
          <Button
            type="button"
            size="xs"
            variant={filter === 'assignments' ? 'default' : 'ghost'}
            onClick={() => setFilter('assignments')}
          >
            Assignments ({counts.assignments})
          </Button>
        ) : null}
      </div>

      {/* Events timeline */}
      {displayed.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No events match this filter.</p>
      ) : (
        <Timeline>
          {displayed.map((a) => {
            const meta = ACTIVITY_TYPE_META[a.type as ActivityType]
            const text = describe(a.type, a.data, a.actor)
            return (
              <TimelineItem
                key={a.id}
                icon={meta?.icon}
                tone={meta?.tone}
                title={`${meta?.label ?? a.type}${a.actor ? ` — ${a.actor}` : ''}`}
                time={formatPktDateTime(new Date(a.at))}
              >
                {text ? <p className="text-muted-foreground">{text}</p> : null}
              </TimelineItem>
            )
          })}
        </Timeline>
      )}

      {/* Expand / collapse controls */}
      {hasMore ? (
        <div className="pt-1 text-center">
          <Button
            type="button"
            variant="outline"
            size="touch"
            onClick={() => setExpanded(!expanded)}
            className="w-full sm:w-auto"
          >
            {expanded ? (
              <>
                <ChevronUp data-icon="inline-start" aria-hidden />
                Show latest {INITIAL_LIMIT} only
              </>
            ) : (
              <>
                <ChevronDown data-icon="inline-start" aria-hidden />
                Show all {filtered.length} events ({filtered.length - INITIAL_LIMIT} older)
              </>
            )}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
