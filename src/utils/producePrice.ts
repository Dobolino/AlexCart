import { formatNumber, joinAmount, parseAmount, parsePackAmount } from '@/utils/amount'
import { getIconKey, normalizeCategory } from '@/utils/icon'

export const PRODUCE_CATEGORY = 'Früchte & Gemüse'

/** Obst/Gemüse: Waagen-/Kilopreis oder Stückpreis (Banane vs. Kiwi). */
export type ProducePricingMode = 'weight' | 'piece'

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

/** Typisch nach Gewicht verkauft – auch wenn die Liste „3 Stück“ sagt (z. B. Bananen). */
const WEIGHED_PRODUCE_ICONS = new Set([
  'banane',
  'apfel',
  'birne',
  'traube',
  'kartoffel',
  'zwiebel',
  'karotte',
  'tomate',
  'erdbeere',
  'blaubeere',
  'himbeere',
  'kirsche',
  'pflaume',
  'pfirsich',
  'aprikose',
  'mandarine',
  'clementine',
  'orange',
  'zitrone',
  'limette',
  'ingwer',
  'knoblauch',
  'pilz',
  'spinat',
  'salat',
])

/** Typisch mit Stückpreis – Kiwi, Avocado, … */
const PIECE_PRODUCE_ICONS = new Set([
  'kiwi',
  'avocado',
  'mango',
  'ananas',
  'melone',
  'wassermelone',
  'kokosnuss',
  'granatapfel',
  'paprika',
  'gurke',
  'zucchini',
  'aubergine',
  'mais',
  'fenchel',
  'lauch',
  'sellerie',
  'brokkoli',
  'blumenkohl',
  'kuerbis',
])

/** Obst/Gemüse-Menge in Stück/Bund/… (nicht g/kg). */
export function isProducePieceUnitAmount(amount: string): boolean {
  if (parsePackAmount(amount)) return false
  const parsed = parseAmount(amount)
  if (!parsed) return false
  return PRODUCE_PIECE_UNITS.has(normalizeUnit(parsed.unit))
}

/** Menge erzwingt Waagenpreis (explizite g/kg auf der Liste). */
export function isForcedWeightAmount(amount: string): boolean {
  return explicitWeightGrams(amount) !== null
}

/**
 * Ob der Nutzer zwischen Kilopreis und Stückpreis wählen kann.
 * Bei fester g/kg-Menge auf der Liste nicht – sonst ja (Stück, leer, …).
 */
export function canChooseProducePricingMode(category: string, amount: string): boolean {
  if (!isProduceCategory(category)) return false
  if (parsePackAmount(amount)) return false
  if (isForcedWeightAmount(amount)) return false
  return true
}

/**
 * Vorauswahl: Historie (pricePerKg) > Icon-Heuristik > Stück→Stück / sonst Gewicht.
 * Beispiel: Banane „3 Stück“ + Kilohistorie → weight; Kiwi „2 Stück“ → piece.
 */
export function defaultProducePricingMode(
  name: string,
  category: string,
  amount: string,
  variant?: { pricePerKg?: number; lastPrice?: number } | null
): ProducePricingMode {
  if (!isProduceCategory(category)) return 'piece'
  if (isForcedWeightAmount(amount)) return 'weight'

  if (variant?.pricePerKg && variant.pricePerKg > 0) return 'weight'
  if (isProducePieceUnitAmount(amount) && variant?.lastPrice && !(variant.pricePerKg && variant.pricePerKg > 0)) {
    return 'piece'
  }

  const icon = getIconKey(name, category)
  if (WEIGHED_PRODUCE_ICONS.has(icon)) return 'weight'
  if (PIECE_PRODUCE_ICONS.has(icon)) return 'piece'

  if (isProducePieceUnitAmount(amount)) return 'piece'
  return 'weight'
}

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

/** Gramm für die Preisführung ohne Varianten-Kontext (Schätzung). */
export function pricingWeightGrams(
  category: string,
  amount: string,
  name = '',
  variant?: { pricePerKg?: number; lastPrice?: number } | null
): number | null {
  if (isProduceCategory(category)) {
    const mode = defaultProducePricingMode(name || 'x', category, amount, variant)
    if (mode !== 'weight') return null
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
