import { formatNumber, joinAmount, parseAmount, parsePackAmount } from '@/utils/amount'
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

const PRODUCE_PIECE_UNITS = new Set([
  'stück',
  'stk',
  'stck',
  'bund',
  'packung',
  'pack',
  'beutel',
  'tüte',
  'dose',
  'glas',
  'becher',
  'prise',
])

/** Obst/Gemüse nach Gewicht: freie Gramm-Eingabe statt +/- in 50-g-Schritten. */
export function shouldUseExactProduceWeight(category: string, amount: string): boolean {
  if (!isProduceCategory(category)) return false
  if (!amount.trim()) return true

  const parsed = parseAmount(amount)
  if (!parsed) return parseGramsInput(amount) !== null

  const unit = normalizeUnit(parsed.unit)
  if (unit === 'g' || unit === 'gramm' || unit === 'gr' || unit === 'kg') return true
  if (PRODUCE_PIECE_UNITS.has(unit)) return false

  return parseGramsInput(amount) !== null
}

/** Nur explizite Gewichtsmengen (g/kg) – blanke Zahlen und Stück ergeben null, damit „2“ nicht
 *  als „2 g“ missgedeutet wird. Basis für die Gewichts-Preisführung ausserhalb von Obst/Gemüse.
 *  Pack-Mengen („2 × 400 g“) sind Stückzahl × Packung, kein Waagengewicht. */
export function explicitWeightGrams(amount: string): number | null {
  if (parsePackAmount(amount)) return null
  const parsed = parseAmount(amount)
  if (!parsed || parsed.value <= 0) return null
  const unit = normalizeUnit(parsed.unit)
  if (unit === 'g' || unit === 'gramm' || unit === 'gr') return parsed.value
  if (unit === 'kg') return parsed.value * 1000
  return null
}

/** Gramm für die Preisführung: Obst/Gemüse nur bei Gewichtsangabe (nicht bei „2 Stück“),
 *  sonst nur explizite g/kg-Menge. */
export function pricingWeightGrams(category: string, amount: string): number | null {
  if (isProduceCategory(category)) {
    if (!shouldUseExactProduceWeight(category, amount)) return null
    return weightGramsFromAmount(amount) ?? parseGramsInput(amount)
  }
  return explicitWeightGrams(amount)
}

/** 100-g-Preis aus dem intern gespeicherten Kilopreis. */
export function pricePer100gFromKg(pricePerKg: number): number {
  return Math.round((pricePerKg / 10) * 100) / 100
}

/** Gramm aus Mengenangabe – z. B. „750 g“, „1.2 kg“, „347g“. */
export function weightGramsFromAmount(amount: string): number | null {
  if (parsePackAmount(amount)) return null
  const parsed = parseAmount(amount)
  if (parsed) {
    const unit = normalizeUnit(parsed.unit)
    if (unit === 'g' || unit === 'gramm' || unit === 'gr' || unit === '') return parsed.value
    if (unit === 'kg') return parsed.value * 1000
  }
  return parseGramsInput(amount)
}

/** Freie Gramm-Eingabe – z. B. „347“, „347g“, „0,42 kg“. */
export function parseGramsInput(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const fromAmount = parseAmount(trimmed)
  if (fromAmount) {
    const unit = normalizeUnit(fromAmount.unit)
    if (unit === 'kg') return fromAmount.value * 1000
    if (unit === 'g' || unit === 'gramm' || unit === 'gr' || unit === '') return fromAmount.value
  }

  const compact = trimmed.toLowerCase().replace(/\s+/g, '')
  const kgMatch = compact.match(/^(\d+(?:[.,]\d+)?)kg$/)
  if (kgMatch) {
    const kg = parseFloat(kgMatch[1]!.replace(',', '.'))
    return Number.isFinite(kg) && kg > 0 ? kg * 1000 : null
  }

  const gMatch = compact.match(/^(\d+(?:[.,]\d+)?)g?$/)
  if (gMatch) {
    const g = parseFloat(gMatch[1]!.replace(',', '.'))
    return Number.isFinite(g) && g > 0 ? g : null
  }

  return null
}

export function gramsToAmount(grams: number): string {
  if (!Number.isFinite(grams) || grams <= 0) return ''
  if (grams >= 1000) {
    const kg = Math.round((grams / 1000) * 1000) / 1000
    return joinAmount(formatNumber(kg), 'kg')
  }
  const rounded = Math.round(grams * 10) / 10
  return joinAmount(formatNumber(rounded), 'g')
}

export function formatWeightGrams(grams: number): string {
  return gramsToAmount(grams)
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
