/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { defaultQuotation } from '@/domain/quotation'

const createQuotationAction = vi.fn(async () => ({ ok: true, message: 'Quotation VO-1001 is ready (Rs 777,000).', quotationId: 'q1', quotationNo: 'VO-1001' }))
vi.mock('@/server/actions', () => ({ createQuotationAction: (...args: unknown[]) => createQuotationAction(...(args as [])) }))

const { QuotationBuilder } = await import('@/components/crm/quotation-builder')

const field = (label: string) => screen.getByLabelText(label, { exact: false, selector: 'input' }) as HTMLInputElement

describe('QuotationBuilder', () => {
  it('shows the live total, sends the filled quotation and offers the PDF', async () => {
    render(<QuotationBuilder leadId="lead1" initial={defaultQuotation(10)} quotations={[]} canCreate customer={{ name: 'Ali', phone: '+923001234567' }} />)
    // defaults: structure 20,000 + wiring 35,000 + labour 40,000
    expect(screen.getByText('Total Rs 95,000')).toBeInTheDocument()
    fireEvent.change(field('Price per panel'), { target: { value: '24500' } })
    fireEvent.change(screen.getAllByLabelText('Brand / model', { selector: 'input' })[0], { target: { value: 'LONGi Hi-MO X10 645W' } })
    fireEvent.change(screen.getAllByLabelText('Price each (Rs)', { selector: 'input' })[0], { target: { value: '290000' } })
    // 16 panels × 24,500 = 392,000 + inverter 290,000 + 95,000
    expect(screen.getByText('Total Rs 777,000')).toBeInTheDocument()
    expect(screen.getByText('Seven Lakh Seventy Seven Thousand Rupees Only')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Generate quotation PDF/ }))
    await waitFor(() => expect(createQuotationAction).toHaveBeenCalledTimes(1))
    const arg = (createQuotationAction.mock.calls[0] as unknown[])[0] as { leadId: string; markSent: boolean; quotation: Record<string, unknown> }
    expect(arg).toMatchObject({ leadId: 'lead1', markSent: true, quotation: { panelQty: 16, panelPrice: 24500, inverterPrice: 290000, systemType: 'hybrid' } })
    expect(await screen.findByText(/VO-1001 is ready/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open PDF/ })).toHaveAttribute('href', '/api/quotations/q1/pdf')
    expect(screen.getByRole('link', { name: /Download/ })).toHaveAttribute('href', '/api/quotations/q1/pdf?download=1')
  })

  it('lists earlier quotations and hides the form when the lead cannot be quoted', () => {
    render(
      <QuotationBuilder
        leadId="lead1"
        initial={defaultQuotation()}
        canCreate={false}
        customer={{ name: 'Ali', phone: '+923001234567' }}
        quotations={[{ id: 'q9', quotationNo: 'VO-1009', total: 1_202_800, systemKw: 8, issuedAt: '2026-10-09T08:00:00Z', validUntil: '2026-10-16T08:00:00Z', preparedBy: 'Asad' }]}
      />,
    )
    expect(screen.getByText('VO-1009')).toBeInTheDocument()
    expect(screen.getByText(/Rs 1,202,800/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Generate quotation PDF/ })).not.toBeInTheDocument()
  })
})
