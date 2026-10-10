/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CheckInCard } from '@/components/crm/check-in-card'

describe('Check out needs a second, deliberate tap', () => {
  it('one tap (or a double-tap from "Check in") does not check out; "Yes, check out" does', async () => {
    const onCheckOut = vi.fn()
    render(<CheckInCard status="checked_in" since="2026-10-10T09:43:20Z" onCheckIn={vi.fn()} onCheckOut={onCheckOut} onToggleBreak={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /Check out/ }))
    fireEvent.click(screen.getByRole('button', { name: /Cancel/ }))
    expect(onCheckOut).not.toHaveBeenCalled()
    expect(screen.queryByText(/Check out now\?/)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Check out/ }))
    expect(screen.getByText(/Check out now\?/)).toBeInTheDocument()
    expect(onCheckOut).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /Yes, check out/ }))
    await waitFor(() => expect(onCheckOut).toHaveBeenCalledTimes(1))
  })
})
