import { describe, it, expect } from 'vitest'
import {
  parseAmount,
  parsePackAmount,
  formatPackAmountFromPreset,
  inferPackCount,
  combineAmounts,
  mergeItems,
  adjustAmount,
  stepForUnit,
  joinAmount,
  priceQuantityFromAmount,
  resolveCheckoffTotalPrice,
} from './amount'

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

describe('parsePackAmount', () => {
  it('erkennt 2 × 400 g und Varianten', () => {
    expect(parsePackAmount('2 × 400 g')).toEqual({ count: 2, packValue: 400, packUnit: 'g' })
    expect(parsePackAmount('2x400g')).toEqual({ count: 2, packValue: 400, packUnit: 'g' })
    expect(parsePackAmount('3 x 400 ml')).toEqual({ count: 3, packValue: 400, packUnit: 'ml' })
  })
  it('lehnt normale Mengen ab', () => {
    expect(parsePackAmount('800 g')).toBeNull()
    expect(parsePackAmount('2 Stk')).toBeNull()
  })
})

describe('inferPackCount / formatPackAmountFromPreset', () => {
  it('leitet Anzahl aus Gesamtgewicht und Packungsgrösse ab', () => {
    expect(inferPackCount('800 g', '400 g')).toBe(2)
    expect(inferPackCount('800 g', '400 ml')).toBe(2)
    expect(formatPackAmountFromPreset(2, '400 g')).toBe('2 × 400 g')
  })
})

describe('priceQuantityFromAmount', () => {
  it('nutzt Stückzahlen als Multiplikator', () => {
    expect(priceQuantityFromAmount('2 Stk')).toBe(2)
    expect(priceQuantityFromAmount('3')).toBe(3)
    expect(priceQuantityFromAmount('2 Packungen')).toBe(2)
  })
  it('nutzt Pack-Anzahl bei 2 × 400 g', () => {
    expect(priceQuantityFromAmount('2 × 400 g')).toBe(2)
    expect(priceQuantityFromAmount('1 × 400 g')).toBe(1)
  })
  it('behandelt Gewicht/Volumen als eine Packung', () => {
    expect(priceQuantityFromAmount('500 g')).toBe(1)
    expect(priceQuantityFromAmount('1 l')).toBe(1)
  })
})

describe('resolveCheckoffTotalPrice', () => {
  it('multipliziert Stückpreis mit Menge', () => {
    expect(resolveCheckoffTotalPrice(2.5, '2 Stk', 'unit')).toEqual({
      total: 5,
      unitPrice: 2.5,
      quantity: 2,
    })
  })
  it('multipliziert Packungspreis bei 2 × 400 g', () => {
    expect(resolveCheckoffTotalPrice(0.65, '2 × 400 g', 'unit')).toEqual({
      total: 1.3,
      unitPrice: 0.65,
      quantity: 2,
    })
  })
  it('akzeptiert Gesamtpreis direkt', () => {
    expect(resolveCheckoffTotalPrice(5, '2 Stk', 'total')).toEqual({
      total: 5,
      unitPrice: 2.5,
      quantity: 2,
    })
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
  it('ändert bei Pack-Mengen nur die Anzahl', () => {
    expect(adjustAmount('2 × 400 g', 1)).toBe('3 × 400 g')
    expect(adjustAmount('2 × 400 g', -1)).toBe('1 × 400 g')
    expect(adjustAmount('1 × 400 g', -1)).toBe('1 × 400 g')
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
