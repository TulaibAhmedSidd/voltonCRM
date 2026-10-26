'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Database, HardDrive, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionForm, type FormState } from '@/components/common/action-form'
import { SubmitButton } from '@/components/common/submit-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { triggerAutomatedBackupAction, wipeBackupDatabaseAction, wipeDevDatabaseAction } from '@/server/actions'
import type { AllDatabasesStorageStats, DatabaseStorageStats } from '@/server/services/backup'

function DbStatItem({
  label,
  name,
  stats,
  canWipe,
  onWipeAction,
  wipeTitle,
  wipeDescription,
}: {
  label: string
  name: string
  stats: DatabaseStorageStats
  canWipe?: boolean
  onWipeAction?: (state: FormState, formData: FormData) => Promise<FormState>
  wipeTitle?: string
  wipeDescription?: string
}) {
  const [openWipe, setOpenWipe] = useState(false)

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="size-4 text-primary" aria-hidden />
            <span className="font-semibold text-sm">{label}</span>
          </div>
          <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground">
            {name}
          </span>
        </div>

        <div>
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-2xl font-bold tracking-tight">{stats.totalUsedMb} MB</span>
            <span className="text-xs text-muted-foreground">of {stats.freeTierLimitMb} MB</span>
          </div>
          {/* Free Tier Progress Bar */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(1, stats.percentUsed))}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>{stats.percentUsed}% used</span>
            <span className="font-medium text-tone-success-soft-foreground">
              {stats.remainingMb} MB free
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border pt-2 text-xs">
          <div>
            <span className="text-muted-foreground">Storage size:</span>
            <span className="block font-medium">{stats.storageSizeMb} MB</span>
          </div>
          <div>
            <span className="text-muted-foreground">Index size:</span>
            <span className="block font-medium">{stats.indexSizeMb} MB</span>
          </div>
          <div>
            <span className="text-muted-foreground">Collections:</span>
            <span className="block font-medium">{stats.collectionsCount}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Total records:</span>
            <span className="block font-medium">{stats.objectsCount}</span>
          </div>
        </div>
      </div>

      {canWipe && onWipeAction ? (
        <div className="border-t border-border pt-3 mt-3">
          <Dialog open={openWipe} onOpenChange={setOpenWipe}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="touch"
                className="w-full gap-2 border-tone-danger/30 text-tone-danger-soft-foreground hover:bg-tone-danger-soft"
              >
                <Trash2 className="size-4" aria-hidden />
                <span>Wipe Database</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-tone-danger-soft-foreground">
                  <AlertTriangle className="size-5" aria-hidden />
                  <span>{wipeTitle ?? 'Confirm Database Wipe'}</span>
                </DialogTitle>
                <DialogDescription>
                  {wipeDescription ?? `Are you sure you want to completely wipe all collections in ${name}? This action cannot be undone.`}
                </DialogDescription>
              </DialogHeader>

              <div className="rounded-xl border border-tone-danger/30 bg-tone-danger-soft p-3 text-xs text-tone-danger-soft-foreground">
                <span className="font-semibold">Destructive Action:</span> All {stats.objectsCount} documents across {stats.collectionsCount} collections in {name} will be permanently deleted. The primary production database will not be affected.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="touch" onClick={() => setOpenWipe(false)}>
                  Cancel
                </Button>
                <ActionForm action={onWipeAction} onSuccess={() => setOpenWipe(false)}>
                  <SubmitButton
                    size="touch"
                    className="bg-tone-danger-soft text-tone-danger-soft-foreground hover:bg-tone-danger-soft/90"
                  >
                    Confirm Wipe
                  </SubmitButton>
                </ActionForm>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      ) : null}
    </div>
  )
}

export function DbStorageCard({
  stats,
  isAdmin,
}: {
  stats: AllDatabasesStorageStats
  isAdmin: boolean
}) {
  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HardDrive className="size-5 text-primary" aria-hidden />
            <h3 className="font-semibold text-lg">MongoDB Atlas Storage & Databases</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Combined active usage across Production, Development, and Backup databases on MongoDB Free Tier (512 MB limit each).
          </p>
        </div>

        <ActionForm action={triggerAutomatedBackupAction}>
          <SubmitButton size="touch" className="gap-2">
            <RefreshCw className="size-4" aria-hidden />
            <span>Backup Database Now</span>
          </SubmitButton>
        </ActionForm>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DbStatItem
          label="Main Database (Prod)"
          name="volton_crm"
          stats={stats.main}
          canWipe={false}
        />

        <DbStatItem
          label="Dev Database"
          name="volton_crm_dev"
          stats={stats.dev}
          canWipe={isAdmin}
          onWipeAction={wipeDevDatabaseAction}
          wipeTitle="Wipe Development Database"
          wipeDescription="Are you sure you want to wipe volton_crm_dev? It will reset the dev database so you can re-sync from main."
        />

        <DbStatItem
          label="Backup Database"
          name="volton_crm_backup"
          stats={stats.backup}
          canWipe={isAdmin}
          onWipeAction={wipeBackupDatabaseAction}
          wipeTitle="Wipe Backup Database"
          wipeDescription="Are you sure you want to wipe volton_crm_backup? A fresh backup will mirror data again on the next automated cycle or manual backup."
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-tone-success-soft-foreground" aria-hidden />
          <span>Combined Total Used: <strong className="text-foreground">{stats.combinedUsedMb} MB</strong></span>
        </div>
        <span>Free Tier: 512 MB storage + indexes per cluster database</span>
      </div>
    </div>
  )
}
