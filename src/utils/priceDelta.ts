import type { CheckoffPriceMode } from '@/utils/amount'
import { productPriceHistory, type ProductPriceStats } from '@/utils/priceHistory'
import { resolveProduceCheckoffPrice } from '@/utils/producePrice'
import { formatMoney } from '@/utils/currency'
import { normalize } from '@/utils/text'
import type { Currency, ProductVariant, PurchaseLogEntry, ShoppingItem } from '@/types'

export type PriceDeltaDirection = 'up' | 'down' | 'same'

export interface PriceDeltaInput {
  item: ShoppingItem
  enteredAmount: number
  isProduce: boolean
  wasSale: boolean
  priceMode: CheckoffPriceMode
  quantity: number
  weightGrams?: number | null
  selectedVariant?: ProductVariant
  purchaseLog: PurchaseLogEntry[]
  /** Vorberechnete Kaufhistorie – vermeidet Neuaufbau bei jedem Tastendruck. */
  priceHistory?: ProductPriceStats[]
  currency: Currency
}

export interface PriceDeltaResult {
  direction: PriceDeltaDirection
  delta: number
  label: string
  referencePrice: number
  enteredComparable: number
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/** Letzter bekannter Preis – zuerst Variante, sonst Kaufhistorie. */
export function resolveReferencePrice(input: Omit<PriceDeltaInput, 'enteredAmount' | 'currency'>): number | null {
  const { selectedVariant, wasSale, isProduce, item, purchaseLog, priceHistory } = input

  if (selectedVariant) {
    if (wasSale && selectedVariant.lastSalePrice && selectedVariant.lastSalePrice > 0) {
      return selectedVariant.lastSalePrice
    }
    if (isProduce) {
      const perKg = selectedVariant.pricePerKg ?? selectedVariant.lastPrice
      return perKg && perKg > 0 ? perKg : null
    }
    if (selectedVariant.lastPrice && selectedVariant.lastPrice > 0) {
      return selectedVariant.lastPrice
    }
  }

  const history = priceHistory ?? productPriceHistory(purchaseLog)
  const entry = history.find((row) => normalize(row.name) === normalize(item.name))
  if (!entry || entry.lastPrice <= 0) return null
  return entry.lastPrice
}

/** Eingabe und Referenz auf dieselbe Basis bringen (Stück, Gesamt oder CHF/kg). */
export function resolveComparablePrices(input: PriceDeltaInput): {
  entered: number
  reference: number
} | null {
  if (input.enteredAmount <= 0) return null

  const referenceBase = resolveReferencePrice(input)
  if (referenceBase === null) return null

  if (input.isProduce) {
    if (!input.weightGrams || input.weightGrams <= 0) return null
    const entered = resolveProduceCheckoffPrice(input.enteredAmount, input.weightGrams).pricePerKg
    return { entered, reference: referenceBase }
  }

  if (input.priceMode === 'unit' && input.quantity > 1) {
    return { entered: roundMoney(input.enteredAmount), reference: roundMoney(referenceBase) }
  }

  if (input.quantity > 1 && input.priceMode === 'total') {
    const referenceTotal = roundMoney(referenceBase * input.quantity)
    return { entered: roundMoney(input.enteredAmount), reference: referenceTotal }
  }

  return { entered: roundMoney(input.enteredAmount), reference: roundMoney(referenceBase) }
}

export function formatDeltaAmount(absDelta: number, currency: Currency): string {
  const rounded = roundMoney(absDelta)
  if (currency === 'CHF' && rounded < 1) {
    return `${Math.round(rounded * 100)} Rp.`
  }
  return formatMoney(rounded, currency)
}

export function computePriceDelta(input: PriceDeltaInput): PriceDeltaResult | null {
  const comparable = resolveComparablePrices(input)
  if (!comparable) return null

  const delta = roundMoney(comparable.entered - comparable.reference)
  if (delta === 0) {
    return {
      direction: 'same',
      delta: 0,
      label: '±0',
      referencePrice: comparable.reference,
      enteredComparable: comparable.entered,
    }
  }

  const direction: PriceDeltaDirection = delta > 0 ? 'up' : 'down'
  const sign = delta > 0 ? '+' : '−'
  const icon = delta > 0 ? '🔺' : '🔻'
  const label = `${icon} ${sign}${formatDeltaAmount(Math.abs(delta), input.currency)}`

  return {
    direction,
    delta,
    label,
    referencePrice: comparable.reference,
    enteredComparable: comparable.entered,
  }
}
