'use client'

import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Cloud, Database, FileSpreadsheet, Info, Key, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { SubmitButton } from '@/components/common/submit-button'
import { backupDatabaseToGoogleDriveAction, backupLeadsToGoogleDriveAction } from '@/server/actions'
import type { GoogleDriveConfigStatus } from '@/server/services/google-drive-backup'

export function GoogleDriveBackupCard({ config }: { config: GoogleDriveConfigStatus }) {
  const [showGuide, setShowGuide] = useState(!config.isConfigured)

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cloud className="size-5 text-primary" aria-hidden />
            <h3 className="font-semibold text-lg">Google Drive Backup ({config.targetEmail})</h3>
          </div>
          <p className="text-xs text-muted-foreground">
            Archive all customer leads and complete database snapshots directly into Google Drive for <strong>{config.targetEmail}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {config.isConfigured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-success-soft px-3 py-1 text-xs font-semibold text-tone-success-soft-foreground">
              <CheckCircle2 className="size-3.5" aria-hidden />
              <span>Drive Ready</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-warning-soft px-3 py-1 text-xs font-semibold text-tone-warning-soft-foreground">
              <Key className="size-3.5" aria-hidden />
              <span>Setup Required</span>
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <ActionForm action={backupLeadsToGoogleDriveAction}>
          <SubmitButton size="touch" className="gap-2">
            <FileSpreadsheet className="size-4" aria-hidden />
            <span>Backup All Leads to Google Drive</span>
          </SubmitButton>
        </ActionForm>

        <ActionForm action={backupDatabaseToGoogleDriveAction}>
          <SubmitButton size="touch" variant="outline" className="gap-2">
            <Database className="size-4" aria-hidden />
            <span>Backup Full Database to Google Drive</span>
          </SubmitButton>
        </ActionForm>

        <Button
          type="button"
          variant="ghost"
          size="touch"
          onClick={() => setShowGuide(!showGuide)}
          className="gap-1.5 text-xs text-muted-foreground"
        >
          <span>{showGuide ? 'Hide Setup Steps' : 'View Setup Steps (.env)'}</span>
          {showGuide ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
        </Button>
      </div>

      {showGuide && (
        <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
            <ShieldCheck className="size-4 text-primary" aria-hidden />
            <span>How to connect your Google Drive account ({config.targetEmail})</span>
          </div>

          <p>
            Google requires a free <strong>Google Cloud Service Account</strong> to allow automated background uploads directly into your Drive folder:
          </p>

          <ol className="list-decimal space-y-2.5 ps-4 text-foreground/90">
            <li>
              <strong>Create a Google Cloud Project:</strong> Go to{' '}
              <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="text-primary underline">
                Google Cloud Console
              </a>
              , create a new free project, and enable the <strong>Google Drive API</strong>.
            </li>
            <li>
              <strong>Create a Service Account:</strong> In <em>APIs & Services → Credentials</em>, click <strong>Create Credentials → Service Account</strong> (e.g. <code>volton-backup-agent</code>). Under Keys, click <strong>Add Key → Create new key (JSON)</strong>.
            </li>
            <li>
              <strong>Share a Drive Folder:</strong> Open your Google Drive at <strong>{config.targetEmail}</strong>, create a folder (e.g. <code>VoltOn CRM Backups</code>), and share this folder with the <em>Service Account email address</em> (granting Editor permission). Copy the folder ID from the URL.
            </li>
            <li>
              <strong>Add credentials to <code>.env</code>:</strong>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-card p-3 font-mono text-xs text-foreground ring-1 ring-border">
{`# Google Drive Backup Configuration for ${config.targetEmail}
GOOGLE_DRIVE_BACKUP_EMAIL="${config.targetEmail}"
GOOGLE_SERVICE_ACCOUNT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\nYour_Key_Here\\n-----END PRIVATE KEY-----"
GOOGLE_DRIVE_FOLDER_ID="your_google_drive_folder_id_here"`}
              </pre>
            </li>
          </ol>

          <div className="flex items-center gap-2 rounded-lg bg-tone-info-soft p-2.5 text-tone-info-soft-foreground">
            <Info className="size-4 shrink-0" aria-hidden />
            <span>Once these 3 keys are in your <code>.env</code> file, clicking either backup button above will instantly upload directly into your Google Drive!</span>
          </div>
        </div>
      )}
    </div>
  )
}
