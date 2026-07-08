import { describe, expect, it } from 'vitest'
import { freshCalculatorEntries } from './calculatorDay'

describe('freshCalculatorEntries', () => {
  it('clears entries when the stored date is not today', () => {
    const entries = [{ id: '1', amount: 5 }]
    const result = freshCalculatorEntries(entries, '2026-07-07', '2026-07-08')
    expect(result.entries).toEqual([])
    expect(result.date).toBe('2026-07-08')
  })

  it('keeps entries for the same day', () => {
    const entries = [{ id: '1', amount: 5 }]
    const result = freshCalculatorEntries(entries, '2026-07-08', '2026-07-08')
    expect(result.entries).toEqual(entries)
  })
})
