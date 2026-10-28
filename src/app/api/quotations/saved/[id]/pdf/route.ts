import { NextResponse, type NextRequest } from 'next/server'
import { QUOTE_ROLE_TITLE } from '@/domain/quotation'
import { getSessionUser } from '@/server/auth/session'
import { connectDb } from '@/server/db/connection'
import { User } from '@/server/db/models'
import { buildQuotationPdf, templateOf } from '@/server/services/quotation-pdf'
import { getSavedQuotationFor } from '@/server/services/saved-quotations'

export const dynamic = 'force-dynamic'

const DAY = 86_400_000

/**
 * A sample PDF of a saved quotation (no customer yet — "SAMPLE" in place of the number), prepared by the person who opens
 * it. ?download=1 saves the file; otherwise it opens in the browser.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const saved = await getSavedQuotationFor(user, id)
  if (!saved) return NextResponse.json({ error: 'not found' }, { status: 404 })
  await connectDb()
  const me = await User.findById(user.id).select('name role phone').lean()
  const issuedAt = new Date()
  const pdf = await buildQuotationPdf(
    {
      quotationNo: 'SAMPLE',
      leadNo: 'Saved quotation',
      issuedAt,
      validUntil: new Date(issuedAt.getTime() + saved.input.validityDays * DAY),
      customer: { name: 'Customer name', phone: '', address: '' },
      preparedBy: { name: me?.name ?? user.name, role: QUOTE_ROLE_TITLE[me?.role ?? user.role] ?? 'Sales', phone: me?.phone ?? '' },
      input: saved.input,
    },
    templateOf(saved.input, request.nextUrl.searchParams.get('template')),
  )
  const disposition = request.nextUrl.searchParams.get('download') ? 'attachment' : 'inline'
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="Volton-Saved-Quotation-${saved.systemKw || 'custom'}kW.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
