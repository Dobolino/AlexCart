import { describe, expect, it } from 'vitest'
import { isKnownStoreName, mergeStoreOptions, STORE_PRESETS } from './stores'

describe('stores', () => {
  it('enthält gängige Schweizer Ketten', () => {
    expect(STORE_PRESETS).toContain('Migros')
    expect(STORE_PRESETS).toContain('Coop')
    expect(STORE_PRESETS).toContain('Manor')
  })

  it('hängt Custom-Ketten ohne Duplikate an', () => {
    expect(mergeStoreOptions(['  Glattzentrum  ', 'migros', 'Sihlcity'])).toEqual([
      ...STORE_PRESETS,
      'Glattzentrum',
      'Sihlcity',
    ])
  })

  it('erkennt bekannte Namen case-insensitive', () => {
    expect(isKnownStoreName('coop', [])).toBe(true)
    expect(isKnownStoreName('Mein Markt', ['Mein Markt'])).toBe(true)
    expect(isKnownStoreName('', [])).toBe(false)
  })
})
