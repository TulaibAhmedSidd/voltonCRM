import { NextResponse } from 'next/server'
import { getSessionUser } from '@/server/auth/session'
import { listNotifications } from '@/server/services/queries'

/** Unread alerts for the signed-in user. Ultra-lightweight endpoint. */
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  return NextResponse.json(await listNotifications(user.id))
}
