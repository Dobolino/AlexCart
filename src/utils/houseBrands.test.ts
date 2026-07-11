import { describe, expect, it } from 'vitest'
import { mergeHouseBrandPresets, isBrandNameTaken } from './houseBrands'

describe('houseBrands', () => {
  it('erkennt vorhandene Marken unabhängig von Grossschreibung', () => {
    const brands = [{ id: '1', name: 'M Classic', createdAt: 1 }]
    expect(isBrandNameTaken(brands, 'm classic')).toBe(true)
    expect(isBrandNameTaken(brands, 'Gut & Günstig')).toBe(false)
  })

  it('fügt nur fehlende Hausmarken hinzu', () => {
    const brands = [{ id: '1', name: 'M Classic', createdAt: 1 }]
    let n = 0
    const merged = mergeHouseBrandPresets(brands, () => `id-${++n}`, ['M Classic', 'M-Budget', 'Denner'])
    expect(merged).toHaveLength(3)
    expect(merged.map((b) => b.name)).toEqual(['M Classic', 'M-Budget', 'Denner'])
  })
})
