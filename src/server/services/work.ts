import 'server-only'
import { Types } from 'mongoose'
import { INSTRUCTION_PRIORITIES, INSTRUCTION_STATUSES, type InstructionPriority, type InstructionStatus, type Role } from '@/domain/constants'
import { isAdminRole } from '@/server/auth/scope'
import type { SessionUser } from '@/server/auth/session'
import { connectDb } from '@/server/db/connection'
import { Instruction, JobRole, User } from '@/server/db/models'
import { notify, UserError } from '@/server/services/common'

const oid = (id: string) => new Types.ObjectId(id)
const isManager = (u: SessionUser) => isAdminRole(u.role) || u.role === 'manager'

// ── Custom roles ──

export interface JobRoleView {
  id: string
  name: string
  autoLeads: boolean
  instructions: boolean
  department: string | null
  people: number
}

/** Roles a manager / admin can use when adding a person: their department's + company-wide ones. */
export async function listJobRoles(user: SessionUser): Promise<JobRoleView[]> {
  await connectDb()
  const filter = isAdminRole(user.role) ? {} : { departmentId: { $in: [null, user.departmentId ? oid(user.departmentId) : null] } }
  const roles = await JobRole.find(filter).sort({ name: 1 }).lean()
  const counts = await User.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { jobRoleId: { $in: roles.map((r) => r._id) }, deletedAt: null } }, { $group: { _id: '$jobRoleId', n: { $sum: 1 } } }])
  const n = new Map(counts.map((c) => [String(c._id), c.n]))
  return roles.map((r) => ({ id: String(r._id), name: r.name, autoLeads: r.autoLeads, instructions: r.instructions, department: r.departmentId ? String(r.departmentId) : null, people: n.get(String(r._id)) ?? 0 }))
}

