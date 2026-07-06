import { describe, it, expect } from 'vitest'
import { parseAmount, combineAmounts, mergeItems } from './amount'

describe('parseAmount', () => {
  it('splits value and unit', () => {
    expect(parseAmount('500g')).toEqual({ value: 500, unit: 'g' })
    expect(parseAmount('2 Stk')).toEqual({ value: 2, unit: 'Stk' })
    expect(parseAmount('1,5 kg')).toEqual({ value: 1.5, unit: 'kg' })
  })
  it('returns null for empty/unparseable input', () => {
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('etwas')).toBeNull()
  })
})

describe('combineAmounts', () => {
  it('sums same-unit amounts and preserves original casing', () => {
    expect(combineAmounts('1 Stk', '1 Stk')).toBe('2 Stk')
    expect(combineAmounts('300g', '200g')).toBe('500 g')
  })
  it('falls back to concatenation for mismatched units', () => {
    expect(combineAmounts('1 Bund', '200g')).toBe('1 Bund + 200g')
  })
  it('handles one-sided empty amounts', () => {
    expect(combineAmounts('', '2 Stk')).toBe('2 Stk')
    expect(combineAmounts('2 Stk', '')).toBe('2 Stk')
  })
})

describe('mergeItems', () => {
  it('merges duplicate ingredient names case-insensitively', () => {
    const result = mergeItems([
      { name: 'Zwiebeln', amount: '1 Stk', category: 'Gemüse' },
      { name: 'zwiebeln', amount: '1 Stk', category: 'Gemüse' },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].amount).toBe('2 Stk')
  })
  it('skips items without a name', () => {
    const result = mergeItems([{ name: '  ', amount: '1x', category: 'Sonstiges' }])
    expect(result).toHaveLength(0)
  })
})
