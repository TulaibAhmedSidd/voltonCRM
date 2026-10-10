import 'server-only'
import type { Role } from '@/domain/constants'
import { en } from '@/i18n/en'
import { connectDb } from '@/server/db/connection'
import { Department, Team, User } from '@/server/db/models'

export interface WebsiteTeamMember {
  id: string
  name: string
  /** Custom role name (e.g. "Installer") or the built-in role ("Call agent", "Manager"…). */
  title: string
  role: Role
  department: string | null
  /** Who they report to (id in this list) — the top of the tree has null. */
  reportsTo: string | null
  /** Work phone / email. The website keeps them private and shows them only when a website admin allows it. */
  phone: string | null
  email: string | null
}

const RANK: Record<Role, number> = { super_admin: 0, admin: 1, manager: 2, agent: 3, field_agent: 3, staff: 3 }

/**
 * The team for the website's Team page, as a tree: employees → their manager (set on the person, else their
 * department's team manager) → the super admin. Active people only. Phone / email are sent to the website (server to
 * server, shared secret) but stay hidden there unless a website admin turns them on per person.
 */
export async function websiteTeam(): Promise<WebsiteTeamMember[]> {
  await connectDb()
  const [users, teams, departments] = await Promise.all([
    User.find({ deletedAt: null, isActive: true }).select('name role jobTitle departmentId managerId phone email').lean(),
    Team.find({}).select('departmentId managerId').lean(),
    Department.find({}).select('name').lean(),
  ])
  const ids = new Set(users.map((u) => String(u._id)))
  const deptName = new Map(departments.map((d) => [String(d._id), d.name]))
  const deptManager = new Map(teams.map((t) => [String(t.departmentId), String(t.managerId)]))
  const owner = users.find((u) => u.role === 'super_admin') ?? users.find((u) => u.role === 'admin')
  const top = owner ? String(owner._id) : null
  return users
    .map((u) => {
      const id = String(u._id)
      const role = u.role as Role
      const own = u.managerId ? String(u.managerId) : null
      const fromTeam = u.departmentId && role !== 'manager' ? (deptManager.get(String(u.departmentId)) ?? null) : null
      let reportsTo = [own, fromTeam].find((m) => m && m !== id && ids.has(m)) ?? null
      if (!reportsTo && id !== top && RANK[role] > 0) reportsTo = top
      return { id, name: u.name, title: u.jobTitle || en.role[role], role, department: u.departmentId ? (deptName.get(String(u.departmentId)) ?? null) : null, reportsTo, phone: u.phone ?? null, email: u.email ?? null }
    })
    .sort((a, b) => RANK[a.role] - RANK[b.role] || a.name.localeCompare(b.name))
}
