import { describe, it, expect } from 'vitest'
import { searchProducts } from './search'
import type { CustomProduct } from '@/types'

const customProducts: CustomProduct[] = [
  { id: '1', name: 'Zauberkraut', category: 'Sonstiges', defaultAmount: '1 Bund', createdAt: 0 },
]

describe('searchProducts', () => {
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
    const dupe: CustomProduct[] = [{ id: '2', name: 'Tomaten', category: 'Sonstiges', defaultAmount: '1 kg', createdAt: 0 }]
    const result = searchProducts('Tomaten', dupe)
    const tomatenEntries = result.filter((r) => normalize(r.name) === 'tomaten')
    expect(tomatenEntries).toHaveLength(1)
    expect(tomatenEntries[0].isCustom).toBe(true)
  })
})

function normalize(s: string) {
  return s.toLowerCase()
}
