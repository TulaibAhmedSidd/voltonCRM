import { NextResponse, type NextRequest } from 'next/server'
import { quotationInput } from '@/domain/quotation'
import { getServerEnv } from '@/lib/env'
import { connectDb } from '@/server/db/connection'
import { Quotation } from '@/server/db/models'
import { readQuoteToken } from '@/server/lib/quote-link'
import { hit } from '@/server/services/rate-limit'
import { buildQuotationPdf, templateOf } from '@/server/services/quotation-pdf'

/** The customer's link to their quotation PDF (sent on WhatsApp). No sign-in: the signed token is the key, 30 days. */
export async function GET(request: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  const secret = getServerEnv().AUTH_SECRET
  const { token } = await ctx.params
  const id = secret ? readQuoteToken(token, secret) : null
  if (!id) return new NextResponse('This quotation link has expired. Please ask Volton Solar for a new one.', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local'
  if ((await hit(`quote_link:${ip}`, 60, 10 * 60_000)).blocked) return new NextResponse('Too many requests — try again in a few minutes.', { status: 429 })
  await connectDb()
  const q = await Quotation.findById(id).lean()
  if (!q) return new NextResponse('Quotation not found.', { status: 404 })
  const input = quotationInput.parse(q.input)
  const pdf = await buildQuotationPdf({ quotationNo: q.quotationNo, leadNo: q.leadNo, issuedAt: q.issuedAt, validUntil: q.validUntil, customer: q.customer, preparedBy: q.preparedBy, input }, templateOf(q.input))
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="Volton-Quotation-${q.quotationNo}.pdf"`,
      'Cache-Control': 'private, max-age=300',
      'X-Robots-Tag': 'noindex',
    },
  })
}
