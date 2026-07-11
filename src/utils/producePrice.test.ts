import { describe, expect, it } from 'vitest'
import {
  gramsToAmount,
  isProduceCategory,
  parseGramsInput,
  pricePerKgFromTotal,
  resolveProduceCheckoffPrice,
  weightGramsFromAmount,
} from './producePrice'

describe('producePrice', () => {
  it('erkennt Obst & Gemüse', () => {
    expect(isProduceCategory('Früchte & Gemüse')).toBe(true)
    expect(isProduceCategory('Milch & Käse')).toBe(false)
  })

  it('parst exakte Gramm-Eingaben', () => {
    expect(parseGramsInput('347')).toBe(347)
    expect(parseGramsInput('347g')).toBe(347)
    expect(parseGramsInput('423,5')).toBe(423.5)
    expect(weightGramsFromAmount('347 g')).toBe(347)
    expect(weightGramsFromAmount('1.2 kg')).toBe(1200)
  })

  it('speichert exakte Gramm-Mengen', () => {
    expect(gramsToAmount(347)).toBe('347 g')
    expect(gramsToAmount(423.5)).toBe('423,5 g')
  })

  it('berechnet Kilopreis', () => {
    expect(pricePerKgFromTotal(3.75, 750)).toBe(5)
    const resolved = resolveProduceCheckoffPrice(2.47, 347)
    expect(resolved.pricePerKg).toBeCloseTo(7.12, 1)
    expect(resolved.total).toBe(2.47)
  })
})
