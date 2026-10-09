import { NextResponse, type NextRequest } from 'next/server'
import { quotationInput } from '@/domain/quotation'
import { getSessionUser } from '@/server/auth/session'
import { buildQuotationPdf } from '@/server/services/quotation-pdf'
import { getQuotationFor } from '@/server/services/quotations'

/** The quotation PDF, rebuilt from the saved snapshot. ?download=1 saves the file; otherwise it opens in the browser. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { id } = await ctx.params
  const q = await getQuotationFor(user, id)
  if (!q) return NextResponse.json({ error: 'not found' }, { status: 404 })
  const input = quotationInput.parse(q.input)
  const pdf = buildQuotationPdf({ quotationNo: q.quotationNo, leadNo: q.leadNo, issuedAt: q.issuedAt, validUntil: q.validUntil, customer: q.customer, preparedBy: q.preparedBy, input })
  const safeName = q.customer.name.replace(/[^A-Za-z0-9 ]/g, '').trim().replace(/\s+/g, '-').slice(0, 40) || 'customer'
  const disposition = request.nextUrl.searchParams.get('download') ? 'attachment' : 'inline'
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="Volton-Quotation-${q.quotationNo}-${safeName}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
