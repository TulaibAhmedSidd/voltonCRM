import { NextResponse, type NextRequest } from 'next/server'
import { getSessionUser } from '@/server/auth/session'

export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin' && user.role !== 'manager')) {
    return NextResponse.json({ error: 'Unauthorized. Admin or manager session required.' }, { status: 401 })
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID is not configured in .env' }, { status: 400 })
  }

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/auth/google/drive/callback`

  const targetUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  targetUrl.searchParams.set('client_id', clientId)
  targetUrl.searchParams.set('redirect_uri', redirectUri)
  targetUrl.searchParams.set('response_type', 'code')
  targetUrl.searchParams.set(
    'scope',
    'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/userinfo.email',
  )
  targetUrl.searchParams.set('access_type', 'offline')
  targetUrl.searchParams.set('prompt', 'consent')
  targetUrl.searchParams.set('state', 'google_drive_connect')

  return NextResponse.redirect(targetUrl.toString())
}
