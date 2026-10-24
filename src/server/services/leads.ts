import 'server-only'
import { DEPARTMENTS, PIPELINES, type Department, type LostReason, type Stage } from '@/domain/constants'
import { AuditLog, ContactAttempt, Department as DepartmentModel, FollowUp, Lead, LeadAssignment, Team, User, Visit } from '@/server/db/models'
import type { SessionUser } from '@/server/auth/session'
import { loadLeadFor } from '@/server/auth/guards'
import { drainQueue, managersOf, manualAssign, resetAssignment, startAssignment } from '@/server/services/assignment'
import { cancelJobs, isDuplicateKey, logActivity, notify, oid, UserError } from '@/server/services/common'

const STAGE_ORDER: Stage[] = ['new', 'contacted', 'interested', 'requirement_collected', 'site_survey', 'quotation_pending', 'quotation_sent', 'negotiation', 'won', 'lost']
/** Stages an agent may set by hand (forward only). Won / lost come from the call result and need a manager's OK. */
export const AGENT_STAGES: readonly Stage[] = ['contacted', 'interested', 'requirement_collected']

export async function changeStage(user: SessionUser, leadId: string, stage: Stage, opts: { lostReason?: LostReason; wonValuePkr?: number }): Promise<void> {
  const manager = user.role !== 'agent'
  const lead = await loadLeadFor(user, leadId, manager ? 'manage' : 'work')
  if (!manager) {
    if (!AGENT_STAGES.includes(stage)) throw new UserError('Only a manager can set this stage. For a sale or "not interested", save it from the call result.')
    if (STAGE_ORDER.indexOf(stage) <= STAGE_ORDER.indexOf(lead.stage as Stage)) throw new UserError('Agents can only move a lead forward')
  }
  if (stage === 'won' && !(opts.wonValuePkr && opts.wonValuePkr > 0)) throw new UserError('Enter the sale value (PKR)')
  if (stage === 'lost' && !opts.lostReason) throw new UserError('Choose why the lead was lost')
  const now = new Date()
  lead.set({ stage, stageChangedAt: now, updatedBy: oid(user.id) })
  if (stage === 'won') lead.set({ status: 'won', closedAt: now, wonValuePkr: opts.wonValuePkr, closeReview: { status: 'approved', by: oid(user.id), at: now } })
  else if (stage === 'lost') lead.set({ status: 'lost', closedAt: now, lostReason: opts.lostReason, closeReview: { status: 'approved', by: oid(user.id), at: now } })
  else if (lead.status !== 'open') throw new UserError('Re-open the lead first')
  await lead.save()
  await logActivity(lead._id, 'stage_changed', user.id, { stage, lostReason: opts.lostReason, wonValuePkr: opts.wonValuePkr })
  if (lead.status !== 'open' && lead.teamId) await drainQueue(lead.teamId)
}

export interface ReopenOptions {
  /** Stage to restart from (default New). Won / Lost are not allowed. */
  stage?: Stage
  /** 'same' = the agent who had it, 'queue' = next in order, or an agent's id. Default: same agent if there was one. */
  giveTo?: string
  note?: string
}

/** Stages a re-opened lead may start from (the department's board without Won / Lost). */
export const reopenStages = (department: Department): Stage[] => PIPELINES[department].filter((s) => s !== 'won' && s !== 'lost')

/**
 * Manager re-opens a closed lead (lost / Dead / junk / won by mistake): back to the chosen stage with 3 fresh tries,
 * and straight to the same agent (or another one, or the queue). A pending close review is settled at the same time.
 */
