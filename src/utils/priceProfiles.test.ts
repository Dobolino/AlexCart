import { describe, expect, it } from 'vitest'
import {
  applyPurchaseToVariant,
  buildProfilesFromPurchaseLog,
  estimateItemPrice,
  estimateOpenListCost,
  estimateVariantPrice,
  findPriceProfile,
  profileBaseKey,
  recordVariantPurchase,
} from './priceProfiles'
import type { ProductPriceProfile, ShoppingItem } from '@/types'

const item = (patch: Partial<ShoppingItem> = {}): ShoppingItem => ({
  id: '1',
  name: 'Milch',
  amount: '1 l',
  category: 'Milch & Käse',
  done: false,
  favorite: false,
  addedAt: 0,
  ...patch,
})

describe('priceProfiles', () => {
  it('speichert Normal- und Aktionspreise getrennt', () => {
    let variant = applyPurchaseToVariant(
      { id: 'v1', name: 'Bio', purchaseCount: 0, lastPurchaseWasSale: false, salePurchaseCount: 0 },
      2.5,
      '2026-07-01',
      false
    )
    variant = applyPurchaseToVariant(variant, 1.9, '2026-07-08', true)

    expect(variant.lastPrice).toBe(2.5)
    expect(variant.avgPrice).toBe(2.5)
    expect(variant.lastSalePrice).toBe(1.9)
    expect(variant.lastPurchaseWasSale).toBe(true)
    expect(variant.salePurchaseCount).toBe(1)
  })

  it('legt neue Variante beim ersten Kauf an', () => {
    const result = recordVariantPurchase(
      [],
      'Milch',
      'Milch & Käse',
      { price: 2.2, variantName: 'M-Budget 1L' },
      '2026-07-09',
      () => 'id-1'
    )

    expect(result.createdNewProfile).toBe(true)
    expect(result.variantName).toBe('M-Budget 1L')
    expect(result.variant.lastPrice).toBe(2.2)
  })

  it('schätzt Listenkosten nach Priorität', () => {
    const profiles: ProductPriceProfile[] = [
      {
        id: 'p1',
        itemName: 'Milch',
        category: 'Milch & Käse',
        baseKey: profileBaseKey('Milch', 'Milch & Käse'),
        preferredVariantId: 'v1',
        createdAt: 0,
        updatedAt: 0,
        variants: [
          {
            id: 'v1',
            name: 'Bio',
            lastPrice: 2.8,
            avgPrice: 2.6,
            purchaseCount: 3,
            lastPurchaseDate: '2026-07-08',
            lastPurchaseWasSale: false,
            salePurchaseCount: 0,
          },
        ],
      },
    ]

    expect(estimateItemPrice(profiles, item())).toBe(2.8)
    const est = estimateOpenListCost([item(), item({ id: '2', name: 'Unbekannt', category: 'Sonstiges' })], profiles)
    expect(est.total).toBe(2.8)
    expect(est.pricedItemCount).toBe(1)
    expect(est.openItemCount).toBe(2)
  })

  it('nutzt Durchschnitt wenn kein letzter Normalpreis', () => {
    const variant = {
      id: 'v1',
      name: 'Bio',
      avgPrice: 2.4,
      purchaseCount: 2,
      lastPurchaseDate: '2026-07-01',
      lastPurchaseWasSale: true,
      lastSalePrice: 1.5,
      salePurchaseCount: 1,
    }
    expect(estimateVariantPrice(variant)).toBe(2.4)
  })

  it('migriert purchaseLog in Profile', () => {
    const profiles = buildProfilesFromPurchaseLog(
      [
        { name: 'Milch', category: 'Milch & Käse', date: '2026-07-01', price: 2.1 },
        { name: 'Milch', category: 'Milch & Käse', date: '2026-07-08', price: 2.4, variantName: 'Bio' },
      ],
      () => 'gen'
    )
    const profile = findPriceProfile(profiles, 'Milch', 'Milch & Käse')
    expect(profile?.variants.length).toBe(2)
  })
})
