/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const pingAgentAction = vi.fn(async () => ({ ok: true, message: 'Asad was pinged.' }))
vi.mock('@/server/actions', () => ({ pingAgentAction: (...a: unknown[]) => pingAgentAction(...(a as [])) }))

const { PingAgent } = await import('@/components/crm/ping-agent')

describe('PingAgent', () => {
  it('closes after sending and shows "Sent"', async () => {
    render(<PingAgent agentId="a1" agentName="Asad" />)
    fireEvent.click(screen.getByRole('button', { name: 'Ping' }))
    fireEvent.change(screen.getByLabelText('Message to Asad'), { target: { value: 'Please call now' } })
    fireEvent.click(screen.getByRole('button', { name: 'Send ping' }))
    await waitFor(() => expect(pingAgentAction).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Send ping' })).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Sent' })).toBeInTheDocument()
  })

  it('only one ping popup is open at a time', async () => {
    render(
      <div>
        <PingAgent agentId="a1" agentName="Asad" />
        <PingAgent agentId="a2" agentName="Bilqees" />
      </div>,
    )
    const [first, second] = screen.getAllByRole('button', { name: 'Ping' })
    fireEvent.click(first)
    expect(screen.getByLabelText('Message to Asad')).toBeInTheDocument()
    // Opening the second one (a click outside the first) closes the first.
    fireEvent.pointerDown(second)
    fireEvent.click(second)
    await waitFor(() => expect(screen.queryByLabelText('Message to Asad')).not.toBeInTheDocument())
    expect(screen.getByLabelText('Message to Bilqees')).toBeInTheDocument()
  })
})
