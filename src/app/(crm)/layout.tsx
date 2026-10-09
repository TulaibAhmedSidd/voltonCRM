import { redirect } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AppShell } from '@/components/common/app-shell'
import { NotificationBell } from '@/components/crm/notification-bell'
import { RefreshButton } from '@/components/common/refresh-button'
import { InstallPrompt } from '@/components/common/pwa'
import { PushPrompt } from '@/components/common/push-prompt'
import { pushPublicKey } from '@/server/services/push'
import { requireUser } from '@/server/auth/session'
import { logoutAction } from '@/server/actions'

export default async function CrmLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser()
  // Password chosen by an admin/manager: the person must set their own before using the app.
  if (user.mustChangePassword) redirect('/change-password')
  const pushKey = pushPublicKey()
  return (
    <AppShell
      role={user.role}
      userName={user.name}
      actions={
        <>
          <RefreshButton />
          <NotificationBell pushKey={pushKey} />
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="icon-touch" aria-label="Sign out">
              <LogOut />
            </Button>
          </form>
        </>
      }
    >
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 md:px-6">
        <InstallPrompt />
        <PushPrompt pushKey={pushKey} />
        {children}
      </div>
    </AppShell>
  )
}