export async function createJobRole(user: SessionUser, input: { name: string; autoLeads: boolean; instructions: boolean }): Promise<void> {
  if (!isManager(user)) throw new UserError('Only a manager or admin can add roles')
  const name = input.name.trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 60) throw new UserError('Role name must be 2–60 characters')
  const reserved = ['admin', 'super admin', 'manager', 'call agent', 'agent', 'field agent', 'staff']
  if (reserved.includes(name.toLowerCase())) throw new UserError('That name is a built-in role — choose another name')
  await connectDb()
  const departmentId = isAdminRole(user.role) ? null : user.departmentId ? oid(user.departmentId) : null
  if (await JobRole.exists({ departmentId, name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') })) throw new UserError('A role with this name already exists')
  await JobRole.create({ name, autoLeads: input.autoLeads, instructions: input.instructions, departmentId, createdBy: oid(user.id) })
}

export async function deleteJobRole(user: SessionUser, roleId: string): Promise<void> {
  if (!isManager(user) || !Types.ObjectId.isValid(roleId)) throw new UserError('Role not found')
  await connectDb()
  const role = await JobRole.findById(roleId).lean()
  if (!role || (!isAdminRole(user.role) && String(role.departmentId) !== user.departmentId)) throw new UserError('Role not found')
  if (await User.exists({ jobRoleId: role._id, deletedAt: null })) throw new UserError('People still have this role — change their role first')
  await JobRole.deleteOne({ _id: role._id })
}

/** For "Add a user": a custom role → the permission role it maps to (leads → call agent, otherwise staff). */
export async function resolveJobRole(user: SessionUser, roleId: string): Promise<{ role: Role; jobRoleId: Types.ObjectId; jobTitle: string }> {
  const roles = await listJobRoles(user)
  const r = roles.find((x) => x.id === roleId)
  if (!r) throw new UserError('Choose a role from the list')
  return { role: r.autoLeads ? 'agent' : 'staff', jobRoleId: oid(r.id), jobTitle: r.name }
}

// ── Work instructions ──

export interface PersonOption {
  id: string
  name: string
  title: string
}

/** People this user can give an instruction to: same department (admins: everyone), roles that take instructions. */
export async function instructionPeople(user: SessionUser): Promise<PersonOption[]> {
  await connectDb()
  const noInstructions = (await JobRole.find({ instructions: false }).select('_id').lean()).map((r) => r._id)
  const filter: Record<string, unknown> = { deletedAt: null, isActive: { $ne: false }, _id: { $ne: oid(user.id) }, jobRoleId: { $nin: noInstructions } }
  if (!isAdminRole(user.role)) filter.departmentId = user.departmentId ? oid(user.departmentId) : null
  const people = await User.find(filter).select('name role jobTitle').sort({ name: 1 }).lean()
  const roleName: Record<string, string> = { super_admin: 'Super admin', admin: 'Admin', manager: 'Manager', agent: 'Call agent', field_agent: 'Field agent', staff: 'Staff' }
  return people.map((p) => ({ id: String(p._id), name: p.name, title: p.jobTitle || roleName[p.role] || p.role }))
}

export interface InstructionView {
  id: string
  title: string
  details: string
  status: InstructionStatus
  priority: InstructionPriority
  dueAt: string | null
  overdue: boolean
  assignee: { id: string; name: string }
  giver: { id: string; name: string }
  mine: boolean
  gaveIt: boolean
  canManage: boolean
  createdAt: string
  updates: { at: string; by: string; status: InstructionStatus | null; note: string }[]
}

export type InstructionView_ = 'mine' | 'given' | 'team'

export async function listInstructions(user: SessionUser, view: InstructionView_, status?: InstructionStatus): Promise<{ rows: InstructionView[]; counts: Record<InstructionView_, number> }> {
  await connectDb()
  const me = oid(user.id)
  const team: Record<string, unknown> = isAdminRole(user.role) ? {} : { departmentId: user.departmentId ? oid(user.departmentId) : null }
  const views: Record<InstructionView_, Record<string, unknown>> = { mine: { assigneeId: me }, given: { createdBy: me }, team: isManager(user) ? team : { _id: null } }
  const open = { status: { $ne: 'completed' } }
  const filter = { ...views[view], ...(status ? { status } : view === 'team' ? {} : {}) }
  const [docs, ...countList] = await Promise.all([
    Instruction.find(filter).sort({ status: 1, dueAt: 1, createdAt: -1 }).limit(300).lean(),
    ...(['mine', 'given', 'team'] as const).map((v) => Instruction.countDocuments({ ...views[v], ...open })),
  ])
  const ids = [...new Set(docs.flatMap((d) => [String(d.assigneeId), String(d.createdBy), ...(d.updates as { by: Types.ObjectId }[]).map((u) => String(u.by))]))]
  const names = new Map((await User.find({ _id: { $in: ids.map(oid) } }).select('name').lean()).map((u) => [String(u._id), u.name]))
  const now = Date.now()
  const order: Record<string, number> = { todo: 1, in_progress: 0, review: 2, on_hold: 3, completed: 4 }
  const rows = docs
    .map((d) => ({
      id: String(d._id),
      title: d.title,
      details: d.details ?? '',
      status: d.status as InstructionStatus,
      priority: d.priority as InstructionPriority,
      dueAt: d.dueAt ? d.dueAt.toISOString() : null,
      overdue: !!d.dueAt && d.status !== 'completed' && d.dueAt.getTime() < now,
      assignee: { id: String(d.assigneeId), name: names.get(String(d.assigneeId)) ?? '—' },
      giver: { id: String(d.createdBy), name: names.get(String(d.createdBy)) ?? '—' },
      mine: String(d.assigneeId) === user.id,
      gaveIt: String(d.createdBy) === user.id,
      canManage: String(d.createdBy) === user.id || isManager(user),
      createdAt: (d as { createdAt?: Date }).createdAt?.toISOString() ?? new Date().toISOString(),
      updates: (d.updates as { at: Date; by: Types.ObjectId; status?: string | null; note?: string | null }[]).map((u) => ({ at: u.at.toISOString(), by: names.get(String(u.by)) ?? '—', status: (u.status ?? null) as InstructionStatus | null, note: u.note ?? '' })),
    }))
    .sort((a, b) => order[a.status] - order[b.status] || (a.priority === 'urgent' ? -1 : 0) - (b.priority === 'urgent' ? -1 : 0))
  const [mine, given, teamCount] = countList as number[]
  return { rows, counts: { mine, given, team: teamCount } }
}

export async function createInstruction(user: SessionUser, input: { assigneeId: string; title: string; details?: string; priority?: string; dueAt?: Date | null; leadId?: string | null }): Promise<string> {
  const title = input.title?.trim()
  if (!title || title.length < 3) throw new UserError('Write what needs to be done (at least 3 characters)')
  if (!(await instructionPeople(user)).some((p) => p.id === input.assigneeId)) throw new UserError('Choose a person from the list')
  const priority = (INSTRUCTION_PRIORITIES as readonly string[]).includes(input.priority ?? '') ? input.priority : 'normal'
  const assignee = await User.findById(input.assigneeId).select('departmentId').lean()
  const doc = await Instruction.create({
    title: title.slice(0, 140),
    details: (input.details ?? '').trim().slice(0, 4000),
    assigneeId: oid(input.assigneeId),
    createdBy: oid(user.id),
    departmentId: assignee?.departmentId ?? (user.departmentId ? oid(user.departmentId) : null),
    priority,
    dueAt: input.dueAt ?? null,
    leadId: input.leadId && Types.ObjectId.isValid(input.leadId) ? oid(input.leadId) : null,
    updates: [{ at: new Date(), by: oid(user.id), status: 'todo', note: 'Instruction given' }],
  })
  await notify({ userIds: [input.assigneeId], type: 'instruction', title: `New instruction from ${user.name}: ${title.slice(0, 80)}`, body: priority === 'normal' ? '' : `Priority: ${priority}`, link: '/instructions', dedupeKey: `instr:new:${doc._id}` })
  return String(doc._id)
}

/**
 * Status change. The person doing it: To do → In progress → In review (or On hold). The giver / a manager: any status
 * (e.g. Completed after review, or back to In progress). The other side is told.
 */
export async function updateInstruction(user: SessionUser, id: string, change: { status?: string; note?: string }): Promise<void> {
  if (!Types.ObjectId.isValid(id)) throw new UserError('Instruction not found')
  await connectDb()
  const doc = await Instruction.findById(id)
  if (!doc) throw new UserError('Instruction not found')
  const isAssignee = String(doc.assigneeId) === user.id
  const isGiver = String(doc.createdBy) === user.id
  const inTeam = isAdminRole(user.role) || (user.role === 'manager' && String(doc.departmentId) === user.departmentId)
  if (!isAssignee && !isGiver && !inTeam) throw new UserError('Instruction not found')
  const status = change.status && (INSTRUCTION_STATUSES as readonly string[]).includes(change.status) ? (change.status as InstructionStatus) : null
  const note = (change.note ?? '').trim().slice(0, 1000)
  if (!status && !note) throw new UserError('Choose a status or write a note')
  if (status) {
    const canManage = isGiver || inTeam
    if (!canManage && !['in_progress', 'review', 'on_hold'].includes(status)) throw new UserError('The person who gave the instruction marks it Completed after checking it')
    doc.status = status
    doc.completedAt = status === 'completed' ? new Date() : null
  }
  doc.updates.push({ at: new Date(), by: oid(user.id), status, note })
  await doc.save()
  const other = isAssignee ? String(doc.createdBy) : String(doc.assigneeId)
  const label: Record<string, string> = { todo: 'To do', in_progress: 'In progress', review: 'Ready for review', completed: 'Completed', on_hold: 'On hold' }
  await notify({
    userIds: [other],
    type: 'instruction',
    title: status ? `${user.name}: “${doc.title.slice(0, 60)}” → ${label[status]}` : `${user.name} commented on “${doc.title.slice(0, 60)}”`,
    body: note.slice(0, 120),
    link: '/instructions',
    dedupeKey: `instr:upd:${doc._id}:${doc.updates.length}`,
  })
}
