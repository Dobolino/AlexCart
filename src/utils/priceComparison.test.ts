import { describe, expect, it } from 'vitest'
import { compareProductPrices, convertMoney, minorMoney, normalizedPrice } from './priceComparison'
import { normalizeGtin, expandUpce } from './barcode'
import type { CatalogProduct, FxSnapshot, PriceObservation } from '@/types/catalog'

const product: CatalogProduct = {
  id: 'milk',
  name: 'Milch',
  gtins: [],
  category: 'Milch & Käse',
  netQuantity: { value: 500, unit: 'ml' },
  source: 'manual',
  updatedAt: '2026-10-24T12:00:00Z',
}
const fx: FxSnapshot = {
  id: 'rate',
  base: 'EUR',
  quote: 'CHF',
  quotePerBase: '0.95',
  rateDate: '2026-10-23',
  fetchedAt: '2026-10-24T12:00:00Z',
  source: 'Test',
}
const price: PriceObservation = {
  id: 'p',
  productId: 'milk',
  storeId: 'shop',
  price: { minor: 179, currency: 'EUR' },
  observedAt: '2026-10-24T12:00:00Z',
  source: 'manual',
  basis: 'package',
}

describe('price comparison', () => {
  it('converts both directions using decimal arithmetic and retains original cents', () => {
    expect(convertMoney(price.price, 'CHF', fx)?.toString()).toBe('1.7005')
    expect(convertMoney({ minor: 95, currency: 'CHF' }, 'EUR', fx)?.toString()).toBe('1')
    expect(price.price.minor).toBe(179)
    expect(minorMoney(1.005, 'CHF').minor).toBe(101)
  })
  it('normalizes package sizes and does not invent missing exchange rates', () => {
    expect(normalizedPrice(product, price, 'CHF', fx)).toEqual({ amount: 3.401, unit: 'l' })
    expect(normalizedPrice(product, price, 'CHF', null)).toBeNull()
    expect(normalizedPrice({ ...product, netQuantity: undefined }, price, 'EUR', null)).toBeNull()
    expect(compareProductPrices(product, [{ ...price, validUntil: '2020-01-01' }], 'CHF', fx)).toHaveLength(0)
  })
  it('validates GTIN check digits and preserves leading zeros', () => {
    expect(normalizeGtin('4006381333931')).toBe('04006381333931')
    expect(normalizeGtin('4006381333932')).toBeNull()
    expect(normalizeGtin('96385074')).toBe('00000096385074')
    expect(expandUpce('04252614')).toBe('042100005264')
    expect(normalizeGtin(expandUpce('04252614')!)).toBe('00042100005264')
  })
})
