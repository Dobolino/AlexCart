import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useStore } from './useStore'
import type { PriceArchive } from '@/utils/priceArchive'
import { estimateOpenListCost } from '@/utils/priceProfiles'
import { parseBackup, STORAGE_VERSION } from '@/utils/validation'

const archive = (): PriceArchive => ({
  format: 'alexshop-price-archive',
  version: 1,
  catalog: [
    {
      id: 'archive-milk',
      name: 'Milch',
      brand: 'Testmarke',
      category: 'Milch & Käse',
      gtins: [],
      netQuantity: { value: 1000, unit: 'ml' },
      source: 'manual',
      updatedAt: '2026-01-01T12:00:00.000Z',
    },
  ],
  retailStores: [
    { id: 'archive-store', name: 'Migros', country: 'CH', currency: 'CHF', retailerId: 'migros' },
  ],
  priceObservations: [
    {
      id: 'archive-price',
      productId: 'archive-milk',
      storeId: 'archive-store',
      price: { minor: 180, currency: 'CHF' },
      basis: 'package',
      observedAt: '2026-01-01T12:00:00.000Z',
      source: 'receipt',
    },
  ],
})
beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  })
  useStore.getState().resetAll()
})
afterEach(() => vi.unstubAllGlobals())
describe('price archive store import', () => {
  it('improves a matching estimate without creating purchases, stock movements or duplicate prices', () => {
    const before = useStore.getState()
    expect(before.importPriceArchive(archive())).toMatchObject({
      ok: true,
      addedProducts: 1,
      addedObservations: 1,
    })
    const state = useStore.getState()
    for (const key of [
      'lists',
      'completedTrips',
      'purchaseLog',
      'pantry',
      'priceProfiles',
      'settings',
      'stats',
    ] as const)
      expect(state[key]).toBe(before[key])
    const estimate = estimateOpenListCost(
      [{ id: 'planned', name: 'Milch', category: 'Milch & Käse', amount: '2 l', done: false, addedAt: 1 }],
      state.priceProfiles,
      'CHF',
      {
        catalog: state.catalog,
        observations: state.priceObservations,
        stores: state.retailStores,
        storeId: 'archive-store',
      }
    )
    expect(estimate).toMatchObject({ total: 3.6, pricedItemCount: 1, referenceItemCount: 1 })
    expect(state.importPriceArchive(archive())).toMatchObject({
      ok: true,
      addedProducts: 0,
      addedObservations: 0,
      skippedObservations: 1,
    })
    expect(useStore.getState().priceObservations).toHaveLength(1)
    expect(
      parseBackup(
        JSON.stringify({
          version: STORAGE_VERSION,
          exportedAt: new Date().toISOString(),
          state: useStore.getState(),
        })
      ).state.priceObservations
    ).toHaveLength(1)
  })
  it('rejects a broken archive atomically instead of partially changing the app', () => {
    const input = archive()
    input.priceObservations[0]!.price.currency = 'EUR'
    const before = useStore.getState()
    expect(before.importPriceArchive(input).ok).toBe(false)
    expect(useStore.getState()).toBe(before)
  })
})
