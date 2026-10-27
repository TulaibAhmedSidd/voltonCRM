/** @vitest-environment jsdom */
import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NumberField, NumberInput } from '@/components/common/number-input'
import { cleanNumberText, numberProblem, textFromNumber } from '@/lib/numeric'

describe('number text rules', () => {
  it('digits only, no leading zeros, one decimal point when allowed', () => {
    expect(cleanNumberText('031000')).toBe('31000')
    expect(cleanNumberText('31,000 Rs')).toBe('31000')
    expect(cleanNumberText('abc')).toBe('')
    expect(cleanNumberText('0')).toBe('0')
    expect(cleanNumberText('00')).toBe('0')
    expect(cleanNumberText('2.5')).toBe('25')
    expect(cleanNumberText('2.5', { decimals: true })).toBe('2.5')
    expect(cleanNumberText('2.', { decimals: true })).toBe('2.')
    expect(cleanNumberText('.5', { decimals: true })).toBe('0.5')
    expect(cleanNumberText('1.2.3', { decimals: true })).toBe('1.23')
    expect(cleanNumberText('007.50', { decimals: true })).toBe('7.50')
    expect(textFromNumber(0)).toBe('')
    expect(numberProblem('0', { min: 1, label: 'kW' })).toBe('kW must be at least 1')
    expect(numberProblem('', { required: true, label: 'Sale value' })).toBe('Sale value is required')
  })
})

function Controlled({ start = 0 }: { start?: number }) {
  const [n, setN] = useState(start)
  return (
    <>
      <NumberInput aria-label="Discount" value={n} onValueChange={setN} />
      <output aria-label="value">{n}</output>
      <button type="button" onClick={() => setN(4500)}>
        pick
      </button>
    </>
  )
}

describe('NumberInput (quotation builder)', () => {
  it('starts empty instead of a stuck 0, never keeps a leading 0, and follows outside changes', () => {
    render(<Controlled />)
    const box = screen.getByLabelText('Discount') as HTMLInputElement
    expect(box.type).toBe('text')
    expect(box.value).toBe('')
    expect(box.placeholder).toBe('0')
    fireEvent.change(box, { target: { value: '031000' } })
    expect(box.value).toBe('31000')
    expect(screen.getByLabelText('value').textContent).toBe('31000')
    fireEvent.change(box, { target: { value: '' } })
    expect(screen.getByLabelText('value').textContent).toBe('0')
    fireEvent.click(screen.getByText('pick')) // e.g. a website product filled the price
    expect(box.value).toBe('4500')
  })
})

describe('NumberField (forms)', () => {
  it('sends clean digits and checks min / max', () => {
    render(
      <form aria-label="f">
        <NumberField label="Agent must accept within (min)" name="acceptWithinMin" min={1} max={120} defaultValue={5} />
      </form>,
    )
    const box = screen.getByLabelText('Agent must accept within (min)') as HTMLInputElement
    expect(box.value).toBe('5')
    fireEvent.change(box, { target: { value: '0150' } })
    expect(box.value).toBe('150')
    expect(box.validity.valid).toBe(false)
    expect(screen.getByText('Agent must accept within (min) must be at most 120')).toBeInTheDocument()
    fireEvent.change(box, { target: { value: '30' } })
    expect(box.validity.valid).toBe(true)
    expect(new FormData(screen.getByRole('form', { name: 'f' }) as HTMLFormElement).get('acceptWithinMin')).toBe('30')
  })
})
