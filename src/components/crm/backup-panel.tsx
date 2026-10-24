'use client'

import { useState } from 'react'
import { CheckCircle2, Clock, Database, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { StatusBadge } from '@/components/common/status-badge'
import { SubmitButton } from '@/components/common/submit-button'
import { triggerAutomatedBackupAction, restoreBackupAction } from '@/server/actions'
import { formatPktDateTime } from '@/lib/dates-pkt'

export interface BackupHistoryItem {
  id: string
  timestamp: string
  status: string
  trigger: string
  counts: Record<string, number>
  sizeBytes: number
  checksum?: string | null
  error?: string | null
}

export function BackupPanel({ backups = [] }: { backups: BackupHistoryItem[] }) {
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null)

  function formatBytes(bytes: number) {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  return (
    <div className="space-y-6">
      {/* 30-Day Automated Schedule Status Card */}
      <div className="space-y-4 rounded-xl border border-tone-success/30 bg-tone-success-soft p-5 text-tone-success-soft-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
              <ShieldCheck className="size-5" aria-hidden />
            </div>
            <div>
              <h3 className="font-semibold text-base">Automated 30-Day Backup Active</h3>
              <p className="text-xs opacity-90">
                Full snapshots run automatically every 30 days. Includes leads, customers, WhatsApp messages, quotations, follow-ups, and configuration.
              </p>
            </div>
          </div>

          <ActionForm action={triggerAutomatedBackupAction}>
            <SubmitButton size="touch" className="gap-2">
              <RefreshCw className="size-4" aria-hidden />
              <span>Run Backup Now</span>
            </SubmitButton>
          </ActionForm>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-tone-success/20 pt-3 text-xs">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden />
            <span>Cycle: Every 30 days</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Database className="size-3.5" aria-hidden />
            <span>Storage: Encrypted JSON Snapshots with SHA-256 verification</span>
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5" aria-hidden />
            <span>Total backups on record: {backups.length}</span>
          </span>
        </div>
      </div>

      {/* Backups List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-sm text-foreground">Backup Snapshots History</h4>

        {backups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Database className="mx-auto size-8 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">No backups created yet</p>
            <p className="text-xs text-muted-foreground">
              The automated job runs on a 30-day schedule, or you can create one immediately using &ldquo;Run Backup Now&rdquo; above.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Records Included</th>
                  <th className="px-4 py-3 text-right">Restore</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {backups.map((b) => {
                  const counts = b.counts || {}
                  const summary = [
                    counts.leads ? `${counts.leads} leads` : null,
                    counts.contacts ? `${counts.contacts} contacts` : null,
                    counts.quotations ? `${counts.quotations} quotations` : null,
                    counts.messages ? `${counts.messages} msgs` : null,
                    counts.followUps ? `${counts.followUps} follow-ups` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')

                  const isConfirming = confirmRestoreId === b.id

                  return (
                    <tr key={b.id} className="transition-colors hover:bg-muted/20">
                      <td className="whitespace-nowrap px-4 py-3 font-medium">
                        {formatPktDateTime(new Date(b.timestamp))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs capitalize text-muted-foreground">
                        {b.trigger === 'scheduled' ? 'Automated 30-day' : 'Manual Trigger'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge
                          label={b.status}
                          tone={
                            b.status === 'completed'
                              ? 'success'
                              : b.status === 'failed'
                              ? 'danger'
                              : 'warning'
                          }
                          size="sm"
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs tabular-nums text-muted-foreground">
                        {formatBytes(b.sizeBytes)}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {b.error ? (
                          <span className="text-tone-danger-soft-foreground">{b.error}</span>
                        ) : (
                          summary || 'Essential collections'
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        {b.status === 'completed' ? (
                          isConfirming ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <ActionForm action={restoreBackupAction}>
                                <input type="hidden" name="backupId" value={b.id} />
                                <SubmitButton
                                  size="touch"
                                  className="h-8 bg-tone-danger-soft text-tone-danger-soft-foreground hover:bg-tone-danger-soft/80 text-xs px-2.5"
                                  pendingText="Restoring…"
                                >
                                  Confirm Restore
                                </SubmitButton>
                              </ActionForm>
                              <Button
                                type="button"
                                variant="ghost"
                                size="touch"
                                className="h-8 text-xs px-2"
                                onClick={() => setConfirmRestoreId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="touch"
                              className="h-8 gap-1.5 text-xs"
                              onClick={() => setConfirmRestoreId(b.id)}
                            >
                              <RotateCcw className="size-3" aria-hidden />
                              <span>Restore</span>
                            </Button>
                          )
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
