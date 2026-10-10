/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ExportLeads } from '@/components/crm/export-leads'

const hidden = (container: HTMLElement) => Object.fromEntries([...container.querySelectorAll<HTMLInputElement>('input[type=hidden]')].map((i) => [i.name, i.value]))

describe('ExportLeads (Download Excel report)', () => {
  it('sends the chosen period, several sources at once, which leads and the employee', () => {
    const { container } = render(<ExportLeads filters={{}} agents={[{ id: 'a'.repeat(24), name: 'Ifran' }]} />)
    expect(hidden(container)).toMatchObject({ period: 'this_month', basis: 'received' })
    fireEvent.click(screen.getByRole('button', { name: 'This week' }))
    fireEvent.click(screen.getByRole('button', { name: 'Facebook' }))
    fireEvent.click(screen.getByRole('button', { name: 'WhatsApp (all)' }))
    fireEvent.click(screen.getByRole('button', { name: 'Website' }))
    fireEvent.change(screen.getByLabelText('Employee'), { target: { value: 'a'.repeat(24) } })
    expect(hidden(container)).toMatchObject({ period: 'this_week', sources: 'facebook,whatsapp,website', agent: 'a'.repeat(24) })
    expect(screen.getByText(/You will get:/).parentElement?.textContent).toContain('Facebook + WhatsApp (all) + Website · This week · leads received · Ifran')
    fireEvent.click(screen.getByRole('button', { name: 'All sources' }))
    expect(hidden(container).sources).toBeUndefined()
  })

  it('From – To dates replace the period; Download waits for a date', () => {
    const { container } = render(<ExportLeads filters={{ source: 'instagram' }} />)
    expect(hidden(container).sources).toBe('instagram') // starts from the page filter
    fireEvent.click(screen.getByRole('button', { name: 'From – To dates' }))
    expect(screen.getByRole('button', { name: /Download Excel/ })).toBeDisabled()
    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-10-10' } })
    const h = hidden(container)
    expect(h).toMatchObject({ pfrom: '2026-10-01', pto: '2026-10-10' })
    expect(h.period).toBeUndefined()
    expect(screen.getByRole('button', { name: /Download Excel/ })).toBeEnabled()
  })
})
