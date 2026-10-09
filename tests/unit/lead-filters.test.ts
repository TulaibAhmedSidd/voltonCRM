import { describe, expect, it } from 'vitest'
import { activeFilterCount, parseLeadFilters, receivedRange, sourceLabel } from '@/domain/lead-filters'

const from = (q: string) => {
  const p = new URLSearchParams(q)
  return parseLeadFilters((k) => p.get(k) ?? undefined)
}

describe('parseLeadFilters', () => {
  it('keeps valid values and drops empty / unknown ones', () => {
    expect(from('source=facebook&stage=new&agent=none&attempts=3plus&date=today&form=&city=%20Lahore%20')).toEqual({ source: 'facebook', stage: 'new', agent: 'none', attempts: '3plus', date: 'today', city: 'Lahore' })
    expect(from('source=tiktok&stage=boss&agent=../../x&from=2026-13&attempts=9')).toEqual({})
    expect(activeFilterCount(from('source=whatsapp_ad&department=TRADING'))).toBe(2)
  })
  it('a typed date range replaces the period preset', () => {
    expect(from('date=today&from=2026-10-01')).toEqual({ from: '2026-10-01' })
  })
})

describe('receivedRange (Pakistan time)', () => {
  // 2026-10-09 01:00 in Pakistan = 2026-10-08 20:00 UTC
  const now = new Date('2026-10-08T20:00:00Z')
  it('today / yesterday start at 00:00 PKT', () => {
    expect(receivedRange({ date: 'today' }, now).from?.toISOString()).toBe('2026-10-08T19:00:00.000Z')
    expect(receivedRange({ date: 'yesterday' }, now)).toEqual({ from: new Date('2026-10-07T19:00:00Z'), to: new Date('2026-10-08T19:00:00Z') })
  })
  it('this week starts Monday; last month is the whole month', () => {
    expect(receivedRange({ date: 'this_week' }, now).from?.toISOString()).toBe('2026-10-04T19:00:00.000Z') // Mon 5 Oct
    expect(receivedRange({ date: 'last_month' }, now)).toEqual({ from: new Date('2026-08-31T19:00:00Z'), to: new Date('2026-09-30T19:00:00Z') })
  })
  it('a date range includes both days', () => {
    expect(receivedRange({ from: '2026-10-01', to: '2026-10-02' }, now)).toEqual({ from: new Date('2026-09-30T19:00:00Z'), to: new Date('2026-10-02T19:00:00Z') })
  })
})

describe('sourceLabel', () => {
  it('names where the lead came from', () => {
    expect(sourceLabel('meta_webhook', 'facebook')).toBe('Facebook form')
    expect(sourceLabel('meta_webhook', 'instagram')).toBe('Instagram form')
    expect(sourceLabel('whatsapp', 'whatsapp', true)).toBe('WhatsApp ad')
    expect(sourceLabel('whatsapp', undefined, false)).toBe('WhatsApp chat')
    expect(sourceLabel('sheet', 'facebook')).toBe('Google Sheet · Facebook')
    expect(sourceLabel('sheet')).toBeNull()
  })
})
