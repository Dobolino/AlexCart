import { describe, expect, it } from 'vitest'
import {
  adjustProduceGrams,
  isProduceCategory,
  pricePerKgFromTotal,
  resolveProduceCheckoffPrice,
  weightGramsFromAmount,
} from './producePrice'

describe('producePrice', () => {
  it('erkennt Obst & Gemüse', () => {
    expect(isProduceCategory('Früchte & Gemüse')).toBe(true)
    expect(isProduceCategory('Milch & Käse')).toBe(false)
  })

  it('parst Gramm und Kilogramm', () => {
    expect(weightGramsFromAmount('750 g')).toBe(750)
    expect(weightGramsFromAmount('1.2 kg')).toBe(1200)
  })

  it('berechnet Kilopreis', () => {
    expect(pricePerKgFromTotal(3.75, 750)).toBe(5)
    const resolved = resolveProduceCheckoffPrice(2.5, 500)
    expect(resolved.pricePerKg).toBe(5)
    expect(resolved.total).toBe(2.5)
  })

  it('passt Gramm in 50er-Schritten an', () => {
    expect(adjustProduceGrams('500 g', 1)).toBe('550 g')
    expect(adjustProduceGrams('', 1)).toBe('50 g')
  })
})
