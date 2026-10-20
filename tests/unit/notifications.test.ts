import { describe, expect, it } from 'vitest'
import { SETTING_KEYS } from '@/domain/constants'

describe('notifications setting', () => {
  it('registers notifications in SETTING_KEYS', () => {
    expect(SETTING_KEYS).toContain('notifications')
  })
})
