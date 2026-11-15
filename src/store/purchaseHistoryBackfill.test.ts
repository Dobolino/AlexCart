import { describe, expect, it } from 'vitest'
import { useStore } from './useStore'
import { pricesForCurrency } from '@/utils/priceProfiles'
import type { PurchaseLogEntry } from '@/types'

type MigratedState = ReturnType<typeof useStore.getState>

describe('migration v27: backfills purchaseLog storeId/variantId so historical receipts reach the estimator', () => {
  it('links an entry missing storeId via its completed trip, and creates a price profile for an entry that never had one', () => {
    const migrate = useStore.persist.getOptions().migrate!
    const legacy = {
      completedTrips: [
        {
          id: 'trip1',
          listId: 'l1',
          listName: 'Woche',
          completedAt: Date.now(),
          storeId: 'store-migros',
          currency: 'CHF',
          items: [{ id: 'a', name: 'Milch', amount: '1 l', price: 2.5, purchaseLogId: 'log1' }],
        },
      ],
      purchaseLog: [
        {
          id: 'log1',
          name: 'Milch',
          category: 'Milch & Käse',
          date: '2026-06-01',
          price: 2.5,
          currency: 'CHF',
        },
        {
          id: 'log2',
          name: 'Brot',
          category: 'Brot & Backwaren',
          date: '2026-06-02',
          price: 3,
          currency: 'CHF',
        },
      ],
      priceProfiles: [],
      lists: [{ id: 'l1', name: 'Woche', weekLabel: '', createdAt: 1, items: [] }],
    } as unknown as Partial<MigratedState>

    const migrated = migrate(legacy, 26) as MigratedState

    const milk = migrated.purchaseLog.find((e: PurchaseLogEntry) => e.id === 'log1')!
    expect(milk.storeId).toBe('store-migros')
    expect(milk.variantId).toBeDefined()

    const bread = migrated.purchaseLog.find((e: PurchaseLogEntry) => e.id === 'log2')!
    expect(bread.storeId).toBeUndefined() // not linked to any trip - nothing to derive it from
    expect(bread.variantId).toBeDefined() // still gets a profile even without a store link

    expect(migrated.priceProfiles).toHaveLength(2)
    const variant = migrated.priceProfiles
      .flatMap((p) => p.variants)
      .find((v: { id: string }) => v.id === milk.variantId)!
    expect(pricesForCurrency(variant, 'CHF')).toMatchObject({ lastPrice: 2.5, purchaseCount: 1 })
  })

  it('does nothing for an entry that already has a variantId (never double-counts)', () => {
    const migrate = useStore.persist.getOptions().migrate!
    const legacy = {
      completedTrips: [],
      purchaseLog: [
        {
          id: 'log1',
          name: 'Milch',
          category: 'Milch & Käse',
          date: '2026-06-01',
          price: 2.5,
          currency: 'CHF',
          variantId: 'existing-variant',
        },
      ],
      priceProfiles: [],
      lists: [{ id: 'l1', name: 'Woche', weekLabel: '', createdAt: 1, items: [] }],
    } as unknown as Partial<MigratedState>

    const migrated = migrate(legacy, 26) as MigratedState
    expect(migrated.purchaseLog[0]!.variantId).toBe('existing-variant')
    expect(migrated.priceProfiles).toHaveLength(0)
  })

  it('skips entries with no positive price', () => {
    const migrate = useStore.persist.getOptions().migrate!
    const legacy = {
      completedTrips: [],
      purchaseLog: [
        { id: 'log1', name: 'Milch', category: 'Milch & Käse', date: '2026-06-01' },
        { id: 'log2', name: 'Brot', category: 'Brot & Backwaren', date: '2026-06-01', price: 0 },
      ],
      priceProfiles: [],
      lists: [{ id: 'l1', name: 'Woche', weekLabel: '', createdAt: 1, items: [] }],
    } as unknown as Partial<MigratedState>

    const migrated = migrate(legacy, 26) as MigratedState
    expect(migrated.priceProfiles).toHaveLength(0)
    expect(migrated.purchaseLog.every((e: PurchaseLogEntry) => !e.variantId)).toBe(true)
  })
})
