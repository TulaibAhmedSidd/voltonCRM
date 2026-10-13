/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/server/actions', () => ({ reopenLeadAction: vi.fn() }))
const { ReopenLeadCard } = await import('@/components/crm/reopen-lead-card')

describe('ReopenLeadCard', () => {
  it('offers New first and the same agent by default, then other agents and the queue', () => {
    render(
      <ReopenLeadCard
        leadId="lead1"
        closedAs="Lost — Not interested"
        pendingReview
        stages={[
          { value: 'new', label: 'New' },
          { value: 'contacted', label: 'Contacted' },
        ]}
        previousAgent={{ id: 'a1', name: 'Ifran Ahmed' }}
        agents={[
          { id: 'a1', name: 'Ifran Ahmed', checkedIn: true },
          { id: 'a2', name: 'Bilal Khan', checkedIn: false },
        ]}
      />,
    )
    expect(screen.getByText('This lead is closed: Lost — Not interested')).toBeInTheDocument()
    expect(screen.getByText(/settles the close waiting in Proof review/)).toBeInTheDocument()
    expect((screen.getByLabelText('Re-open as') as HTMLSelectElement).value).toBe('new')
    const giveTo = screen.getByLabelText('Give it to') as HTMLSelectElement
    expect(giveTo.value).toBe('same')
    expect([...giveTo.options].map((o) => o.text)).toEqual(['Back to Ifran Ahmed (same agent)', 'Bilal Khan · out', 'Next agent in order (asks to accept)'])
    expect(screen.getByRole('button', { name: /Re-open lead/ })).toBeInTheDocument()
  })
})
