import { describe, it, expect } from 'vitest'
import { searchProducts } from './search'
import type { CustomProduct } from '@/types'
import type { CatalogProduct } from '@/types/catalog'

const customProducts: CustomProduct[] = [
  { id: '1', name: 'Zauberkraut', category: 'Sonstiges', defaultAmount: '1 Bund', createdAt: 0 },
]

describe('searchProducts', () => {
  it('keeps distinct catalog brands and package sizes selectable without losing product identity', () => {
    const catalog: CatalogProduct[] = [500, 1000].map((size) => ({
      id: `milk-${size}`,
      name: 'Milch',
      brand: 'Testmarke',
      category: 'Milch & Käse',
      gtins: [],
      netQuantity: { value: size, unit: 'ml' },
      source: 'manual',
      updatedAt: '2026-01-01T12:00:00.000Z',
    }))
    const result = searchProducts('Testmarke Milch', [], 8, catalog)
    expect(result.map((row) => row.productId)).toEqual(['milk-500', 'milk-1000'])
    expect(result.map((row) => row.amount)).toEqual(['500 ml', '1000 ml'])
    expect(searchProducts('milch', [], 20, catalog).some((row) => row.productId === 'milk-500')).toBe(true)
  })
  it('returns nothing for an empty query', () => {
    expect(searchProducts('', customProducts)).toEqual([])
  })
  it('prioritizes startsWith matches over substring matches', () => {
    const result = searchProducts('toma', customProducts)
    expect(result[0].name.toLowerCase()).toContain('toma')
    expect(result.every((r) => r.name.toLowerCase().includes('toma'))).toBe(true)
  })
  it('finds custom products alongside the built-in database', () => {
    const result = searchProducts('zauber', customProducts)
    expect(result.some((r) => r.isCustom && r.name === 'Zauberkraut')).toBe(true)
  })
  it('deduplicates by name, preferring the custom product', () => {
    const dupe: CustomProduct[] = [
      { id: '2', name: 'Tomaten', category: 'Sonstiges', defaultAmount: '1 kg', createdAt: 0 },
    ]
    const result = searchProducts('Tomaten', dupe)
    const tomatenEntries = result.filter((r) => normalize(r.name) === 'tomaten')
    expect(tomatenEntries).toHaveLength(1)
    expect(tomatenEntries[0].isCustom).toBe(true)
  })
})

function normalize(s: string) {
  return s.toLowerCase()
}
