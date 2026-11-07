import { describe, expect, it } from 'vitest'
import type { ProductPriceProfile, PurchaseLogEntry, ShoppingItem } from '@/types'
import type { CatalogProduct, PriceObservation, RetailStore } from '@/types/catalog'
import { estimateItemPrice, estimateOpenListCost, profileBaseKey } from './priceProfiles'
import type { PriceEstimateContext } from './priceEstimate'

const item = (patch: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: 'milk',
  name: 'Milch',
  category: 'Milch & Käse',
  amount: '1 l',
  done: false,
  addedAt: 1,
  ...patch,
})
const product = (patch: Partial<CatalogProduct> = {}): CatalogProduct => ({
  id: 'milk-1l',
  name: 'Milch',
  category: 'Milch & Käse',
  brand: 'Testmilch',
  gtins: [],
  netQuantity: { value: 1000, unit: 'ml' },
  source: 'manual',
  updatedAt: '2026-10-01',
  ...patch,
})
const stores: RetailStore[] = [
  { id: 'migros', name: 'Migros', retailerId: 'migros', currency: 'CHF', country: 'CH' },
  { id: 'coop', name: 'Coop', retailerId: 'coop', currency: 'CHF', country: 'CH' },
  { id: 'edeka', name: 'Edeka', retailerId: 'edeka', currency: 'EUR', country: 'DE' },
]
const observation = (patch: Partial<PriceObservation> = {}): PriceObservation => ({
  id: 'milk-reference',
  productId: 'milk-1l',
  storeId: 'migros',
  price: { minor: 150, currency: 'CHF' },
  basis: 'package',
  observedAt: '2026-10-01T12:00:00Z',
  source: 'receipt',
  ...patch,
})
const context = (patch: Partial<PriceEstimateContext> = {}): PriceEstimateContext => ({
  catalog: [product()],
  observations: [observation()],
  stores,
  storeId: 'migros',
  now: new Date('2026-11-07T12:00:00Z'),
  ...patch,
})
const profile = (
  variantPatch: Partial<ProductPriceProfile['variants'][number]> = {}
): ProductPriceProfile => ({
  id: 'profile',
  itemName: 'Milch',
  category: 'Milch & Käse',
  baseKey: profileBaseKey('Milch', 'Milch & Käse'),
  createdAt: 1,
  updatedAt: 1,
  preferredVariantId: 'variant',
  variants: [
    {
      id: 'variant',
      name: 'Migros · Testmilch · 1 l',
      lastPrice: 2.4,
      lastPurchaseDate: '2026-10-31',
      purchaseCount: 1,
      salePurchaseCount: 0,
      lastPurchaseWasSale: false,
      ...variantPatch,
    },
  ],
})
const purchase = (patch: Partial<PurchaseLogEntry> = {}): PurchaseLogEntry => ({
  id: 'own-milk',
  name: 'Milch',
  category: 'Milch & Käse',
  date: '2026-10-15',
  amount: '1 l',
  price: 1.8,
  profilePrice: 1.8,
  currency: 'CHF',
  variantId: 'variant',
  variantName: 'Standard',
  storeId: 'migros',
  ...patch,
})

