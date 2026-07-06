import { describe, it, expect } from 'vitest'
import { importFromJSON } from './import'

const pantry = [{ id: '1', name: 'Salz', category: 'Sonstiges' }]

describe('importFromJSON', () => {
  it('rejects invalid JSON', () => {
    const result = importFromJSON('not json', [])
    expect(result.ok).toBe(false)
    expect(result.error).toMatch(/JSON/)
  })
  it('rejects JSON without an items array', () => {
    const result = importFromJSON('{"week":"2026-07-06"}', [])
    expect(result.ok).toBe(false)
  })
  it('merges duplicates and filters pantry items', () => {
    const payload = JSON.stringify({
      week: '2026-07-06',
      items: [
        { name: 'Tomaten', amount: '300g', category: 'Früchte & Gemüse' },
        { name: 'Tomaten', amount: '200g', category: 'Früchte & Gemüse' },
        { name: 'Salz', amount: '1 Prise', category: 'Sonstiges' },
      ],
    })
    const result = importFromJSON(payload, pantry)
    expect(result.ok).toBe(true)
    expect(result.kept).toHaveLength(1)
    expect(result.kept?.[0].amount).toBe('500 g')
    expect(result.filtered).toHaveLength(1)
    expect(result.filtered?.[0].name).toBe('Salz')
  })
})
