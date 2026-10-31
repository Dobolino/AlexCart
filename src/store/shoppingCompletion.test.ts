import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { useStore } from './useStore'
import { currentWeekSpend } from '@/utils/budget'

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
        items: ['a', 'b', 'c'].map((id) => ({
          id,
          name: 'Milch',
          category: 'Milch & Käse',
          amount: '1 l',
          done: false,
          addedAt: 1,
          productId: 'milk',
        })),
      },
    ],
    activeListId: 'l',
    pantry: [{ id: 'stock', name: 'Milch', category: 'Milch & Käse', amount: '0 l' }],
  })
})
afterEach(() => vi.unstubAllGlobals())
function shop() {
  const actions = useStore.getState()
  actions.startShoppingSession('l')
  actions.setListShoppingStore('l', 'Migros Bahnhof', 'CH')
  actions.toggleItemDone('a', { price: 2, variantName: 'Standard' })
  actions.toggleItemDone('b')
}
describe('confirming the end of a shopping session', () => {
  it('archives only this session once and starts a genuinely empty new list without changing purchases or inventory', () => {
    shop()
    const before = useStore.getState()
    useStore.setState({
      lists: [
        {
          ...before.lists[0]!,
          items: [
            ...before.lists[0]!.items,
            {
              id: 'old',
              name: 'Alter Einkauf',
              category: 'Sonstiges',
              amount: '1 Stück',
              done: true,
              addedAt: 1,
            },
          ],
        },
      ],
    })
    const result = useStore.getState().finishShopping('l', { createNewList: true, name: 'Nächster Einkauf' })
    const state = useStore.getState()
    expect(result.ok).toBe(true)
    expect(state.shoppingSession).toBeNull()
    expect(state.activeListId).toBe(result.nextListId)
    expect(state.activeList()).toMatchObject({ name: 'Nächster Einkauf', items: [] })
    expect(state.completedTrips).toHaveLength(1)
    expect(state.completedTrips[0]).toMatchObject({
      store: 'Migros Bahnhof',
      storeId: 'CH:migros bahnhof',
      currency: 'CHF',
    })
    expect(state.completedTrips[0]!.items.map((item) => item.id)).toEqual(['a', 'b'])
    expect(state.lists.find((list) => list.id === 'l')!.items.map((item) => item.id)).toEqual(['c'])
    expect(state.settings.listStoreIds?.[state.activeListId]).toBe('CH:migros bahnhof')
    expect(state.purchaseLog).toEqual(before.purchaseLog)
    expect(state.priceObservations).toEqual(before.priceObservations)
    expect(state.pantry).toEqual(before.pantry)
    expect(state.stats.listsCreated).toBe(before.stats.listsCreated + 1)
    expect(useStore.getState().finishShopping('l', { createNewList: true }).ok).toBe(false)
    expect(useStore.getState().completedTrips).toHaveLength(1)
    expect(useStore.getState().lists).toHaveLength(2)
  })
  it('carries unbought articles only when selected, with fresh identities and no old checkoff links', () => {
    shop()
    const actions = useStore.getState()
    const old = actions.lists[0]!.items.find((item) => item.id === 'c')!
    actions.finishShopping('l', { createNewList: true, carryOpen: true })
    const state = useStore.getState()
    expect(state.activeList()!.items).toHaveLength(1)
    expect(state.activeList()!.items[0]).toMatchObject({
      name: old.name,
      amount: old.amount,
      productId: old.productId,
      done: false,
    })
    expect(state.activeList()!.items[0]!.id).not.toBe(old.id)
    expect(state.activeList()!.items[0]!.purchaseLogId).toBeUndefined()
    expect(state.lists.find((list) => list.id === 'l')!.items).toEqual([])
  })
  it('supports finishing without a new list and clears only this shopping currency from the calculator', () => {
    shop()
    const actions = useStore.getState()
    actions.setWeeklyBudget(100)
    actions.addCalculatorEntry(4)
    actions.setCurrency('EUR')
    actions.addCalculatorEntry(9)
    const before = useStore.getState()
    actions.finishShopping('l', { createNewList: false })
    const state = useStore.getState()
    expect(state.lists).toHaveLength(1)
    expect(state.activeListId).toBe('l')
    expect(state.activeList()!.items.map((item) => item.id)).toEqual(['c'])
    expect(state.calculatorEntries).toMatchObject([{ amount: 9, currency: 'EUR' }])
    expect(state.calculatorExcludedPurchaseIds).toContain(before.purchaseLog[0]!.id)
    expect(currentWeekSpend(state.purchaseLog, new Date(), 'CHF')).toBe(2)
    expect(state.shoppingSession).toBeNull()
    expect(state.purchaseLog).toEqual(before.purchaseLog)
  })
  it('does not complete a different or replaced session from a stale confirmation dialog', () => {
    shop()
    const before = useStore.getState()
    expect(
      before.finishShopping('l', {
        createNewList: true,
        expectedStartedAt: before.shoppingSession!.startedAt - 1,
      }).ok
    ).toBe(false)
    expect(useStore.getState().shoppingSession).toEqual(before.shoppingSession)
    expect(useStore.getState().completedTrips).toEqual([])
    expect(before.finishShopping('other', { createNewList: true }).ok).toBe(false)
  })
  it('ends a visit with no purchases without fabricating an empty receipt or losing open articles', () => {
    const actions = useStore.getState()
    actions.startShoppingSession('l')
    actions.finishShopping('l', { createNewList: true })
    const state = useStore.getState()
    expect(state.completedTrips).toEqual([])
    expect(state.purchaseLog).toEqual([])
    expect(state.lists.find((list) => list.id === 'l')!.items).toHaveLength(3)
    expect(state.activeList()!.items).toEqual([])
    expect(state.shoppingSession).toBeNull()
  })
})
