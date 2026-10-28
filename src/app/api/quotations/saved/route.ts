import { NextResponse, type NextRequest } from 'next/server'
import { getSessionUser } from '@/server/auth/session'
import { listSavedQuotations } from '@/server/services/saved-quotations'

export const dynamic = 'force-dynamic'

/** Saved quotations the signed-in person can use (most recently used first), for "Start from a saved quotation". ?q= searches. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const rows = await listSavedQuotations(user, { q: request.nextUrl.searchParams.get('q') ?? undefined })
  return NextResponse.json({ rows }, { headers: { 'Cache-Control': 'private, no-store' } })
}
