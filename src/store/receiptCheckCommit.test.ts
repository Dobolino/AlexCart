import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'
import { useStore } from './useStore'
import {
  parseReceiptCheck,
  suggestReceiptRows,
  receiptTripSnapshot,
  receiptTripFingerprint,
  type ReceiptCheckEvidence,
} from '@/utils/receiptCheck'
import { pricesForCurrency } from '@/utils/priceProfiles'
import { currentWeekSpend } from '@/utils/budget'

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  })
  useStore.getState().resetAll()
  useStore.setState({
    lists: [
      {
        id: 'list',
        name: 'Migros',
        weekLabel: '',
        createdAt: 1,
        items: [
          {
            id: 'milk',
            name: 'Milch',
            amount: '2 Stück',
            category: 'Milch & Käse',
            productId: 'milk',
            done: false,
            addedAt: 1,
          },
          {
            id: 'bread',
            name: 'Brot',
            amount: '1 Stück',
            category: 'Brot & Backwaren',
            done: false,
            addedAt: 1,
          },
        ],
      },
    ],
    activeListId: 'list',
    pantry: [{ id: 'stock', name: 'Milch', category: 'Milch & Käse', amount: '0 Stück' }],
  })
  const actions = useStore.getState()
  actions.startShoppingSession('list')
  actions.setListShoppingStore('list', 'Migros', 'CH')
  actions.toggleItemDone('milk', { price: 4, unitPrice: 2, variantName: 'Standard' })
  actions.toggleItemDone('bread', { price: 2, variantName: 'Standard' })
  actions.finishShopping('list', { createNewList: false })
})
afterEach(() => vi.unstubAllGlobals())
function prepare(text = 'MIGROS\nMilch 2 x 2.50\nBrot 2.00\nTOTAL CHF 7.00') {
  const trip = useStore.getState().completedTrips[0]!
  const doc = parseReceiptCheck(text)
  const evidence: ReceiptCheckEvidence = {
    ...doc,
    rows: suggestReceiptRows(doc, trip),
    currency: 'CHF',
    source: 'photo',
  }
  evidence.rows[0]!.apply = true
  return { trip, evidence, snapshot: receiptTripSnapshot(trip) }
}
describe('confirmed receipt photo corrections', () => {
  it('does not modify a purchase reference that is shared ambiguously with another historical receipt', () => {
    const { trip, evidence, snapshot } = prepare()
    const before = useStore.getState()
    useStore.setState({ completedTrips: [...before.completedTrips, { ...trip, id: 'duplicate-receipt' }] })
    const result = useStore.getState().saveReceiptCheck(trip.id, snapshot, evidence, true)
    expect(result.ok).toBe(false)
    expect(useStore.getState().purchaseLog).toEqual(before.purchaseLog)
  })
  it('updates the receipt, linked purchase, profile, comparison price and budget together without another purchase or stock movement', () => {
    const { trip, evidence, snapshot } = prepare()
    const before = useStore.getState()
    const result = before.saveReceiptCheck(trip.id, snapshot, evidence, true)
    const state = useStore.getState()
    expect(result).toMatchObject({ ok: true, updated: 1, unlinked: 0 })
    expect(state.completedTrips).toHaveLength(1)
    expect(state.completedTrips[0]!.items[0]!.price).toBe(5)
    expect(state.purchaseLog).toHaveLength(2)
    expect(state.purchaseLog[0]).toMatchObject({
      price: 5,
      profilePrice: 2.5,
      amount: '2 Stück',
      currency: 'CHF',
    })
    expect(state.priceObservations[0]!.price).toEqual({ minor: 250, currency: 'CHF' })
    expect(pricesForCurrency(state.priceProfiles[0]!.variants[0]!, 'CHF')).toMatchObject({
      lastPrice: 2.5,
      purchaseCount: 1,
    })
    expect(currentWeekSpend(state.purchaseLog, new Date(), 'CHF')).toBe(7)
    expect(state.pantry).toEqual(before.pantry)
    expect(state.stats).toEqual(before.stats)
    expect(state.completedTrips[0]!.receiptReview).toMatchObject({
      status: 'matched',
      receiptTotalMinor: 700,
      checkedItems: 2,
      unresolved: 0,
    })
  })
  it('requires confirmation, a current snapshot and the original currency', () => {
    const { trip, evidence, snapshot } = prepare()
    const actions = useStore.getState()
    expect(actions.saveReceiptCheck(trip.id, snapshot, evidence, false).ok).toBe(false)
    expect(actions.saveReceiptCheck(trip.id, snapshot, { ...evidence, currency: 'EUR' }, true).ok).toBe(false)
    actions.updateCompletedTripDate(trip.id, '2026-10-01')
    const before = useStore.getState()
    expect(actions.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    expect(useStore.getState().purchaseLog).toEqual(before.purchaseLog)
  })
  it('rejects invalid or ambiguously mapped batch changes before modifying any price', () => {
    const { trip, evidence, snapshot } = prepare()
    evidence.rows[1]!.targetId = evidence.rows[0]!.targetId
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    evidence.rows[1]!.targetId = 'bread'
    evidence.rows[1]!.minor = NaN
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    expect(useStore.getState().completedTrips).toEqual(before.completedTrips)
    expect(useStore.getState().purchaseLog).toEqual(before.purchaseLog)
  })
  it('records a review without changing unselected mismatches and marks incomplete receipts as partial', () => {
    const { trip, evidence, snapshot } = prepare('Milch 2 x 2.50\nTOTAL CHF 5.00')
    evidence.rows[0]!.apply = false
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true)).toMatchObject({ ok: true, updated: 0 })
    expect(useStore.getState().purchaseLog).toEqual(before.purchaseLog)
    expect(useStore.getState().completedTrips[0]!.receiptReview!.status).toBe('partial')
  })
  it('corrects an unlinked legacy receipt only on that receipt and reports missing price-history linkage', () => {
    const old = useStore.getState().completedTrips[0]!
    useStore.setState({
      completedTrips: [{ ...old, items: [{ id: 'milk', name: 'Milch', amount: '2 Stück', price: 4 }] }],
    })
    const { trip, evidence, snapshot } = prepare('Milch 2 x 2.50\nTOTAL CHF 5.00')
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true)).toMatchObject({
      ok: true,
      updated: 1,
      unlinked: 1,
    })
    expect(useStore.getState().purchaseLog).toEqual(before.purchaseLog)
    expect(useStore.getState().completedTrips[0]!.items[0]!.price).toBe(5)
  })
  it('detects later edits to a reviewed receipt and retains manual correction consistency', () => {
    const { trip, evidence, snapshot } = prepare()
    useStore.getState().saveReceiptCheck(trip.id, snapshot, evidence, true)
    const reviewed = useStore.getState().completedTrips[0]!
    expect(reviewed.receiptReview!.fingerprint).toBe(receiptTripFingerprint(reviewed))
    useStore.getState().updateCompletedTripItemPrice(trip.id, 'milk', 6)
    const changed = useStore.getState().completedTrips[0]!
    expect(changed.receiptReview!.fingerprint).not.toBe(receiptTripFingerprint(changed))
    expect(useStore.getState().purchaseLog[0]).toMatchObject({ price: 6, profilePrice: 3 })
  })
})
