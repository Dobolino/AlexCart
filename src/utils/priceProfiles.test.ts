import { describe, expect, it } from 'vitest'
import {
  applyPurchaseToVariant,
  buildProfilesFromPurchaseLog,
  ensureBrandVariant,
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
    expect(estimateItemPrice(profiles, item({ amount: '2 Stk' }))).toBe(5.6)
    const est = estimateOpenListCost([item(), item({ id: '2', name: 'Unbekannt', category: 'Sonstiges' })], profiles)
    expect(est.total).toBe(2.8)
    expect(est.pricedItemCount).toBe(1)
    expect(est.openItemCount).toBe(2)
  })

  it('skaliert g/kg-Artikel mit erfasstem Kilopreis nach Gewicht', () => {
    const profiles: ProductPriceProfile[] = [
      {
        id: 'p1',
        itemName: 'Hähnchenbrust',
        category: 'Fleisch & Fisch',
        baseKey: profileBaseKey('Hähnchenbrust', 'Fleisch & Fisch'),
        preferredVariantId: 'v1',
        createdAt: 0,
        updatedAt: 0,
        variants: [
          {
            id: 'v1',
            name: 'Standard',
            lastPrice: 12,
            avgPrice: 12,
            pricePerKg: 12, // CHF 12/kg = CHF 1.20/100 g
            purchaseCount: 1,
            lastPurchaseDate: '2026-07-08',
            lastPurchaseWasSale: false,
            salePurchaseCount: 0,
          },
        ],
      },
    ]
    const chicken = (amount: string) =>
      item({ name: 'Hähnchenbrust', category: 'Fleisch & Fisch', amount })
    expect(estimateItemPrice(profiles, chicken('800 g'))).toBe(9.6)
    expect(estimateItemPrice(profiles, chicken('400 g'))).toBe(4.8)
    expect(estimateItemPrice(profiles, chicken('1 kg'))).toBe(12)
  })

  it('schätzt Stück-Obst mit Stückpreis × Anzahl, nicht als Gewicht', () => {
    const profiles: ProductPriceProfile[] = [
      {
        id: 'p1',
        itemName: 'Kiwi',
        category: 'Früchte & Gemüse',
        baseKey: profileBaseKey('Kiwi', 'Früchte & Gemüse'),
        preferredVariantId: 'v1',
        createdAt: 0,
        updatedAt: 0,
        variants: [
          {
            id: 'v1',
            name: 'Standard',
            lastPrice: 0.8,
            avgPrice: 0.8,
            purchaseCount: 2,
            lastPurchaseDate: '2026-07-08',
            lastPurchaseWasSale: false,
            salePurchaseCount: 0,
          },
        ],
      },
    ]
    expect(estimateItemPrice(profiles, item({ name: 'Kiwi', category: 'Früchte & Gemüse', amount: '2 Stück' }))).toBe(1.6)
  })

  it('lässt g/kg-Artikel ohne erfassten Kilopreis unverändert (fester Preis)', () => {
    const profiles: ProductPriceProfile[] = [
      {
        id: 'p1',
        itemName: 'Hähnchenbrust',
        category: 'Fleisch & Fisch',
        baseKey: profileBaseKey('Hähnchenbrust', 'Fleisch & Fisch'),
        preferredVariantId: 'v1',
        createdAt: 0,
        updatedAt: 0,
        variants: [
          {
            id: 'v1',
            name: 'Standard',
            lastPrice: 8.5, // nur Gesamtpreis, kein pricePerKg
            avgPrice: 8.5,
            purchaseCount: 1,
            lastPurchaseDate: '2026-07-08',
            lastPurchaseWasSale: false,
            salePurchaseCount: 0,
          },
        ],
      },
    ]
    const chicken = (amount: string) =>
      item({ name: 'Hähnchenbrust', category: 'Fleisch & Fisch', amount })
    expect(estimateItemPrice(profiles, chicken('800 g'))).toBe(8.5)
    expect(estimateItemPrice(profiles, chicken('400 g'))).toBe(8.5)
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

  it('ensureBrandVariant legt Profil+Variante ohne Kaufhistorie an', () => {
    let n = 0
    const createId = () => `id-${++n}`
    const { profiles, variantId } = ensureBrandVariant([], 'Milch', 'Milch & Käse', 'brand-1', 'Migros', createId)
    const profile = findPriceProfile(profiles, 'Milch', 'Milch & Käse')
    expect(profile?.variants).toHaveLength(1)
    const variant = profile?.variants[0]
    expect(variant?.id).toBe(variantId)
    expect(variant?.brandId).toBe('brand-1')
    expect(variant?.name).toBe('Migros')
    expect(variant?.purchaseCount).toBe(0)
  })

  it('ensureBrandVariant gibt bestehende Marken-Variante zurück statt Duplikat', () => {
    let n = 0
    const createId = () => `id-${++n}`
    const first = ensureBrandVariant([], 'Milch', 'Milch & Käse', 'brand-1', 'Migros', createId)
    const second = ensureBrandVariant(first.profiles, 'Milch', 'Milch & Käse', 'brand-1', 'Migros', createId)
    const profile = findPriceProfile(second.profiles, 'Milch', 'Milch & Käse')
    expect(profile?.variants).toHaveLength(1)
    expect(second.variantId).toBe(first.variantId)
  })
})
