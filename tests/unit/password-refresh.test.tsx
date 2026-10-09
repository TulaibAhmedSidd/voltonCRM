/** @vitest-environment jsdom */
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))

const { PasswordField, PasswordInput } = await import('@/components/common/password-field')
const { AutoRefresh } = await import('@/components/common/auto-refresh')

afterEach(() => {
  vi.useRealTimers()
  refresh.mockClear()
})

describe('password eye button', () => {
  it('hides by default and shows / hides on tap', () => {
    render(<PasswordField label="Password" name="password" />)
    const input = screen.getByLabelText('Password', { selector: 'input' }) as HTMLInputElement
    expect(input.type).toBe('password')
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(input.type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(input.type).toBe('password')
  })
  it('a temporary password can start visible; the eye button never submits the form', () => {
    const submit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <form onSubmit={submit}>
        <PasswordInput defaultVisible name="password" aria-label="Temporary password" />
      </form>,
    )
    expect((screen.getByLabelText('Temporary password') as HTMLInputElement).type).toBe('text')
    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(submit).not.toHaveBeenCalled()
  })
})

describe('AutoRefresh', () => {
  it('refreshes every minute while visible, not while typing or while leads are ticked', () => {
    vi.useFakeTimers()
    render(
      <div>
        <AutoRefresh busySelector='input[form="bulk-leads"]:checked' />
        <input aria-label="search" />
        <input type="checkbox" form="bulk-leads" aria-label="lead" />
      </div>,
    )
    act(() => void vi.advanceTimersByTime(60_000))
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(screen.getByText(/last \d{2}:\d{2}/)).toBeInTheDocument()

    screen.getByLabelText('search').focus()
    act(() => void vi.advanceTimersByTime(60_000))
    expect(refresh).toHaveBeenCalledTimes(1) // typing → skipped
    screen.getByLabelText('search').blur()

    fireEvent.click(screen.getByLabelText('lead'))
    act(() => void vi.advanceTimersByTime(60_000))
    expect(refresh).toHaveBeenCalledTimes(1) // leads ticked for delete → skipped
  })
})
