import { describe, expect, it } from 'vitest'
import { computePriceDelta, formatDeltaAmount, resolveComparablePrices } from './priceDelta'
import type { ProductVariant, PurchaseLogEntry, ShoppingItem } from '@/types'

const item: ShoppingItem = {
  id: '1',
  name: 'Milch',
  amount: '1 l',
  category: 'Milch & Käse',
  done: false,
  addedAt: 1,
}

const variant: ProductVariant = {
  id: 'v1',
  name: 'Standard',
  lastPrice: 3.2,
  purchaseCount: 2,
  lastPurchaseWasSale: false,
  salePurchaseCount: 0,
}

const purchaseLog: PurchaseLogEntry[] = [
  { name: 'Tomaten', category: 'Früchte & Gemüse', date: '2026-07-01', price: 4.5 },
]

describe('priceDelta', () => {
  it('formatiert kleine Deltas in Rappen', () => {
    expect(formatDeltaAmount(0.5, 'CHF')).toBe('50 Rp.')
    expect(formatDeltaAmount(1.2, 'CHF')).toBe('CHF 1.20')
  })

  it('zeigt teurer-Badge bei höherem Stückpreis', () => {
    const result = computePriceDelta({
      item,
      enteredAmount: 3.7,
      isProduce: false,
      wasSale: false,
      priceMode: 'total',
      quantity: 1,
      selectedVariant: variant,
      purchaseLog: [],
      currency: 'CHF',
    })
    expect(result?.direction).toBe('up')
    expect(result?.label).toBe('🔺 +50 Rp.')
  })

  it('zeigt günstiger-Badge bei tieferem Preis', () => {
    const result = computePriceDelta({
      item,
      enteredAmount: 2.9,
      isProduce: false,
      wasSale: false,
      priceMode: 'total',
      quantity: 1,
      selectedVariant: variant,
      purchaseLog: [],
      currency: 'CHF',
    })
    expect(result?.direction).toBe('down')
    expect(result?.label).toBe('🔻 −30 Rp.')
  })

  it('vergleicht Gesamtpreis bei Mehrfachmenge', () => {
    const comparable = resolveComparablePrices({
      item: { ...item, amount: '3 Stück' },
      enteredAmount: 9,
      isProduce: false,
      wasSale: false,
      priceMode: 'total',
      quantity: 3,
      selectedVariant: { ...variant, lastPrice: 3, purchaseCount: 1, lastPurchaseWasSale: false, salePurchaseCount: 0 },
      purchaseLog: [],
      currency: 'CHF',
    })
    expect(comparable).toEqual({ entered: 9, reference: 9 })
  })

  it('nutzt Kaufhistorie ohne Variante', () => {
    const result = computePriceDelta({
      item: { ...item, name: 'Tomaten' },
      enteredAmount: 5,
      isProduce: false,
      wasSale: false,
      priceMode: 'total',
      quantity: 1,
      purchaseLog,
      currency: 'CHF',
    })
    expect(result?.direction).toBe('up')
    expect(result?.referencePrice).toBe(4.5)
  })
})
