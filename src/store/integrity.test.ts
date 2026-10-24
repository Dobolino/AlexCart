import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest'
import { useStore } from './useStore'
import { importFromJSON } from '@/utils/import'
import { restoreBackupJSON } from '@/utils/backup'
import { pricesForCurrency } from '@/utils/priceProfiles'
import { currentWeekSpend } from '@/utils/budget'
import { promoSavingsInYear } from '@/utils/storeStats'
import type { ShoppingItem } from '@/types'

const item = (id: string, name = 'Milch'): ShoppingItem => ({
  id,
  name,
  category: 'Milch & Käse',
  amount: '1 l',
  done: false,
  addedAt: 1,
})
beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  })
  useStore.getState().resetAll()
  useStore.setState({
    lists: [{ id: 'l', name: 'Test', createdAt: 1, weekLabel: '', items: [item('a'), item('b')] }],
    activeListId: 'l',
    pantry: [{ id: 'p', name: 'Milch', category: 'Milch & Käse', amount: '0 l' }],
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('persisted settings compatibility', () => {
  it.each([{ customStores: undefined }, { customStores: ['Dorfladen'] }])(
    'restores custom stores and normalizes legacy lists and shopping sessions (%j)',
    ({ customStores }) => {
      const merge = useStore.persist.getOptions().merge!
      const restored = merge(
        {
          lists: [{ id: 'legacy', items: [] }],
          settings: { customStores },
          shoppingSession: { listId: 'legacy', startedAt: 1, totalPausedMs: 0 },
        },
        useStore.getState()
      )
      expect(restored.settings.customStores).toEqual(customStores ?? [])
      expect(restored.lists[0]).toMatchObject({ name: 'Einkaufsliste', weekLabel: '' })
      expect(restored.shoppingSession).toMatchObject({ currency: 'CHF', checkedItemIds: [] })
      expect(restored.addCustomStore).toBeTypeOf('function')
    }
  )
})

describe('purchase integrity', () => {
  it('reverses only the purchased inventory, preserving consumption between check and undo', () => {
    const s = useStore.getState()
    s.toggleItemDone('a')
    expect(useStore.getState().pantry[0]?.amount).toBe('1 l')
    s.toggleItemDone('a')
    expect(useStore.getState().pantry[0]?.amount).toBe('0 l')
    s.toggleItemDone('a')
    expect(useStore.getState().pantry[0]?.amount).toBe('1 l')
    s.updatePantryItem('p', { amount: '0.5 l' })
    s.toggleItemDone('a')
    expect(useStore.getState().pantry[0]?.amount).toBe('0 l')
  })
  it('rebuilds price aggregates after undoing a different second purchase', () => {
    useStore.getState().toggleItemDone('a', { price: 1, variantName: 'Standard' })
    const variantId = useStore.getState().priceProfiles[0]!.variants[0]!.id
    useStore.getState().toggleItemDone('b', { price: 3, variantId })
    useStore.getState().toggleItemDone('b')
    expect(pricesForCurrency(useStore.getState().priceProfiles[0]!.variants[0]!, 'CHF')).toMatchObject({
      lastPrice: 1,
      avgPrice: 1,
      purchaseCount: 1,
    })
  })
  it('corrects a receipt and the linked budget and unit price without another purchase', () => {
    useStore.getState().toggleItemDone('a', { price: 4, unitPrice: 2, variantName: 'Standard' })
    const log = useStore.getState().purchaseLog[0]!
    useStore.setState({
      completedTrips: [
        {
          id: 't',
          listId: 'l',
          listName: 'Test',
          completedAt: Date.now(),
          currency: 'CHF',
          items: [{ id: 'r', name: 'Milch', amount: '2 l', price: 4, purchaseLogId: log.id }],
        },
      ],
    })
    useStore.getState().updateCompletedTripItemPrice('t', 'r', 6)
    const state = useStore.getState()
    expect(state.purchaseLog).toHaveLength(1)
    expect(state.purchaseLog[0]).toMatchObject({ price: 6, profilePrice: 3 })
    expect(state.completedTrips[0]?.items[0]?.price).toBe(6)
    expect(currentWeekSpend(state.purchaseLog, new Date(), 'CHF')).toBe(6)
    expect(pricesForCurrency(state.priceProfiles[0]!.variants[0]!, 'CHF')).toMatchObject({
      lastPrice: 3,
      purchaseCount: 1,
    })
  })
  it('updates linked price history when correcting a receipt date and ignores invalid dates', () => {
    useStore.setState((state) => ({
      lists: [{ ...state.lists[0]!, items: [{ ...item('a'), productId: 'milk-product' }] }],
    }))
    const actions = useStore.getState()
    actions.startShoppingSession('l')
    actions.setShoppingStore('Coop Bahnhof', 'CH')
    actions.toggleItemDone('a', { price: 2, variantName: 'Standard' })
    const log = useStore.getState().purchaseLog[0]!
    useStore.setState({
      completedTrips: [
        {
          id: 't',
          listId: 'l',
          listName: 'Test',
          completedAt: Date.now(),
          currency: 'CHF',
          items: [{ id: 'r', name: 'Milch', amount: '1 l', price: 2, purchaseLogId: log.id }],
        },
      ],
    })
    actions.updateCompletedTripDate('t', '2026-10-01')
    const state = useStore.getState()
    expect(state.purchaseLog[0]?.date).toBe('2026-10-01')
    expect(pricesForCurrency(state.priceProfiles[0]!.variants[0]!, 'CHF').lastPurchaseDate).toBe('2026-10-01')
    expect(state.priceObservations[0]?.observedAt).toBe(new Date(2026, 9, 1, 12).toISOString())
    actions.updateCompletedTripDate('t', '2026-02-31')
    expect(useStore.getState().purchaseLog[0]?.date).toBe('2026-10-01')
  })
  it('keeps calculator and budgets in their original currency', () => {
    const s = useStore.getState()
    s.setWeeklyBudget(100)
    s.addCalculatorEntry(10)
    s.setCurrency('EUR')
    expect(useStore.getState().settings.weeklyBudget).toBe(0)
    expect(useStore.getState().calculatorEntries[0]).toMatchObject({ amount: 10, currency: 'CHF' })
    s.setWeeklyBudget(80)
    s.setCurrency('CHF')
    expect(useStore.getState().settings.weeklyBudget).toBe(100)
    s.setCurrency('EUR')
    expect(useStore.getState().settings.weeklyBudget).toBe(80)
  })
  it('sorts open items while preserving done items and rejects duplicate IDs', () => {
    useStore.setState((state) => ({
      lists: [{ ...state.lists[0]!, items: [item('a'), item('b'), { ...item('c'), done: true }] }],
    }))
    useStore.getState().reorderItemsInCategory('Milch & Käse', ['b', 'a'])
    expect(useStore.getState().lists[0]?.items.map((i) => i.id)).toEqual(['b', 'a', 'c'])
    useStore.getState().reorderItemsInCategory('Milch & Käse', ['a', 'a'])
    expect(useStore.getState().lists[0]?.items.map((i) => i.id)).toEqual(['b', 'a', 'c'])
  })
  it('uses captured unit references and filters promo savings by currency', () => {
    const entry = {
      name: 'Milch',
      category: 'Milch & Käse',
      date: '2026-10-24',
      price: 3,
      profilePrice: 1.5,
      referenceUnitPrice: 2,
      currency: 'CHF' as const,
      wasSale: true,
    }
    // Reference identity still needs an existing price profile.
    useStore.getState().toggleItemDone('a', { price: 2, variantName: 'Standard' })
    const variantId = useStore.getState().priceProfiles[0]!.variants[0]!.id
    expect(
      promoSavingsInYear(
        [
          { ...entry, variantId },
          { ...entry, currency: 'EUR', variantId },
        ],
        useStore.getState().priceProfiles,
        2026,
        'CHF'
      )
    ).toBe(1)
  })
})

describe('untrusted imports', () => {
  it('rejects invalid entries without overwriting a working backup', () => {
    const original = localStorage.getItem('alexshop-store')
    expect(
      restoreBackupJSON(JSON.stringify({ version: 20, state: { lists: [{ id: 'bad', items: [null] }] } })).ok
    ).toBe(false)
    expect(localStorage.getItem('alexshop-store')).toBe(original)
    expect(importFromJSON('{"items":[null]}', []).ok).toBe(false)
  })
  it('does not mistake empty rice stock for rice cakes and subtracts compatible stock', () => {
    const payload = JSON.stringify({
      items: [
        { name: 'Reiswaffeln', amount: '1 Stk' },
        { name: 'Reis', amount: '1 kg' },
      ],
    })
    const empty = importFromJSON(payload, [{ id: 'p', name: 'Reis', category: 'Sonstiges', amount: '0 g' }])
    expect(empty.kept).toHaveLength(2)
    const stocked = importFromJSON(payload, [
      { id: 'p', name: 'Reis', category: 'Sonstiges', amount: '500 g' },
    ])
    expect(stocked.kept?.find((i) => i.name === 'Reis')?.amount).toBe('0,5 kg')
  })
  it('blocks repeated receipt import while allowing an explicitly distinct identical purchase', () => {
    const input = {
      store: 'Coop',
      target: 'new' as const,
      purchaseDate: '2026-10-24',
      items: [{ name: 'Brot', category: 'Brot & Backwaren', amount: '1 Stk', price: 3 }],
    }
    expect(useStore.getState().applyReceiptImport(input).ok).toBe(true)
    expect(useStore.getState().applyReceiptImport(input).ok).toBe(false)
    expect(useStore.getState().completedTrips).toHaveLength(1)
    expect(useStore.getState().applyReceiptImport({ ...input, allowDuplicate: true }).ok).toBe(true)
    expect(useStore.getState().completedTrips).toHaveLength(2)
  })
})

describe('session boundaries and catalog observations', () => {
  it('undoes the linked purchase across midnight and keeps its inventory exact', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-10-23T23:55:00'))
      useStore.getState().toggleItemDone('a', { price: 2, variantName: 'Standard' })
      vi.setSystemTime(new Date('2026-10-24T00:05:00'))
      useStore.getState().toggleItemDone('a')
      expect(useStore.getState().purchaseLog).toHaveLength(0)
      expect(useStore.getState().pantry[0]?.amount).toBe('0 l')
    } finally {
      vi.useRealTimers()
    }
  })
  it('does not erase manually collected observations when checking a new item', () => {
    const state = useStore.getState()
    state.addPriceObservation({
      id: 'manual',
      productId: 'product',
      storeId: 'Coop',
      price: { minor: 200, currency: 'CHF' },
      basis: 'package',
      observedAt: new Date().toISOString(),
      source: 'manual',
    })
    state.toggleItemDone('a')
    expect(useStore.getState().priceObservations.map((p) => p.id)).toEqual(['manual'])
    state.toggleItemDone('a')
    expect(useStore.getState().priceObservations.map((p) => p.id)).toEqual(['manual'])
  })
  it('captures prices for identified catalog products in the selected branch', () => {
    const state = useStore.getState()
    useStore.setState((s) => ({
      lists: [{ ...s.lists[0]!, items: [{ ...item('a'), productId: 'milk-product' }] }],
    }))
    state.startShoppingSession('l')
    state.setShoppingStore('Coop Bahnhof', 'CH')
    state.toggleItemDone('a', { price: 2, variantName: 'Standard' })
    expect(useStore.getState().priceObservations[0]).toMatchObject({
      productId: 'milk-product',
      storeId: 'CH:coop bahnhof',
      price: { minor: 200, currency: 'CHF' },
    })
    state.toggleItemDone('a')
    expect(useStore.getState().priceObservations).toHaveLength(0)
  })
})
