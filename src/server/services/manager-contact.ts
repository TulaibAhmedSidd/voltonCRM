import 'server-only'
import { connectDb } from '@/server/db/connection'
import { Team, User } from '@/server/db/models'

export interface ManagerContact {
  id: string
  name: string
  /** E.164 (+92…), or null when no number is saved on the manager's account. */
  phone: string | null
}

/**
 * Who approves this person's work (quotations…): their own manager (Team page), else the manager of the team they are in,
 * else the manager of their department's team. Never themselves; inactive managers are skipped.
 */
export async function managerFor(userId: string): Promise<ManagerContact | null> {
  await connectDb()
  const me = await User.findById(userId).select('managerId departmentId').lean()
  if (!me) return null
  const teams = await Team.find({ $or: [{ memberOrder: me._id }, ...(me.departmentId ? [{ departmentId: me.departmentId }] : [])] })
    .select('managerId memberOrder')
    .lean()
  const inTeam = (t: (typeof teams)[number]) => (t.memberOrder ?? []).some((m: unknown) => String(m) === userId)
  const candidates = [me.managerId, ...teams.filter(inTeam).map((t) => t.managerId), ...teams.filter((t) => !inTeam(t)).map((t) => t.managerId)]
  const seen = new Set<string>()
  for (const id of candidates) {
    if (!id || String(id) === userId || seen.has(String(id))) continue
    seen.add(String(id))
    const m = await User.findOne({ _id: id, isActive: true, deletedAt: null }).select('name phone').lean()
    if (m) return { id: String(m._id), name: m.name, phone: m.phone ?? null }
  }
  return null
}
