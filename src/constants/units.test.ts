import { describe, it, expect } from 'vitest'
import { getDefaultUnit, DEFAULT_UNIT, getDefaultUnitForCategory, defaultListAmount } from './units'

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
  it('uses category fallback when icon is unknown', () => {
    expect(getDefaultUnit('does-not-exist', 'Getränke')).toBe('l')
  })
})

describe('getDefaultUnitForCategory', () => {
  it('picks sensible defaults per category', () => {
    expect(getDefaultUnitForCategory('Getränke')).toBe('l')
    expect(getDefaultUnitForCategory('Milch & Käse')).toBe('l')
    expect(getDefaultUnitForCategory('Tiefkühl')).toBe('Packung')
    expect(getDefaultUnitForCategory('Brot & Backwaren')).toBe('Stück')
  })
})

describe('defaultListAmount', () => {
  it('never puts a nonsensical "1 g" / "1 ml" / "1 l Butter" on the list', () => {
    expect(defaultListAmount('unbekannt', 'Milch & Käse', 'Butter')).toBe('1 Packung')
    expect(defaultListAmount('unbekannt', 'Milch & Käse', 'Milch')).toBe('1 l')
    expect(defaultListAmount('unbekannt', 'Fleisch & Fisch', 'Hackfleisch')).toBe('1 Packung')
    expect(defaultListAmount('unbekannt', 'Früchte & Gemüse', 'Tomaten')).toBe('1 Stück')
    expect(defaultListAmount('ei', 'Milch & Käse', 'Eier')).toBe('1 Stück')
  })
})
