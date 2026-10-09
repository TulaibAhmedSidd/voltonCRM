import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { PasswordField } from '@/components/common/password-field'
import { requireUser } from '@/server/auth/session'
import { changePasswordAction, logoutAction } from '@/server/actions'

export const metadata = { title: 'Change password' }

/** First sign-in (password set by a manager/admin) and anytime from the menu. */
export default async function ChangePasswordPage() {
  const user = await requireUser()
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-heading text-xl font-semibold">{user.mustChangePassword ? `Welcome, ${user.name.split(' ')[0]}` : 'Change password'}</h1>
        <p className="text-sm text-muted-foreground">
          {user.mustChangePassword ? 'Choose your own password before you start. Only you will know it.' : 'Use at least 8 characters. Do not use your username or 12345678.'}
        </p>
      </div>
      <ActionForm action={changePasswordAction}>
        <PasswordField label={user.mustChangePassword ? 'Password you were given' : 'Current password'} name="current" autoComplete="current-password" required />
        <PasswordField label="New password" name="password" autoComplete="new-password" minLength={8} required />
        <PasswordField label="New password again" name="confirm" autoComplete="new-password" minLength={8} required />
        <Button type="submit" size="xl" className="w-full">
          Save new password
        </Button>
      </ActionForm>
      <div className="flex items-center justify-between text-sm">
        {!user.mustChangePassword ? (
          <Link href="/dashboard" className="underline">
            Back
          </Link>
        ) : (
          <span />
        )}
        <form action={logoutAction}>
          <button type="submit" className="min-h-11 text-muted-foreground underline">
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
