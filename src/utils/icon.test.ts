import { describe, it, expect } from 'vitest'
import { getIconKey, getIconSvgPath } from './icon'

describe('getIconKey', () => {
  it('finds an exact product match', () => {
    expect(getIconKey('Tomaten', 'Früchte & Gemüse')).toBe('tomate')
  })
  it('finds a substring match for unlisted variants', () => {
    expect(getIconKey('Bio Cherrytomaten klein', 'Früchte & Gemüse')).toBe('tomate')
  })
  it('resolves Krevetten to the garnelen icon via synonym', () => {
    expect(getIconKey('Krevetten', 'Fleisch & Fisch')).toBe('garnelen')
  })
  it('falls back to the category icon when nothing matches', () => {
    expect(getIconKey('Voll unbekanntes Ding XYZ', 'Tiefkühl')).toBe('tiefkuehl')
  })
  it('falls back to default when category is also unknown', () => {
    expect(getIconKey('Voll unbekanntes Ding XYZ', 'Nicht existente Kategorie')).toBe('gemuese')
  })
})

describe('getIconSvgPath', () => {
  it('returns SVG path data for a known key', () => {
    expect(getIconSvgPath('tomate')).toContain('circle')
  })
  it('falls back to the default icon for an unknown key', () => {
    expect(getIconSvgPath('nonexistent-key')).toBe(getIconSvgPath('default'))
  })
})
