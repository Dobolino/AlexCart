import { describe, expect, it } from 'vitest'
import {
  isKnownStoreName,
  mergeStoreOptions,
  STORE_PRESETS_CH,
  STORE_PRESETS_DE,
  storePresetsForCurrency,
} from './stores'

describe('stores', () => {
  it('liefert CH-Ketten für CHF und DE-Ketten für EUR', () => {
    expect(storePresetsForCurrency('CHF')).toContain('Migros')
    expect(storePresetsForCurrency('CHF')).not.toContain('Marktkauf')
    expect(storePresetsForCurrency('EUR')).toContain('Marktkauf')
    expect(storePresetsForCurrency('EUR')).toContain('Edeka')
    expect(storePresetsForCurrency('EUR')).not.toContain('Migros')
  })

  it('hängt Custom-Ketten ohne Duplikate an', () => {
    expect(mergeStoreOptions(['  Glattzentrum  ', 'migros', 'Sihlcity'], 'CHF')).toEqual([
      ...STORE_PRESETS_CH,
      'Glattzentrum',
      'Sihlcity',
    ])
  })

  it('erkennt bekannte Namen aus beiden Ländern', () => {
    expect(isKnownStoreName('coop', [])).toBe(true)
    expect(isKnownStoreName('marktkauf', [])).toBe(true)
    expect(isKnownStoreName('Mein Markt', ['Mein Markt'])).toBe(true)
    expect(isKnownStoreName('', [])).toBe(false)
    expect(STORE_PRESETS_DE).toContain('Rewe')
  })
})