export async function reopenLead(user: SessionUser, leadId: string, opts: ReopenOptions = {}): Promise<{ agentName: string | null; stage: Stage }> {
  const lead = await loadLeadFor(user, leadId, 'manage')
  if (lead.status === 'open') throw new UserError('The lead is already open')
  const dept = await DepartmentModel.findById(lead.departmentId).select('code').lean()
  const allowed = reopenStages((dept?.code as Department) ?? 'INSTALLATION')
  const stage = opts.stage ?? 'new'
  if (!allowed.includes(stage)) throw new UserError('Choose a stage the lead can restart from')
  const previous = lead.assignment?.agentId ? String(lead.assignment.agentId) : null
  const giveTo = opts.giveTo || (previous ? 'same' : 'queue')
  const agentId = giveTo === 'same' ? previous : giveTo === 'queue' ? null : giveTo
  if (giveTo === 'same' && !previous) throw new UserError('Nobody had this lead — choose an agent or "Next in order"')
  const agent = agentId ? await User.findOne({ _id: oid(agentId), role: 'agent', deletedAt: null }).select('name isActive departmentId').lean() : null
  if (agentId && (!agent || !agent.isActive)) throw new UserError(`${agent?.name ?? 'That agent'} is not active any more — choose someone else`)
  if (agent && String(agent.departmentId) !== String(lead.departmentId)) throw new UserError("Choose an agent of this lead's department")

  const now = new Date()
  const wasPending = lead.closeReview?.status === 'pending'
  const closedAs = lead.status
  lead.set({
    status: 'open',
    stage,
    stageChangedAt: now,
    closedAt: null,
    reopenedAt: now,
    lostReason: null,
    wonValuePkr: null,
    attemptCount: 0,
    noAnswerStreak: 0,
    nextFollowUpAt: null,
    closeReview: wasPending ? { status: 'rejected', by: oid(user.id), at: now } : { status: 'none', by: null, at: null },
    updatedBy: oid(user.id),
  })
  try {
    await lead.save()
  } catch (error) {
    if (isDuplicateKey(error)) throw new UserError('This customer already has another open lead in this department — work that one')
    throw error
  }
  // The close no longer needs checking in Proof review.
  if (wasPending) await ContactAttempt.updateMany({ leadId: lead._id, flags: 'lead_closed', 'review.status': 'pending' }, { $set: { review: { status: 'reviewed', by: oid(user.id), at: now, note: 'Lead re-opened by the manager' } } })
  await logActivity(lead._id, 'status_changed', user.id, { status: 'open', reopened: true, from: closedAs, stage, note: opts.note?.trim().slice(0, 300) || undefined })
  await resetAssignment(lead._id, user.id, 'reopened')
  if (agent) {
    await manualAssign(lead._id, String(agent._id), user.id)
    return { agentName: agent.name, stage }
  }
  await startAssignment(lead._id)
  return { agentName: null, stage }
}

/** Move a lead to the other department's queue (manager of the lead's department, or admin). */
export async function transferLead(user: SessionUser, leadId: string, code: Department, reason: string): Promise<void> {
  if (!DEPARTMENTS.includes(code)) throw new UserError('Pick a department')
  if (reason.trim().length < 3) throw new UserError('Write why the lead is moved')
  const lead = await loadLeadFor(user, leadId, 'manage')
  const dept = await DepartmentModel.findOne({ code }).lean()
  if (!dept) throw new UserError('Department not found')
  if (String(lead.departmentId) === String(dept._id)) throw new UserError('The lead is already in this department')
  const team = await Team.findOne({ departmentId: dept._id }).lean()
  lead.set({ departmentId: dept._id, teamId: team?._id ?? null, stage: 'new', stageChangedAt: new Date() })
  try {
    await lead.save()
  } catch (error) {
    if (isDuplicateKey(error)) throw new UserError('This customer already has an open lead in that department')
    throw error
  }
  await logActivity(lead._id, 'status_changed', user.id, { transferredTo: code, reason })
  await resetAssignment(lead._id, user.id, `moved to ${code}`)
  await startAssignment(lead._id)
}

/**
 * Manager/admin removes leads (spam, test, duplicate…). Soft delete: hidden everywhere, history kept, the Sheet
 * row stays "known" so it is not imported again. Timers, follow-ups and visits stop; the agent is told.
 */
export async function deleteLeads(user: SessionUser, leadIds: string[], reason: string): Promise<{ deleted: string[]; skipped: number }> {
  if (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'manager') throw new UserError('Only a manager can delete leads')
  if (reason.trim().length < 3) throw new UserError('Write why the leads are deleted (e.g. "spam", "test lead", "duplicate")')
  const unique = [...new Set(leadIds)].slice(0, 500)
  if (!unique.length) throw new UserError('Select at least one lead')
  const now = new Date()
  const deleted: string[] = []
  let skipped = 0
  for (const id of unique) {
    const lead = await loadLeadFor(user, id, 'manage').catch(() => null)
    if (!lead) {
      skipped++
      continue
    }
    const agentId = lead.assignment?.agentId ? String(lead.assignment.agentId) : null
    const wasOpen = lead.status === 'open'
    // Closing it as junk frees the "one open lead per customer" rule, so the customer can come back as a new lead.
    lead.set({ deletedAt: now, status: wasOpen ? 'junk' : lead.status, closedAt: lead.closedAt ?? now, nextFollowUpAt: null, updatedBy: oid(user.id) })
    await lead.save()
    await LeadAssignment.updateMany({ leadId: lead._id, endedAt: null }, { endedAt: now, reason: 'reassigned' })
    await FollowUp.updateMany({ leadId: lead._id, status: 'pending' }, { status: 'cancelled' })
    await cancelJobs({ leadId: lead._id })
    await Visit.updateMany({ leadId: lead._id, status: { $in: ['assigned', 'rescheduled', 'unassigned'] } }, { status: 'cancelled', feedback: `Lead deleted: ${reason.slice(0, 100)}` })
    await logActivity(lead._id, 'status_changed', user.id, { deleted: true, reason: reason.slice(0, 200) })
    if (agentId && wasOpen && agentId !== user.id) {
      await notify({ userIds: [agentId], type: 'lead_reassigned', title: `${lead.leadNo} was removed by ${user.name}`, body: reason.slice(0, 120), link: '/leads', dedupeKey: `deleted:${lead._id}` })
    }
    deleted.push(lead.leadNo)
  }
  if (deleted.length) await AuditLog.create({ entity: 'lead', entityId: null, action: 'soft_delete', after: { count: deleted.length, leadNos: deleted.slice(0, 50), reason: reason.slice(0, 200) }, actorId: oid(user.id) })
  return { deleted, skipped }
}


