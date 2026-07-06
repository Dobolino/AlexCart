import { describe, it, expect } from 'vitest'
import { getCategoryColor } from './categoryColor'

describe('getCategoryColor', () => {
  it('returns a distinct color per known category', () => {
    const fruits = getCategoryColor('Früchte & Gemüse')
    const meat = getCategoryColor('Fleisch & Fisch')
    expect(fruits).not.toEqual(meat)
  })
  it('falls back to a neutral color for unknown categories', () => {
    expect(getCategoryColor('Nicht existent')).toEqual({ bg: 'var(--chip-bg)', fg: 'var(--text-muted)' })
  })
  it('always returns the neutral color when done is true, regardless of category', () => {
    const done = getCategoryColor('Früchte & Gemüse', true)
    expect(done).toEqual({ bg: 'var(--chip-bg)', fg: 'var(--text-muted)' })
  })
})
