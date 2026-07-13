import { describe, expect, it } from 'vitest'
import { formatShoppingProgress, nextOpenCategory, shoppingProgressPercent } from './shoppingProgress'

describe('shoppingProgress', () => {
  it('formatiert Fortschritt mit Prozent', () => {
    expect(formatShoppingProgress(18, 42)).toBe('18 / 42 Produkte gekauft • 43%')
    expect(formatShoppingProgress(1, 1)).toBe('1 / 1 Produkt gekauft • 100%')
  })

  it('berechnet Prozent gerundet', () => {
    expect(shoppingProgressPercent(18, 42)).toBe(43)
    expect(shoppingProgressPercent(0, 10)).toBe(0)
  })

  it('findet die nächste offene Kategorie', () => {
    const cats = ['Obst', 'Milch', 'Brot']
    expect(nextOpenCategory(cats, 'Obst')).toBe('Milch')
    expect(nextOpenCategory(cats, 'Brot')).toBeNull()
  })
})
