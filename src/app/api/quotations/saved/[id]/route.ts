import { NextResponse } from 'next/server'
import { getSessionUser } from '@/server/auth/session'
import { getSavedQuotationFor } from '@/server/services/saved-quotations'

export const dynamic = 'force-dynamic'

/** One saved quotation with its full form (input JSON) — fills the quotation form when picked. */
export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const saved = await getSavedQuotationFor(user, id)
  if (!saved) return NextResponse.json({ error: 'not found' }, { status: 404 })
  return NextResponse.json({ saved }, { headers: { 'Cache-Control': 'private, no-store' } })
}
