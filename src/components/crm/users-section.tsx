import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { SelectField, TextField } from '@/components/common/fields'
import { PasswordField } from '@/components/common/password-field'
import { SectionCard } from '@/components/common/section-card'
import { StatusBadge } from '@/components/common/status-badge'
import { UsernameField } from '@/components/common/username-field'
import { UserAdminList } from '@/components/crm/user-admin-list'
import type { Role } from '@/domain/constants'
import { en } from '@/i18n/en'
import type { SessionUser } from '@/server/auth/session'
import { isAdminRole } from '@/server/auth/scope'
import { createJobRoleAction, createUserAction, deleteJobRoleAction } from '@/server/actions'
import { listDepartments, listUsers } from '@/server/services/queries'
import { listJobRoles } from '@/server/services/work'

/** Roles each viewer may create (server rule in actions.ts → creatableRoles). */
function creatable(role: Role): Role[] {
  if (role === 'super_admin') return ['manager', 'agent', 'field_agent', 'admin']
  return ['agent', 'field_agent']
}

/** Team page: add a person (built-in or custom role) and manage the people list. */
export async function UsersSection({ user }: { user: SessionUser }) {
  const admin = isAdminRole(user.role)
  const [users, departments, jobRoles] = await Promise.all([listUsers(user), listDepartments(), listJobRoles(user)])
  const roleOptions = [
    ...creatable(user.role).map((r) => ({ value: r, label: en.role[r] })),
    ...jobRoles.map((r) => ({ value: `job:${r.id}`, label: `${r.name} (${r.autoLeads ? 'gets leads' : 'no leads'}${r.instructions ? ', instructions' : ''})` })),
  ]
  return (
    <SectionCard title="Add a team member" description="New people choose their own password at first sign-in. Call agents (and custom roles that get leads) join the lead order automatically.">
      <div className="grid gap-6 lg:grid-cols-2">
        <UserAdminList users={users} viewer={{ id: user.id, role: user.role }} />
        <ActionForm action={createUserAction} resetOnSuccess>
          <p className="font-medium">Add a user</p>
          <TextField label="Full name" name="name" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <UsernameField />
            <PasswordField defaultVisible label="Temporary password" name="password" minLength={8} required autoComplete="off" hint="At least 8 characters, not 12345678. They choose their own at first sign-in." />
            <TextField label="Phone (optional)" name="phone" inputMode="tel" placeholder="0300 1234567" hint="03XX XXXXXXX or +92…" />
            <TextField label="Email (optional)" name="email" type="email" hint="Leave empty if they have none" />
            <SelectField label="Role" name="role" defaultValue="agent" options={roleOptions} />
            {admin ? <SelectField label="Department" name="departmentId" placeholder="—" options={departments.map((d) => ({ value: d.id, label: d.name }))} /> : null}
          </div>
          <Button type="submit" size="touch" className="w-full">
            Add user
          </Button>
        </ActionForm>
      </div>
    </SectionCard>
  )
}

/** Custom roles (e.g. Installer, Accounts): two questions decide how the role works. */
export async function RolesSection({ user }: { user: SessionUser }) {
  const roles = await listJobRoles(user)
  return (
    <SectionCard title="Roles" description="Make your own roles. For each, answer: does it get leads automatically? Does it get work instructions?">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-2">
          {roles.length === 0 ? <p className="text-sm text-muted-foreground">No custom roles yet. Built-in: Call agent (gets leads), Field agent (gets site visits), Manager.</p> : null}
          {roles.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="min-w-0">
                <span className="font-medium">{r.name}</span> <span className="text-xs text-muted-foreground">· {r.people} person(s){r.department === null ? ' · company-wide' : ''}</span>
                <span className="mt-1 flex flex-wrap gap-1.5">
                  <StatusBadge label={r.autoLeads ? 'Gets leads automatically' : 'No leads'} tone={r.autoLeads ? 'success' : 'neutral'} size="sm" />
                  <StatusBadge label={r.instructions ? 'Gets instructions' : 'No instructions'} tone={r.instructions ? 'info' : 'neutral'} size="sm" />
                </span>
              </span>
              <ActionForm action={deleteJobRoleAction}>
                <input type="hidden" name="roleId" value={r.id} />
                <Button type="submit" variant="ghost" size="touch" disabled={r.people > 0} title={r.people > 0 ? 'Change these people’s role first' : undefined}>
                  Remove
                </Button>
              </ActionForm>
            </div>
          ))}
        </div>
        <ActionForm action={createJobRoleAction} resetOnSuccess>
          <p className="font-medium">New role</p>
          <TextField label="Role name" name="name" required minLength={2} maxLength={60} placeholder="e.g. Installer, Accounts, Designer" />
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Does this role get leads automatically?</legend>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="radio" name="autoLeads" value="yes" required className="size-5 accent-primary" /> Yes — leads come to them in turn, like a call agent
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="radio" name="autoLeads" value="no" className="size-5 accent-primary" /> No — they do not work leads
            </label>
          </fieldset>
          <fieldset className="space-y-1">
            <legend className="text-sm font-medium">Does this role get work instructions?</legend>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="radio" name="instructions" value="yes" required defaultChecked className="size-5 accent-primary" /> Yes — managers / colleagues can give them work (Instructions tab)
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="radio" name="instructions" value="no" className="size-5 accent-primary" /> No
            </label>
          </fieldset>
          <Button type="submit" size="touch">
            Add role
          </Button>
        </ActionForm>
      </div>
    </SectionCard>
  )
}
