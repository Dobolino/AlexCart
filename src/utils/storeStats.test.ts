import { describe, expect, it } from 'vitest'
import { avgBasketByStore, promoSavingsInYear, savingsForSaleEntry } from './storeStats'
import type { CompletedTrip, ProductPriceProfile, PurchaseLogEntry } from '@/types'

const trips: CompletedTrip[] = [
  {
    id: 't1',
    listId: 'l1',
    listName: 'Woche',
    completedAt: Date.parse('2026-07-01T12:00:00'),
    store: 'Migros',
    items: [
      { id: 'a', name: 'Milch', amount: '1 l', price: 80 },
      { id: 'b', name: 'Brot', amount: '1 Stk', price: 4.2 },
    ],
  },
  {
    id: 't2',
    listId: 'l1',
    listName: 'Woche',
    completedAt: Date.parse('2026-07-08T12:00:00'),
    store: 'Coop',
    items: [{ id: 'c', name: 'Käse', amount: '200 g', price: 91.5 }],
  },
  {
    id: 't3',
    listId: 'l1',
    listName: 'Woche',
    completedAt: Date.parse('2026-07-09T12:00:00'),
    store: 'migros',
    items: [{ id: 'd', name: 'Joghurt', amount: '1 Stk', price: 75 }],
  },
]

const profiles: ProductPriceProfile[] = [
  {
    id: 'p1',
    itemName: 'Tomaten',
    category: 'Früchte & Gemüse',
    baseKey: 'tomaten|fruchte & gemuse',
    variants: [
      {
        id: 'v1',
        name: 'Standard',
        lastPrice: 5,
        avgPrice: 5,
        purchaseCount: 3,
        lastPurchaseWasSale: false,
        salePurchaseCount: 1,
        lastSalePrice: 3.5,
      },
    ],
    createdAt: 1,
    updatedAt: 1,
  },
]

describe('storeStats', () => {
  it('berechnet Ø Warenkorb pro Filiale', () => {
    const stats = avgBasketByStore(trips)
    expect(stats).toHaveLength(2)
    // Günstigste zuerst (Migros Ø 79.6 < Coop 91.5)
    expect(stats[0]?.store).toBe('Migros')
    expect(stats[0]?.percentAboveCheapest).toBe(0)
    expect(stats[0]?.tripCount).toBe(2)
    expect(stats[0]?.avgSpent).toBe(79.6)
    const coop = stats.find((s) => s.store === 'Coop')
    expect(coop?.avgSpent).toBe(91.5)
    expect(coop?.percentAboveCheapest).toBe(14.9)
  })

  it('berechnet Ersparnis gegen Normalpreis', () => {
    const entry: PurchaseLogEntry = {
      name: 'Tomaten',
      category: 'Früchte & Gemüse',
      date: '2026-07-02',
      price: 3.5,
      wasSale: true,
      variantId: 'v1',
    }
    expect(savingsForSaleEntry(entry, profiles)).toBe(1.5)
  })

  it('summiert Jahres-Ersparnis aus Aktionskäufen', () => {
    const log: PurchaseLogEntry[] = [
      {
        name: 'Tomaten',
        category: 'Früchte & Gemüse',
        date: '2026-07-02',
        price: 3.5,
        wasSale: true,
        variantId: 'v1',
      },
      {
        name: 'Tomaten',
        category: 'Früchte & Gemüse',
        date: '2025-12-31',
        price: 3,
        wasSale: true,
        variantId: 'v1',
      },
    ]
    expect(promoSavingsInYear(log, profiles, 2026)).toBe(1.5)
  })
})
