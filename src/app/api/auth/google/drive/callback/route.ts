import { NextResponse, type NextRequest } from 'next/server'
import { getSessionUser } from '@/server/auth/session'
import fs from 'node:fs'
import path from 'node:path'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'manager')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  const code = request.nextUrl.searchParams.get('code')
  const error = request.nextUrl.searchParams.get('error')

  if (error || !code) {
    const errorUrl = new URL(
      '/settings?section=crm-backups&oauth_error=' + encodeURIComponent(error || 'missing_code'),
      request.url,
    )
    return NextResponse.redirect(errorUrl)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/auth/google/drive/callback`

  if (!clientId || !clientSecret) {
    const errorUrl = new URL('/settings?section=crm-backups&oauth_error=missing_credentials', request.url)
    return NextResponse.redirect(errorUrl)
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const errText = await tokenRes.text()
      const errorUrl = new URL(
        '/settings?section=crm-backups&oauth_error=' + encodeURIComponent(errText),
        request.url,
      )
      return NextResponse.redirect(errorUrl)
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string
      refresh_token?: string
      expires_in: number
    }

    if (tokenData.refresh_token) {
      process.env.GOOGLE_OAUTH_REFRESH_TOKEN = tokenData.refresh_token

      // Persist to .env file if available in workspace
      try {
        const envPath = path.resolve(process.cwd(), '.env')
        if (fs.existsSync(envPath)) {
          let envContent = fs.readFileSync(envPath, 'utf8')
          if (envContent.includes('GOOGLE_OAUTH_REFRESH_TOKEN=')) {
            envContent = envContent.replace(
              /GOOGLE_OAUTH_REFRESH_TOKEN=.*/,
              `GOOGLE_OAUTH_REFRESH_TOKEN="${tokenData.refresh_token}"`,
            )
          } else {
            envContent += `\nGOOGLE_OAUTH_REFRESH_TOKEN="${tokenData.refresh_token}"\n`
          }
          fs.writeFileSync(envPath, envContent, 'utf8')
        }
      } catch (err) {
        console.error('Failed to write refresh token to .env:', err)
      }
    }

    const successUrl = new URL('/settings?section=crm-backups&google_drive_connected=true', request.url)
    return NextResponse.redirect(successUrl)
  } catch (err) {
    const errorUrl = new URL(
      '/settings?section=crm-backups&oauth_error=' +
        encodeURIComponent(err instanceof Error ? err.message : 'unknown'),
      request.url,
    )
    return NextResponse.redirect(errorUrl)
  }
}
