'use client'

import { useState } from 'react'
import { AlertTriangle, BellOff, FileText, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { SubmitButton } from '@/components/common/submit-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { purgeAllJunkLeadsAction, purgeNotificationsAction, purgeSystemLogsAction } from '@/server/actions'

export function CrmCleanupCard({
  junkLeadsCount,
  notificationsCount,
  logsCount,
  isAdmin,
}: {
  junkLeadsCount: number
  notificationsCount: number
  logsCount: number
  isAdmin: boolean
}) {
  const [openJunk, setOpenJunk] = useState(false)
  const [openNotifs, setOpenNotifs] = useState(false)
  const [openLogs, setOpenLogs] = useState(false)

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Trash2 className="size-5 text-tone-danger-soft-foreground" aria-hidden />
          <h3 className="font-semibold text-lg">CRM Data Cleanup & Storage Pruning</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Safely clean up clutter, purge junk leads, and clear old notifications to keep MongoDB storage fast and within the 512 MB free tier.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {/* Junk Leads Deletion */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-muted/20 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">Junk Leads</span>
              <span className="rounded-full bg-tone-danger-soft px-2 py-0.5 text-xs font-semibold text-tone-danger-soft-foreground">
                {junkLeadsCount} leads
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Permanently purge all leads currently marked as junk or invalid across the system.
            </p>
          </div>

          <div className="pt-3">
            <Dialog open={openJunk} onOpenChange={setOpenJunk}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="touch"
                  disabled={junkLeadsCount === 0}
                  className="w-full gap-2 border-tone-danger/30 text-tone-danger-soft-foreground hover:bg-tone-danger-soft"
                >
                  <Trash2 className="size-4" aria-hidden />
                  <span>Purge All Junk Leads</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-tone-danger-soft-foreground">
                    <AlertTriangle className="size-5" aria-hidden />
                    <span>Purge All Junk Leads</span>
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to permanently delete all {junkLeadsCount} junk leads?
                  </DialogDescription>
                </DialogHeader>

                <p className="text-xs text-muted-foreground">
                  This action removes the junk leads, their follow-ups, and activity history from the database to save space.
                </p>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="touch" onClick={() => setOpenJunk(false)}>
                    Cancel
                  </Button>
                  <ActionForm action={purgeAllJunkLeadsAction} onSuccess={() => setOpenJunk(false)}>
                    <SubmitButton
                      size="touch"
                      className="bg-tone-danger-soft text-tone-danger-soft-foreground hover:bg-tone-danger-soft/90"
                    >
                      Confirm Purge
                    </SubmitButton>
                  </ActionForm>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Notifications Deletion */}
        <div className="flex flex-col justify-between rounded-xl border border-border bg-muted/20 p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">System Notifications</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                {notificationsCount} alerts
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Clear read and accumulated in-app notification alerts for all users.
            </p>
          </div>

          <div className="pt-3">
            <Dialog open={openNotifs} onOpenChange={setOpenNotifs}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="touch"
                  disabled={notificationsCount === 0}
                  className="w-full gap-2"
                >
                  <BellOff className="size-4" aria-hidden />
                  <span>Clear Notifications</span>
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <BellOff className="size-5" aria-hidden />
                    <span>Clear All Notifications</span>
                  </DialogTitle>
                  <DialogDescription>
                    Are you sure you want to clear {notificationsCount} notification alerts?
                  </DialogDescription>
                </DialogHeader>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="touch" onClick={() => setOpenNotifs(false)}>
                    Cancel
                  </Button>
                  <ActionForm action={purgeNotificationsAction} onSuccess={() => setOpenNotifs(false)}>
                    <SubmitButton size="touch">
                      Confirm Clear
                    </SubmitButton>
                  </ActionForm>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* System Logs & Sheet Ingest Deletion (Admin Only) */}
        {isAdmin ? (
          <div className="flex flex-col justify-between rounded-xl border border-border bg-muted/20 p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">Sheet Ingest & Cached Rows</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                  {logsCount} rows
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Clear cached Google Sheet sync rows. Fresh rows are pulled automatically on next sync.
              </p>
            </div>

            <div className="pt-3">
              <Dialog open={openLogs} onOpenChange={setOpenLogs}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="touch"
                    disabled={logsCount === 0}
                    className="w-full gap-2"
                  >
                    <FileText className="size-4" aria-hidden />
                    <span>Trim Sheet Cache</span>
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <FileText className="size-5" aria-hidden />
                      <span>Trim Sheet Cache Rows</span>
                    </DialogTitle>
                    <DialogDescription>
                      Are you sure you want to clear {logsCount} cached sheet rows?
                    </DialogDescription>
                  </DialogHeader>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button type="button" variant="outline" size="touch" onClick={() => setOpenLogs(false)}>
                      Cancel
                    </Button>
                    <ActionForm action={purgeSystemLogsAction} onSuccess={() => setOpenLogs(false)}>
                      <SubmitButton size="touch">
                        Confirm Trim
                      </SubmitButton>
                    </ActionForm>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
