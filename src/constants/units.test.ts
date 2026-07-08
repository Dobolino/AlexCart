import { describe, it, expect } from 'vitest'
import { getDefaultUnit, DEFAULT_UNIT } from './units'

describe('getDefaultUnit', () => {
  it('returns a sensible unit for common product types', () => {
    expect(getDefaultUnit('ei')).toBe('Stück')
    expect(getDefaultUnit('tiefkuehl')).toBe('Packung')
    expect(getDefaultUnit('milch')).toBe('l')
    expect(getDefaultUnit('bier')).toBe('Flasche')
    expect(getDefaultUnit('joghurt')).toBe('Becher')
  })
  it('falls back to the global default for unmapped icon keys', () => {
    expect(getDefaultUnit('does-not-exist')).toBe(DEFAULT_UNIT)
  })
})
