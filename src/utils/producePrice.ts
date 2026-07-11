import { formatNumber, joinAmount, parseAmount } from '@/utils/amount'
import { normalizeCategory } from '@/utils/icon'

export const PRODUCE_CATEGORY = 'Früchte & Gemüse'

function normalizeUnit(unit: string): string {
  return unit
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

export function isProduceCategory(category: string): boolean {
  return normalizeCategory(category) === PRODUCE_CATEGORY
}

/** Gramm aus Mengenangabe – z. B. „750 g“, „1.2 kg“. */
export function weightGramsFromAmount(amount: string): number | null {
  const parsed = parseAmount(amount)
  if (!parsed) return null
  const unit = normalizeUnit(parsed.unit)
  if (unit === 'g' || unit === 'gramm' || unit === 'gr') return parsed.value
  if (unit === 'kg') return parsed.value * 1000
  return null
}

export function formatWeightGrams(grams: number): string {
  if (grams >= 1000) {
    const kg = Math.round((grams / 1000) * 100) / 100
    return joinAmount(formatNumber(kg), 'kg')
  }
  return joinAmount(String(Math.round(grams)), 'g')
}

export function adjustProduceGrams(amount: string, direction: 1 | -1): string {
  const current = weightGramsFromAmount(amount) ?? 0
  const next = Math.max(50, current + direction * 50)
  return formatWeightGrams(next)
}

export function pricePerKgFromTotal(totalPrice: number, grams: number): number {
  if (grams <= 0) return totalPrice
  return Math.round((totalPrice / (grams / 1000)) * 100) / 100
}

export function resolveProduceCheckoffPrice(totalPaid: number, grams: number) {
  const pricePerKg = pricePerKgFromTotal(totalPaid, grams)
  return {
    total: Math.round(totalPaid * 100) / 100,
    pricePerKg,
    weightGrams: grams,
    unitPrice: pricePerKg,
  }
}
