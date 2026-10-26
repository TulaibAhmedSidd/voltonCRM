'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Database, HardDrive, Info, RefreshCw, Trash2 } from 'lucide-react'
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
  clusterTotalMb,
  canWipe,
  onWipeAction,
  wipeTitle,
  wipeDescription,
}: {
  label: string
  name: string
  stats: DatabaseStorageStats
  clusterTotalMb: number
  canWipe?: boolean
  onWipeAction?: (state: FormState, formData: FormData) => Promise<FormState>
  wipeTitle?: string
  wipeDescription?: string
}) {
  const [openWipe, setOpenWipe] = useState(false)
  const shareOfCluster = clusterTotalMb > 0 ? ((stats.totalUsedMb / 512) * 100).toFixed(1) : '0'

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
            <span className="text-xs text-muted-foreground">{shareOfCluster}% of 512 MB cluster</span>
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Storage: {stats.storageSizeMb} MB</span>
            <span>Index: {stats.indexSizeMb} MB</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border pt-2 text-xs">
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
                <span className="font-semibold">Destructive Action:</span> All {stats.objectsCount} documents across {stats.collectionsCount} collections in {name} will be permanently deleted. This will immediately free {stats.totalUsedMb} MB in your shared 512 MB Atlas cluster. Primary database is unaffected.
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
  const CLUSTER_LIMIT_MB = 512
  const clusterUsedMb = stats.combinedUsedMb
  const clusterRemainingMb = Number(Math.max(0, CLUSTER_LIMIT_MB - clusterUsedMb).toFixed(2))
  const clusterPercentUsed = Number(((clusterUsedMb / CLUSTER_LIMIT_MB) * 100).toFixed(1))

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <HardDrive className="size-5 text-primary" aria-hidden />
            <h3 className="font-semibold text-lg">Single 512 MB Cluster Storage Overview</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            All databases (Production, Dev, and Backup) share one 512 MB MongoDB Atlas Free Tier cluster quota.
          </p>
        </div>

        <ActionForm action={triggerAutomatedBackupAction}>
          <SubmitButton size="touch" className="gap-2">
            <RefreshCw className="size-4" aria-hidden />
            <span>Backup Database Now</span>
          </SubmitButton>
        </ActionForm>
      </div>

      {/* Cluster Unified Progress Bar */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold tracking-tight">{clusterUsedMb} MB</span>
            <span className="text-sm text-muted-foreground">total cluster storage used of {CLUSTER_LIMIT_MB} MB</span>
          </div>
          <span className="text-sm font-semibold text-tone-success-soft-foreground">
            {clusterRemainingMb} MB remaining free ({clusterPercentUsed}% used)
          </span>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${Math.min(100, Math.max(1, clusterPercentUsed))}%` }}
          />
        </div>

        <div className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
          <Info className="size-4 shrink-0 text-primary mt-0.5" aria-hidden />
          <span>
            <strong>Cluster Notice:</strong> Because this is a single MongoDB Free Tier cluster (512 MB total), data in <code>volton_crm_dev</code> and <code>volton_crm_backup</code> collectively consumes the same shared storage quota. Wiping unused dev or backup databases instantly recovers space for your live CRM data.
          </span>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <DbStatItem
          label="Main Database (Prod)"
          name="volton_crm"
          stats={stats.main}
          clusterTotalMb={CLUSTER_LIMIT_MB}
          canWipe={false}
        />

        <DbStatItem
          label="Dev Database"
          name="volton_crm_dev"
          stats={stats.dev}
          clusterTotalMb={CLUSTER_LIMIT_MB}
          canWipe={isAdmin}
          onWipeAction={wipeDevDatabaseAction}
          wipeTitle="Wipe Development Database"
          wipeDescription="Are you sure you want to wipe volton_crm_dev? It will permanently delete dev records and immediately free cluster space."
        />

        <DbStatItem
          label="Backup Database"
          name="volton_crm_backup"
          stats={stats.backup}
          clusterTotalMb={CLUSTER_LIMIT_MB}
          canWipe={isAdmin}
          onWipeAction={wipeBackupDatabaseAction}
          wipeTitle="Wipe Backup Database"
          wipeDescription="Are you sure you want to wipe volton_crm_backup? It will permanently delete the backup copy and immediately free cluster space."
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="size-4 text-tone-success-soft-foreground" aria-hidden />
          <span>Cluster Status: <strong className="text-foreground">Healthy ({clusterRemainingMb} MB available)</strong></span>
        </div>
        <span>MongoDB Atlas M0 Free Tier (Single Cluster)</span>
      </div>
    </div>
  )
}
