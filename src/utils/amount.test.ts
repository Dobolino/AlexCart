import { describe, it, expect } from 'vitest'
import { parseAmount, combineAmounts, mergeItems, adjustAmount, stepForUnit, joinAmount } from './amount'

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

describe('joinAmount', () => {
  it('combines a value and unit', () => {
    expect(joinAmount('500', 'g')).toBe('500 g')
  })
  it('returns nothing when no value is given, even with a unit selected', () => {
    expect(joinAmount('', 'g')).toBe('')
    expect(joinAmount('  ', 'Stück')).toBe('')
  })
  it('returns just the value when no unit is given', () => {
    expect(joinAmount('3', '')).toBe('3')
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

describe('stepForUnit', () => {
  it('uses coarser steps for weight/volume units', () => {
    expect(stepForUnit('g')).toBe(50)
    expect(stepForUnit('ml')).toBe(50)
    expect(stepForUnit('kg')).toBe(0.5)
    expect(stepForUnit('l')).toBe(0.5)
  })
  it('uses a step of 1 for count-like units', () => {
    expect(stepForUnit('Stück')).toBe(1)
    expect(stepForUnit('Dose')).toBe(1)
  })
})

describe('adjustAmount', () => {
  it('increments by the unit step', () => {
    expect(adjustAmount('500 g', 1)).toBe('550 g')
    expect(adjustAmount('2 Stück', 1)).toBe('3 Stück')
  })
  it('decrements by the unit step, preserving casing', () => {
    expect(adjustAmount('500 g', -1)).toBe('450 g')
  })
  it('never decrements below one step', () => {
    expect(adjustAmount('20 g', -1)).toBe('50 g')
    expect(adjustAmount('1 Stück', -1)).toBe('1 Stück')
  })
  it('leaves unparseable amounts unchanged', () => {
    expect(adjustAmount('nach Bedarf', 1)).toBe('nach Bedarf')
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