/**
 * Agent-level controlled lead locking:
 * An agent must work on assigned leads one at a time.
 * The next lead is locked until the agent has completed the current lead (disposed / closed,
 * or completed 3 follow-ups), unless explicitly unlocked by manager approval.
 */
export async function isLeadLockedForAgent(
  agentId: string,
  lead: { _id: unknown; status?: string; unlockedForAgent?: boolean; assignment?: { assignedAt?: Date | null; state?: string } | null },
): Promise<boolean> {
  if (lead.status !== 'open' || lead.unlockedForAgent) return false
  const assignedAt = lead.assignment?.assignedAt
  if (!assignedAt) return false

  const earlierIncompleteLead = await Lead.findOne({
    _id: { $ne: lead._id },
    'assignment.agentId': oid(agentId),
    'assignment.state': 'accepted',
    status: 'open',
    'assignment.assignedAt': { $lt: assignedAt },
    unlockedForAgent: { $ne: true },
  }).select('_id attemptCount').lean()

  if (!earlierIncompleteLead) return false

  const completedFollowUps = await FollowUp.countDocuments({
    leadId: earlierIncompleteLead._id,
    status: 'done',
  })

  return completedFollowUps < 3
}

export async function requestLeadUnlock(user: SessionUser, leadId: string): Promise<void> {
  if (user.role !== 'agent') throw new UserError('Only agents request lead unlocking')
  const lead = await loadLeadFor(user, leadId, 'view')
  if (lead.unlockedForAgent) throw new UserError('This lead is already unlocked')
  lead.set({ unlockRequested: true, updatedBy: oid(user.id) })
  await lead.save()

  await logActivity(lead._id, 'note_added', user.id, { text: 'Agent requested manager approval to unlock lead' })

  const managers = await managersOf(lead.departmentId)
  if (managers.length) {
    await notify({
      userIds: managers,
      type: 'lead_unlock_request',
      title: `${user.name} requested to unlock lead ${lead.leadNo}`,
      body: 'Agent wants to work this lead while another is in progress.',
      link: `/leads/${lead._id}`,
      dedupeKey: `unlock_req:${lead._id}:${Date.now()}`,
    })
  }
}

export async function reviewLeadUnlock(manager: SessionUser, leadId: string, approve: boolean): Promise<void> {
  if (manager.role === 'agent') throw new UserError('Only managers or admins can approve unlock requests')
  const lead = await loadLeadFor(manager, leadId, 'manage')
  const agentId = lead.assignment?.agentId ? String(lead.assignment.agentId) : null

  lead.set({
    unlockedForAgent: approve,
    unlockRequested: false,
    updatedBy: oid(manager.id),
  })
  await lead.save()

  await logActivity(lead._id, 'status_changed', manager.id, {
    text: approve ? 'Manager approved unlock request' : 'Manager rejected unlock request',
    approved: approve,
  })

  await AuditLog.create({
    entity: 'lead',
    entityId: lead._id,
    action: 'update',
    after: { unlockedForAgent: approve, unlockRequested: false },
    actorId: oid(manager.id),
    at: new Date(),
  })

  if (agentId) {
    await notify({
      userIds: [agentId],
      type: 'manager_ping',
      title: approve ? `Lead ${lead.leadNo} Unlocked ✓` : `Unlock request declined for ${lead.leadNo}`,
      body: approve ? `${manager.name} approved your request to work on this lead.` : 'Please complete your active lead first.',
      link: `/leads/${lead._id}`,
      dedupeKey: `unlock_res:${lead._id}:${Date.now()}`,
    })
  }
}
