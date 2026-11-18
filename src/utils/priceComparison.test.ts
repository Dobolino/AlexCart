import { describe, expect, it } from 'vitest'
import {
  compareProductPrices,
  convertMoney,
  minorMoney,
  normalizedPrice,
  priceAdvantage,
} from './priceComparison'
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
  it('accepts a price recorded for today before the date-only noon timestamp', () => {
    const morning = new Date(2026, 9, 24, 8)
    const noon = new Date(2026, 9, 24, 12).toISOString()
    expect(
      compareProductPrices(product, [{ ...price, observedAt: noon }], 'EUR', null, morning)
    ).toHaveLength(1)
    const tomorrow = new Date(2026, 9, 25, 12).toISOString()
    expect(
      compareProductPrices(product, [{ ...price, observedAt: tomorrow }], 'EUR', null, morning)
    ).toHaveLength(0)
  })
  it('keeps normal and conditional prices separate and never ranks future or mismatched prices', () => {
    const now = new Date('2026-10-26T12:00:00Z')
    const normal = {
      ...price,
      id: 'normal',
      storeId: 'migros',
      price: { minor: 250, currency: 'CHF' as const },
    }
    const cheaper = {
      ...normal,
      id: 'cheaper',
      storeId: 'marktkauf',
      price: { minor: 200, currency: 'CHF' as const },
    }
    const sale = {
      ...normal,
      id: 'sale',
      discounted: true,
      price: { minor: 50, currency: 'CHF' as const },
      observedAt: '2026-10-25T12:00:00Z',
    }
    const loyalty = {
      ...cheaper,
      id: 'loyalty',
      loyaltyRequired: true,
      price: { minor: 1, currency: 'CHF' as const },
    }
    const future = { ...cheaper, id: 'future', observedAt: '2027-01-01T12:00:00Z' }
    const rows = compareProductPrices(product, [normal, cheaper, sale, loyalty, future], 'CHF', fx, now)
    expect(rows.map((row) => row.observation.id)).toEqual(['cheaper', 'normal', 'loyalty', 'sale'])
    expect(priceAdvantage(rows)).toMatchObject({
      cheapest: { id: 'cheaper' },
      reference: { id: 'normal' },
      percent: 20,
    })
    expect(
      priceAdvantage(rows.filter((row) => row.observation.discounted || row.observation.loyaltyRequired))
    ).toBeNull()
    expect(normalizedPrice(product, { ...normal, basis: 'kg' }, 'CHF', fx)).toBeNull()
    expect(compareProductPrices(product, [future], 'CHF', fx, now)).toEqual([])
  })
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
