'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Cloud, Database, FileSpreadsheet, Info, Key, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ActionForm } from '@/components/common/action-form'
import { SubmitButton } from '@/components/common/submit-button'
import { backupDatabaseToGoogleDriveAction, backupLeadsToGoogleDriveAction } from '@/server/actions'
import type { GoogleDriveConfigStatus } from '@/server/services/google-drive-backup'

export function GoogleDriveBackupCard({ config }: { config: GoogleDriveConfigStatus }) {
  return (
    <Suspense fallback={<div className="h-40 rounded-2xl border border-border bg-card p-5 animate-pulse" />}>
      <GoogleDriveBackupCardInner config={config} />
    </Suspense>
  )
}

function GoogleDriveBackupCardInner({ config }: { config: GoogleDriveConfigStatus }) {
  const [showGuide, setShowGuide] = useState(!config.isConfigured && !config.isOAuthConnected)
  const searchParams = useSearchParams()
  const justConnected = searchParams.get('google_drive_connected') === 'true'
  const oauthError = searchParams.get('oauth_error')

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
          {config.isOAuthConnected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-success-soft px-3 py-1 text-xs font-semibold text-tone-success-soft-foreground">
              <CheckCircle2 className="size-3.5" aria-hidden />
              <span>OAuth 2.0 Connected (15 GB Quota)</span>
            </span>
          ) : config.isConfigured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-info-soft px-3 py-1 text-xs font-semibold text-tone-info-soft-foreground">
              <CheckCircle2 className="size-3.5" aria-hidden />
              <span>Service Account Configured</span>
            </span>
          ) : config.hasOAuth ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-warning-soft px-3 py-1 text-xs font-semibold text-tone-warning-soft-foreground">
              <Key className="size-3.5" aria-hidden />
              <span>Authorization Required</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-tone-warning-soft px-3 py-1 text-xs font-semibold text-tone-warning-soft-foreground">
              <Key className="size-3.5" aria-hidden />
              <span>Setup Required</span>
            </span>
          )}
        </div>
      </div>

      {justConnected && (
        <div className="flex items-center gap-2 rounded-xl bg-tone-success-soft p-3 text-xs text-tone-success-soft-foreground">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          <span>Google Drive account (<strong>{config.targetEmail}</strong>) has been connected successfully via OAuth 2.0! Backups will now use your personal 15 GB quota.</span>
        </div>
      )}

      {oauthError && (
        <div className="flex items-center gap-2 rounded-xl bg-tone-danger-soft p-3 text-xs text-tone-danger-soft-foreground">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          <span>Google OAuth authorization encountered an issue: <code>{oauthError}</code>. Please retry connecting.</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        {config.hasOAuth && !config.isOAuthConnected && (
          <Button asChild size="touch" className="gap-2">
            <a href="/api/auth/google/drive">
              <Key className="size-4" aria-hidden />
              <span>1-Click Connect Google Drive ({config.targetEmail})</span>
            </a>
          </Button>
        )}

        <ActionForm action={backupLeadsToGoogleDriveAction}>
          <SubmitButton size="touch" className="gap-2" disabled={!config.isConfigured && !config.isOAuthConnected}>
            <FileSpreadsheet className="size-4" aria-hidden />
            <span>Backup All Leads to Google Drive</span>
          </SubmitButton>
        </ActionForm>

        <ActionForm action={backupDatabaseToGoogleDriveAction}>
          <SubmitButton size="touch" variant="outline" className="gap-2" disabled={!config.isConfigured && !config.isOAuthConnected}>
            <Database className="size-4" aria-hidden />
            <span>Backup Full Database to Google Drive</span>
          </SubmitButton>
        </ActionForm>

        {config.isOAuthConnected && (
          <Button asChild variant="ghost" size="touch" className="text-xs text-muted-foreground">
            <a href="/api/auth/google/drive">
              <span>Reconnect Google Account</span>
            </a>
          </Button>
        )}

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
            You can connect Google Drive via <strong>OAuth 2.0 (Recommended)</strong> to utilize your personal 15 GB quota directly:
          </p>

          <ol className="list-decimal space-y-2.5 ps-4 text-foreground/90">
            <li>
              <strong>Create OAuth Client ID:</strong> In Google Cloud Console under <em>APIs & Services → Credentials</em>, create an OAuth Client ID for <strong>Web application</strong>. Add redirect URI <code>http://localhost:3000/api/auth/google/drive/callback</code> (and your live Vercel URL).
            </li>
            <li>
              <strong>Add credentials to <code>.env</code>:</strong>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-card p-3 font-mono text-xs text-foreground ring-1 ring-border">
{`# Google Drive Backup Configuration for ${config.targetEmail}
GOOGLE_DRIVE_BACKUP_EMAIL="${config.targetEmail}"
GOOGLE_CLIENT_ID="your_client_id_here"
GOOGLE_CLIENT_SECRET="your_client_secret_here"
GOOGLE_DRIVE_FOLDER_ID="${config.folderId ?? 'your_drive_folder_id'}"`}
              </pre>
            </li>
            <li>
              <strong>Click the Connect Button:</strong> Click the <strong>1-Click Connect Google Drive</strong> button above, sign into <strong>{config.targetEmail}</strong>, and grant permission. The CRM will automatically receive the permanent refresh token and handle all future backups!
            </li>
          </ol>

          <div className="flex items-center gap-2 rounded-lg bg-tone-info-soft p-2.5 text-tone-info-soft-foreground">
            <Info className="size-4 shrink-0" aria-hidden />
            <span>Once connected, backups are uploaded straight into your Google Drive folder using your personal 15 GB storage quota!</span>
          </div>
        </div>
      )}
    </div>
  )
}

