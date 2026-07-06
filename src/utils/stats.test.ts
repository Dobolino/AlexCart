import { describe, it, expect } from 'vitest'
import { topItems, categoryBreakdown } from './stats'

const log = [
  { name: 'Tomaten', category: 'Früchte & Gemüse', date: '2026-07-01' },
  { name: 'tomaten', category: 'Früchte & Gemüse', date: '2026-07-02' },
  { name: 'Milch', category: 'Milch & Käse', date: '2026-07-02' },
]

describe('topItems', () => {
  it('counts case-insensitively and sorts descending', () => {
    const result = topItems(log)
    expect(result[0]).toEqual({ label: 'Tomaten', count: 2 })
    expect(result[1]).toEqual({ label: 'Milch', count: 1 })
  })
})

describe('categoryBreakdown', () => {
  it('aggregates purchase counts per category', () => {
    const result = categoryBreakdown(log)
    expect(result).toEqual([
      { label: 'Früchte & Gemüse', count: 2 },
      { label: 'Milch & Käse', count: 1 },
    ])
  })
})