describe('historical receipt price estimates', () => {
  it('supplements missing profiles with receipt prices and scales whole known packages', () => {
    expect(estimateItemPrice([], item({ amount: '2 l' }), 'CHF', context())).toBe(3)
    expect(estimateItemPrice([], item({ amount: '1.5 l' }), 'CHF', context())).toBe(3)
    expect(estimateItemPrice([], item({ amount: '3 Packungen' }), 'CHF', context())).toBe(4.5)
  })

  it('keeps normal personal prices ahead of archival references', () => {
    expect(estimateItemPrice([profile()], item(), 'CHF', context())).toBe(2.4)
  })

  it('uses the selected retailer purchase instead of a mixed-store variant aggregate or archive price', () => {
    const ctx = context({
      purchaseLog: [
        purchase(),
        purchase({ id: 'coop-buy', storeId: 'coop', date: '2026-11-01', price: 9, profilePrice: 9 }),
      ],
      observations: [observation({ price: { minor: 250, currency: 'CHF' } })],
    })
    const p = profile({ name: 'Standard', lastPrice: 9, lastPurchaseDate: '2026-11-01' })
    expect(estimateItemPrice([p], item(), 'CHF', ctx)).toBe(1.8)
    expect(estimateItemPrice([p], item({ amount: '2 l' }), 'CHF', ctx)).toBe(3.6)
    expect(estimateItemPrice([p], item(), 'CHF', { ...ctx, storeId: 'coop' })).toBe(9)
    expect(estimateOpenListCost([item()], [p], 'CHF', ctx).referenceItemCount).toBe(0)
  })

  it('respects explicit product and variant identities for personal history', () => {
    const ctx = context({ purchaseLog: [purchase({ productId: 'other-product' })] })
    expect(estimateItemPrice([], item({ productId: 'milk-1l' }), 'CHF', ctx)).toBe(1.5)
    expect(estimateItemPrice([], item({ variantId: 'other-variant' }), 'CHF', ctx)).toBeNull()
    expect(estimateItemPrice([], item({ variantId: 'variant' }), 'CHF', ctx)).toBe(1.8)
    expect(estimateItemPrice([], item({ productId: 'other-product' }), 'CHF', ctx)).toBe(1.8)
  })

  it('calculates personal weighted and multi-package prices from the individual purchase', () => {
    expect(
      estimateItemPrice(
        [],
        item({ amount: '400 g' }),
        'CHF',
        context({ purchaseLog: [purchase({ amount: '500 g', price: 6, profilePrice: 12, pricePerKg: 12 })] })
      )
    ).toBe(4.8)
    expect(
      estimateItemPrice(
        [],
        item({ amount: '3 Packungen' }),
        'CHF',
        context({ purchaseLog: [purchase({ amount: '2 Packungen', price: 3.6, profilePrice: 1.8 })] })
      )
    ).toBe(5.4)
    expect(
      estimateItemPrice(
        [],
        item({ amount: '3 Packungen' }),
        'CHF',
        context({ purchaseLog: [purchase({ amount: '2 Packungen', price: 3.6, profilePrice: undefined })] })
      )
    ).toBe(5.4)
    expect(
      estimateItemPrice(
        [],
        item({ amount: '2 Stück' }),
        'CHF',
        context({ purchaseLog: [purchase({ amount: undefined })] })
      )
    ).toBe(3.6)
  })

  it('excludes sales, future purchases and other currencies instead of falling back to their aggregate', () => {
    const p = profile({ name: 'Migros', lastPrice: 9 })
    for (const patch of [
      { wasSale: true },
      { date: '2026-12-01' },
      { currency: 'EUR' as const },
      { storeId: 'coop' },
    ]) {
      expect(estimateItemPrice([p], item(), 'CHF', context({ purchaseLog: [purchase(patch)] }))).toBe(1.5)
    }
  })

  it('prefers exact branch history and then the explicitly preferred eligible variant', () => {
    const p = profile({ name: 'Standard' })
    const ctx = context({
      stores: [...stores, { ...stores[0]!, id: 'branch', name: 'Migros Basel' }],
      purchaseLog: [
        purchase(),
        purchase({
          id: 'new-variant',
          variantId: 'new-variant',
          date: '2026-11-01',
          price: 3,
          profilePrice: 3,
        }),
        purchase({ id: 'branch-buy', storeId: 'branch', date: '2026-11-02', price: 4, profilePrice: 4 }),
      ],
    })
    expect(estimateItemPrice([p], item(), 'CHF', ctx)).toBe(1.8)
    expect(estimateItemPrice([p], item(), 'CHF', { ...ctx, storeId: 'branch' })).toBe(4)
  })

  it('keeps unknown brands and package-count placeholders distinct unless a product was selected', () => {
    for (const patch of [{ brand: undefined }, { netQuantity: { value: 1, unit: 'piece' as const } }]) {
      const first = product(patch),
        second = product({ ...patch, id: 'another-product' })
      const ctx = context({
        catalog: [first, second],
        observations: [observation(), observation({ id: 'other', productId: second.id })],
      })
      const request = item({ amount: '2 Packungen' })
      expect(estimateItemPrice([], request, 'CHF', ctx)).toBeNull()
      expect(estimateItemPrice([], { ...request, productId: first.id }, 'CHF', ctx)).toBe(3)
    }
  })

  it('keeps an explicit catalog identity ahead of a name-only profile of a different brand or package', () => {
    expect(
      estimateItemPrice(
        [profile({ name: 'Migros · Andere Marke · 500 ml' })],
        item({ productId: 'milk-1l' }),
        'CHF',
        context()
      )
    ).toBe(1.5)
    expect(estimateItemPrice([profile()], item({ productId: 'missing' }), 'CHF', context())).toBeNull()
  })

  it('requires proof of the selected retailer for a profile and filters reference currency and retailer', () => {
    const refs = context({
      observations: [
        observation({ id: 'coop', storeId: 'coop', price: { minor: 90, currency: 'CHF' } }),
        observation({ id: 'edeka', storeId: 'edeka', price: { minor: 80, currency: 'EUR' } }),
        observation(),
      ],
    })
    expect(estimateItemPrice([profile({ name: 'Standard' })], item(), 'CHF', refs)).toBe(1.5)
    expect(estimateItemPrice([profile({ name: 'Coop Bio' })], item(), 'CHF', refs)).toBe(1.5)
    expect(estimateItemPrice([], item(), 'EUR', { ...refs, storeId: 'edeka' })).toBe(0.8)
    expect(estimateItemPrice([], item(), 'EUR', refs)).toBeNull()
  })

  it('selects an applicable store profile instead of a preferred profile from another store', () => {
    const p = profile()
    p.variants.push({ ...p.variants[0]!, id: 'coop', name: 'Coop Bio', lastPrice: 1 })
    p.preferredVariantId = 'coop'
    expect(estimateItemPrice([p], item(), 'CHF', context())).toBe(2.4)
  })

  it('never replaces an explicitly selected unavailable variant with a different brand', () => {
    expect(
      estimateItemPrice(
        [profile({ name: 'Coop · andere Marke' })],
        item({ variantId: 'variant' }),
        'CHF',
        context()
      )
    ).toBeNull()
    expect(estimateItemPrice([], item({ variantId: 'missing-variant' }), 'CHF', context())).toBeNull()
    expect(
      estimateItemPrice([], item({ variantId: 'missing-variant', productId: 'milk-1l' }), 'CHF', context())
    ).toBe(1.5)
  })

  it.each(['', 'nach Bedarf', '0 l', '2 Schachteln', '-1 l'])(
    'leaves unknown or invalid quantity %s unpriced',
    (amount) => {
      expect(estimateItemPrice([], item({ amount }), 'CHF', context())).toBeNull()
      expect(estimateItemPrice([profile()], item({ amount }), 'CHF', context())).toBeNull()
    }
  )

  it('does not join fuzzy names or override an explicit product identity', () => {
    expect(estimateItemPrice([], item({ name: 'Hafermilch' }), 'CHF', context())).toBeNull()
    expect(estimateItemPrice([], item({ productId: 'missing' }), 'CHF', context())).toBeNull()
    expect(
      estimateItemPrice([], item({ name: 'Mein Milchprodukt', productId: 'milk-1l' }), 'CHF', context())
    ).toBe(1.5)
  })

  it('does not choose between brands or package sizes for ambiguous counts', () => {
    const otherBrand = product({ id: 'other-brand', brand: 'Andere Marke' })
    const otherSize = product({ id: 'other-size', netQuantity: { value: 500, unit: 'ml' } })
    const withBrand = context({
      catalog: [product(), otherBrand],
      observations: [observation(), observation({ id: 'b', productId: otherBrand.id })],
    })
    const withSize = context({
      catalog: [product(), otherSize],
      observations: [
        observation(),
        observation({ id: 's', productId: otherSize.id, price: { minor: 90, currency: 'CHF' } }),
      ],
    })
    expect(estimateItemPrice([], item({ amount: '2 Packungen' }), 'CHF', withBrand)).toBeNull()
    expect(estimateItemPrice([], item({ amount: '2 Packungen' }), 'CHF', withSize)).toBeNull()
    expect(estimateItemPrice([], item(), 'CHF', withSize)).toBe(1.5)
    expect(estimateItemPrice([], item({ amount: '2 × 500 ml' }), 'CHF', withSize)).toBe(1.8)
    expect(
      estimateItemPrice([], item({ amount: '2 Packungen', productId: otherBrand.id }), 'CHF', withBrand)
    ).toBe(3)
  })

  it('calculates explicit weight and volume bases without treating counts as weights', () => {
    const kg = context({
      catalog: [product({ netQuantity: { value: 1000, unit: 'g' } })],
      observations: [observation({ basis: 'kg', price: { minor: 1250, currency: 'CHF' } })],
    })
    expect(estimateItemPrice([], item({ amount: '400 g' }), 'CHF', kg)).toBe(5)
    expect(estimateItemPrice([], item({ amount: '2 Stück' }), 'CHF', kg)).toBeNull()
    expect(estimateItemPrice([], item({ amount: '400 ml' }), 'CHF', kg)).toBeNull()
    expect(
      estimateItemPrice([], item({ amount: '400 g' }), 'CHF', { ...kg, catalog: [product()] })
    ).toBeNull()
    const litre = context({
      observations: [observation({ basis: 'l', price: { minor: 200, currency: 'CHF' } })],
    })
    expect(estimateItemPrice([], item({ amount: '250 ml' }), 'CHF', litre)).toBe(0.5)
    const piece = context({ observations: [observation({ basis: 'piece' })] })
    expect(estimateItemPrice([], item({ amount: '3 Stück' }), 'CHF', piece)).toBe(4.5)
  })

  it('prefers an exact branch and requires an explicit store when multiple stores offer the same product', () => {
    const ctx = context({
      stores: [...stores, { ...stores[0]!, id: 'branch', name: 'Migros Basel' }],
      observations: [
        observation(),
        observation({
          id: 'branch-price',
          storeId: 'branch',
          observedAt: '2026-10-31T12:00:00Z',
          price: { minor: 200, currency: 'CHF' },
        }),
      ],
    })
    expect(estimateItemPrice([], item(), 'CHF', ctx)).toBe(1.5)
    expect(estimateItemPrice([], item(), 'CHF', { ...ctx, storeId: 'branch' })).toBe(2)
    expect(estimateItemPrice([], item(), 'CHF', { ...ctx, storeId: undefined })).toBeNull()
  })

  it.each<Partial<PriceObservation>>([
    { discounted: true },
    { loyaltyRequired: true },
    { minimumQuantity: 1 },
    { validUntil: '2026-11-06' },
    { validUntil: 'invalid' },
    { observedAt: '2026-12-01T12:00:00Z' },
    { observedAt: 'invalid' },
    { price: { minor: -150, currency: 'CHF' } },
    { price: { minor: 1.5, currency: 'CHF' } },
    { price: { minor: 0, currency: 'CHF' } },
    { storeId: 'unknown' },
  ])('excludes conditional, invalid, expired or future observations: %j', (patch) => {
    expect(estimateItemPrice([], item(), 'CHF', context({ observations: [observation(patch)] }))).toBeNull()
  })

  it('takes the newest eligible normal reference and flags dated historical estimates', () => {
    const ctx = context({
      observations: [
        observation({
          id: 'old',
          observedAt: '2025-11-01T12:00:00Z',
          price: { minor: 100, currency: 'CHF' },
        }),
        observation({ observedAt: '2026-01-01T12:00:00Z' }),
      ],
    })
    const result = estimateOpenListCost(
      [item(), item({ id: 'unknown', name: 'Brot' }), item({ id: 'done', done: true })],
      [],
      'CHF',
      ctx
    )
    expect(result).toEqual({
      total: 1.5,
      pricedItemCount: 1,
      openItemCount: 2,
      referenceItemCount: 1,
      oldPriceItemCount: 1,
    })
  })
})
