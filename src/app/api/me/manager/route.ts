import { NextResponse } from 'next/server'
import { getSessionUser } from '@/server/auth/session'
import { managerFor } from '@/server/services/manager-contact'

export const dynamic = 'force-dynamic'

/** The signed-in person's manager and their WhatsApp number (for "Send to manager" on quotations). */
export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const manager = await managerFor(user.id)
  return NextResponse.json({ manager: manager ? { name: manager.name, phone: manager.phone } : null }, { headers: { 'Cache-Control': 'private, no-store' } })
}
