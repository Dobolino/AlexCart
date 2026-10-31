import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { useStore } from './useStore'
import { sessionPurchaseIds } from './shoppingLocation'
import { pricesForCurrency } from '@/utils/priceProfiles'
import { currentWeekSpend } from '@/utils/budget'
import { buildAiPriceExport } from '@/utils/aiPriceExport'
import type { CompletedTrip } from '@/types'

beforeEach(() => {
  const saved = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value),
    removeItem: (key: string) => saved.delete(key),
  })
  useStore.getState().resetAll()
  useStore.setState({
    lists: [
      {
        id: 'l',
        name: 'Migros',
        weekLabel: '',
        createdAt: 1,
        items: ['a', 'b'].map((id) => ({
          id,
          name: 'Milch',
          category: 'Milch & Käse',
          amount: '1 l',
          productId: 'milk',
          done: false,
          addedAt: 1,
        })),
      },
    ],
    activeListId: 'l',
  })
})
afterEach(() => vi.unstubAllGlobals())
function receipt(id = 'trip'): CompletedTrip {
  const state = useStore.getState()
  const entry = state.purchaseLog[0]!
  return {
    id,
    listId: 'l',
    listName: 'Migros',
    currency: entry.currency,
    store: state.shoppingSession?.store,
    storeId: entry.storeId,
    completedAt: Date.now(),
    items: [{ id: 'row', name: 'Milch', amount: '1 l', price: entry.price, purchaseLogId: entry.id }],
  }
}
function priceInGermany() {
  const actions = useStore.getState()
  actions.startShoppingSession('l')
  actions.setListShoppingStore('l', 'Edeka Freiburg', 'DE')
  actions.toggleItemDone('a', { price: 2.49, variantName: 'Standard' })
}
describe('shopping location corrections', () => {
  it('keeps the corrected location when editing a price despite a later array entry for the same item', () => {
    priceInGermany()
    const actions = useStore.getState()
    actions.setListShoppingStore('l', 'Migros Bahnhof', 'CH', true)
    const state = useStore.getState()
    const unrelated = {
      ...state.purchaseLog[0]!,
      id: 'older',
      storeId: 'DE:rewe',
      currency: 'EUR' as const,
      date: '2025-01-01',
    }
    useStore.setState({ purchaseLog: [...state.purchaseLog, unrelated] })
    actions.updatePurchaseLogPrice(state.lists[0]!.items[0]!, {
      price: 3,
      variantId: state.purchaseLog[0]!.variantId,
    })
    expect(useStore.getState().purchaseLog[0]).toMatchObject({
      price: 3,
      currency: 'CHF',
      storeId: 'CH:migros bahnhof',
    })
    expect(useStore.getState().purchaseLog[1]).toEqual(unrelated)
  })
  it('assigns a legacy session after checking off items and repairs a unique old purchase link', () => {
    const actions = useStore.getState()
    actions.startShoppingSession('l')
    actions.toggleItemDone('a')
    useStore.setState((state) => ({
      shoppingSession: { ...state.shoppingSession!, currency: 'EUR', store: undefined, storeId: undefined },
      lists: state.lists.map((list) => ({
        ...list,
        items: list.items.map((item) => ({ ...item, purchaseLogId: undefined })),
      })),
      purchaseLog: state.purchaseLog.map((entry) => ({ ...entry, currency: 'EUR' })),
    }))
    actions.setListShoppingStore('l', 'Migros Bahnhof', 'CH')
    const state = useStore.getState()
    expect(state.shoppingSession).toMatchObject({
      currency: 'CHF',
      storeId: 'CH:migros bahnhof',
      checkedItemIds: ['a'],
    })
    expect(state.purchaseLog[0]).toMatchObject({ storeId: 'CH:migros bahnhof', currency: 'CHF' })
    expect(state.lists[0]!.items[0]!.purchaseLogId).toBe(state.purchaseLog[0]!.id)
  })
  it('moves only linked session prices and observations while preserving their amounts and currency by default', () => {
    priceInGermany()
    const before = useStore.getState()
    const unrelated = { ...before.purchaseLog[0]!, id: 'other', itemId: 'other-item', storeId: 'DE:rewe' }
    useStore.setState({ purchaseLog: [...before.purchaseLog, unrelated] })
    useStore.getState().setListShoppingStore('l', 'Migros Zürich', 'CH')
    const state = useStore.getState()
    expect(state.shoppingSession).toMatchObject({
      store: 'Migros Zürich',
      currency: 'EUR',
      checkedItemIds: ['a'],
    })
    expect(state.purchaseLog[0]).toMatchObject({ price: 2.49, currency: 'EUR', storeId: 'CH:migros zürich' })
    expect(state.purchaseLog[1]).toEqual(unrelated)
    expect(state.priceObservations[0]).toMatchObject({
      storeId: 'CH:migros zürich',
      price: { minor: 249, currency: 'EUR' },
    })
    const exported = buildAiPriceExport({ ...state, settings: state.settings })
    expect(exported.records.find((record) => record.id === state.purchaseLog[0]!.id)).toMatchObject({
      country: 'CH',
      store: 'Migros Zürich',
      price: { minor: 249, currency: 'EUR' },
    })
  })
  it('corrects a wrongly recorded currency only explicitly and rebuilds budgets and both currency profiles', () => {
    priceInGermany()
    const variant = useStore.getState().priceProfiles[0]!.variants[0]!
    useStore.getState().setListShoppingStore('l', 'Migros', 'CH', true)
    const state = useStore.getState()
    expect(state.purchaseLog[0]).toMatchObject({ price: 2.49, profilePrice: 2.49, currency: 'CHF' })
    expect(state.priceObservations[0]!.price).toEqual({ minor: 249, currency: 'CHF' })
    expect(
      pricesForCurrency(
        state.priceProfiles[0]!.variants.find((v) => v.id === variant.id)!,
        'CHF'
      )
    ).toMatchObject({ lastPrice: 2.49, purchaseCount: 1 })
    expect(pricesForCurrency(state.priceProfiles[0]!.variants[0]!, 'EUR').purchaseCount).toBe(0)
    expect(currentWeekSpend(state.purchaseLog, new Date(), 'CHF')).toBe(2.49)
    expect(currentWeekSpend(state.purchaseLog, new Date(), 'EUR')).toBe(0)
  })
  it('corrects a completed receipt, its price history and observations without changing another receipt', () => {
    priceInGermany()
    const trip = receipt()
    const old = { ...trip, id: 'old', items: [{ ...trip.items[0]!, purchaseLogId: 'unrelated' }] }
    useStore.setState((state) => ({
      completedTrips: [trip, old],
      purchaseLog: [...state.purchaseLog, { ...state.purchaseLog[0]!, id: 'unrelated', storeId: 'DE:rewe' }],
      shoppingSession: null,
    }))
    const actions = useStore.getState()
    actions.updateCompletedTripLocation('trip', 'Migros', 'CH')
    expect(useStore.getState().completedTrips[0]).toMatchObject({
      store: 'Migros',
      country: 'CH',
      currency: 'EUR',
    })
    actions.updateCompletedTripLocation('trip', 'Migros', 'CH', true)
    const state = useStore.getState()
    expect(state.completedTrips[0]).toMatchObject({ storeId: 'CH:migros', currency: 'CHF' })
    expect(state.purchaseLog[0]).toMatchObject({ storeId: 'CH:migros', currency: 'CHF' })
    expect(state.priceObservations[0]).toMatchObject({ storeId: 'CH:migros', price: { currency: 'CHF' } })
    expect(state.completedTrips[1]).toEqual(old)
    expect(state.purchaseLog[1]).toMatchObject({ storeId: 'DE:rewe', currency: 'EUR' })
  })
  it('remembers a choice for a named list and keeps its budget when the currency is selected again', () => {
    const actions = useStore.getState()
    actions.setWeeklyBudget(100)
    actions.setListShoppingStore('l', 'Migros Bahnhof', 'CH')
    actions.setCurrency('CHF')
    expect(useStore.getState().settings.weeklyBudget).toBe(100)
    actions.setListShoppingStore('l', 'Edeka Freiburg', 'DE')
    actions.setRetailSelection({ country: 'CH', retailerId: 'migros' })
    actions.startShoppingSession('l')
    expect(useStore.getState().shoppingSession).toMatchObject({ store: 'Edeka Freiburg', currency: 'EUR' })
    actions.clearShoppingSession()
    actions.startShoppingSession('l')
    expect(useStore.getState().shoppingSession!.store).toBe('Edeka Freiburg')
    actions.setListShoppingStore('l', 'Migros Bahnhof', 'CH')
    expect(useStore.getState().settings.weeklyBudget).toBe(100)
  })
  it('does not guess ambiguous legacy logs or steal purchases already linked to a completed trip', () => {
    priceInGermany()
    const state = useStore.getState()
    const log = state.purchaseLog[0]!
    const list = {
      ...state.lists[0]!,
      items: state.lists[0]!.items.map((item) => ({ ...item, purchaseLogId: undefined })),
    }
    expect(sessionPurchaseIds(state.shoppingSession, list, [log, { ...log, id: 'duplicate' }], []).size).toBe(
      0
    )
    expect(sessionPurchaseIds(state.shoppingSession, list, [log], [receipt()]).size).toBe(0)
  })
})
