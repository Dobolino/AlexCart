import { describe, expect, it } from 'vitest'
import {
  gramsToAmount,
  isProduceCategory,
  parseGramsInput,
  pricePerKgFromTotal,
  resolveProduceCheckoffPrice,
  shouldUseExactProduceWeight,
  weightGramsFromAmount,
  explicitWeightGrams,
  pricingWeightGrams,
  pricePer100gFromKg,
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

  it('nutzt exakte Gramm-Eingabe nur bei Gewichtsangaben', () => {
    expect(shouldUseExactProduceWeight('Früchte & Gemüse', '')).toBe(true)
    expect(shouldUseExactProduceWeight('Früchte & Gemüse', '347 g')).toBe(true)
    expect(shouldUseExactProduceWeight('Früchte & Gemüse', '2 Stück')).toBe(false)
    expect(shouldUseExactProduceWeight('Milch & Käse', '500 g')).toBe(false)
  })

  it('explicitWeightGrams akzeptiert nur echte g/kg, keine blanken Zahlen', () => {
    expect(explicitWeightGrams('800 g')).toBe(800)
    expect(explicitWeightGrams('1.2 kg')).toBe(1200)
    expect(explicitWeightGrams('2 Stück')).toBeNull()
    expect(explicitWeightGrams('2')).toBeNull()
    expect(explicitWeightGrams('')).toBeNull()
    expect(explicitWeightGrams('2 × 400 g')).toBeNull()
  })

  it('pricingWeightGrams: Obst/Gemüse frei, sonst nur explizites Gewicht', () => {
    // Obst/Gemüse akzeptiert blanke Zahl als Gramm
    expect(pricingWeightGrams('Früchte & Gemüse', '347')).toBe(347)
    // Fleisch nur mit expliziter Einheit
    expect(pricingWeightGrams('Fleisch & Fisch', '800 g')).toBe(800)
    expect(pricingWeightGrams('Fleisch & Fisch', '2 Stück')).toBeNull()
  })

  it('pricePer100gFromKg rechnet Kilopreis auf 100 g', () => {
    expect(pricePer100gFromKg(12)).toBe(1.2)
    expect(pricePer100gFromKg(10.63)).toBe(1.06)
  })
})
