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
import { parseBackup, STORAGE_VERSION } from '@/utils/validation'

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
  it('clears the brand of an unpriced purchase without leaving an old brand variant or inventing a price', () => {
    const initial = prepare('Milch 2 x 2.00\nBrot 2.00\nTOTAL CHF 6.00')
    Object.assign(initial.evidence.rows[0]!, { apply: false, applyBrand: true, brandName: 'Testmarke' })
    expect(
      useStore.getState().saveReceiptCheck(initial.trip.id, initial.snapshot, initial.evidence, true).ok
    ).toBe(true)
    useStore.getState().updateCompletedTripItemPrice(initial.trip.id, 'milk', undefined)
    const { trip, evidence, snapshot } = prepare('Milch 2 x 2.00\nBrot 2.00\nTOTAL CHF 6.00')
    Object.assign(evidence.rows[0]!, { apply: false, applyBrand: true, brandName: '' })
    expect(useStore.getState().saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(true)
    const state = useStore.getState()
    expect(state.purchaseLog[0]!.price).toBeUndefined()
    expect(state.purchaseLog[0]!.variantId).toBeUndefined()
    expect(state.completedTrips[0]!.items[0]!.brandName).toBeUndefined()
    expect(state.purchaseLog).toHaveLength(2)
    expect(
      state.priceObservations.filter((row) => row.purchaseLogId === state.purchaseLog[0]!.id)
    ).toHaveLength(0)
  })
  it('requires a known conflicting brand to be confirmed before changing its purchase price', () => {
    const state = useStore.getState(),
      entry = state.purchaseLog[0]!
    const brandId = 'old-brand'
    useStore.setState({
      brands: [{ id: brandId, name: 'Alte Marke', createdAt: 1 }],
      priceProfiles: state.priceProfiles.map((profile) => ({
        ...profile,
        variants: profile.variants.map((variant) =>
          variant.id === entry.variantId ? { ...variant, brandId } : variant
        ),
      })),
    })
    const { trip, evidence, snapshot } = prepare()
    evidence.rows[0]!.brandName = 'Neue Marke'
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    expect(useStore.getState().purchaseLog).toEqual(before.purchaseLog)
    evidence.rows[0]!.applyBrand = true
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(true)
    expect(useStore.getState().completedTrips[0]!.items[0]!.brandName).toBe('Neue Marke')
  })
  it('moves only the confirmed purchase to a brand without retagging older purchases sharing its original variant', () => {
    const initial = useStore.getState(),
      oldMilk = initial.purchaseLog[0]!
    useStore.setState({
      purchaseLog: [
        ...initial.purchaseLog,
        { ...oldMilk, id: 'older-milk', itemId: 'older-item', date: '2026-01-01' },
      ],
      priceObservations: [
        ...initial.priceObservations,
        { ...initial.priceObservations[0]!, id: 'older-observation', purchaseLogId: 'older-milk' },
      ],
    })
    const { trip, evidence, snapshot } = prepare('Kurzmilch 2 x 2.00\nBrot 2.00\nTOTAL CHF 6.00')
    Object.assign(evidence.rows[0]!, {
      targetId: 'milk',
      apply: false,
      applyBrand: true,
      brandName: 'Testmarke',
      remember: true,
    })
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, false).ok).toBe(false)
    expect(useStore.getState().brands).toEqual(before.brands)
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true)).toMatchObject({
      ok: true,
      brandUpdated: 1,
    })
    const state = useStore.getState(),
      brand = state.brands.find((brand) => brand.name === 'Testmarke')!
    const current = state.purchaseLog[0]!,
      older = state.purchaseLog.find((entry) => entry.id === 'older-milk')!
    expect(older.variantId).toBe(oldMilk.variantId)
    expect(current.variantId).not.toBe(oldMilk.variantId)
    const variants = state.priceProfiles[0]!.variants
    expect(variants.find((variant) => variant.id === oldMilk.variantId)?.brandId).toBeUndefined()
    expect(variants.find((variant) => variant.id === current.variantId)?.brandId).toBe(brand.id)
    expect(variants.find((variant) => variant.id === current.variantId)?.purchaseCount).toBe(1)
    expect(state.catalog.find((product) => product.id === current.productId)?.brand).toBe('Testmarke')
    expect(state.completedTrips[0]!.items[0]!.brandName).toBe('Testmarke')
    expect(state.priceObservations.find((row) => row.purchaseLogId === current.id)?.productId).toBe(
      current.productId
    )
    expect(state.priceObservations.find((row) => row.id === 'older-observation')?.productId).toBe(
      oldMilk.productId
    )
    expect(state.receiptAliases[0]).toMatchObject({
      retailer: 'CHF:migros',
      label: 'Kurzmilch',
      name: 'Milch',
      brandName: 'Testmarke',
    })
    const nextRows = suggestReceiptRows(
      parseReceiptCheck('Kurzmilch 2 x 2.00'),
      state.completedTrips[0]!,
      state.receiptAliases
    )
    expect(nextRows[0]!.targetId).toBe('milk')
    expect(state.pantry).toEqual(before.pantry)
    const backup = parseBackup(JSON.stringify({ state, version: STORAGE_VERSION }))
    expect(backup.state.receiptAliases).toHaveLength(1)
    expect(backup.state.completedTrips?.[0]?.items?.[0]?.brandName).toBe('Testmarke')
    evidence.rows[0]!.applyBrand = false
    evidence.rows[0]!.remember = false
    expect(
      state.saveReceiptCheck(trip.id, receiptTripSnapshot(state.completedTrips[0]!), evidence, true).ok
    ).toBe(true)
    expect(useStore.getState().receiptAliases).toHaveLength(0)
  })
  it('adds a branded product and observation only once after confirmation', () => {
    const { trip, evidence, snapshot } = prepare(
      'Milch 2 x 2.00\nBrot 2.00\nMClass Testkeks 1.20\nTOTAL CHF 7.20'
    )
    evidence.rows[0]!.apply = false
    Object.assign(evidence.rows[2]!, {
      add: true,
      newName: 'Testkeks',
      amount: '1 Packung',
      category: 'Süßes & Snacks',
      brandName: 'M Classic',
      remember: true,
    })
    expect(useStore.getState().saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(true)
    const state = useStore.getState(),
      added = state.purchaseLog[2]!
    expect(state.catalog.find((product) => product.id === added.productId)?.brand).toBe('M Classic')
    expect(state.priceProfiles.find((profile) => profile.itemName === 'Testkeks')?.variants[0]?.brandId).toBe(
      state.brands.find((brand) => brand.name === 'M Classic')?.id
    )
    expect(state.completedTrips[0]!.items[2]!.brandName).toBe('M Classic')
    expect(state.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    expect(useStore.getState().purchaseLog).toHaveLength(3)
  })
  it('removes an explicitly excluded app-only purchase and its observations without changing stock', () => {
    const { trip, evidence, snapshot } = prepare('Milch 2 x 2.00\nTOTAL CHF 4.00')
    evidence.rows[0]!.apply = false
    evidence.removeItemIds = ['bread']
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true)).toMatchObject({ ok: true, removed: 1 })
    const state = useStore.getState()
    expect(state.completedTrips[0]!.items.map((item) => item.id)).toEqual(['milk'])
    expect(state.purchaseLog).toHaveLength(1)
    expect(state.purchaseLog[0]!.name).toBe('Milch')
    expect(currentWeekSpend(state.purchaseLog, new Date(), 'CHF')).toBe(4)
    expect(state.pantry).toEqual(before.pantry)
    expect(state.completedTrips[0]!.receiptReview!.status).toBe('matched')
  })
  it('rejects conflicting removals and oversized brands before changing purchases or learning aliases', () => {
    const { trip, evidence, snapshot } = prepare('Milch 2 x 2.00\nBrot 2.00\nTOTAL CHF 6.00')
    evidence.rows[0]!.apply = false
    evidence.removeItemIds = ['milk']
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    evidence.removeItemIds = []
    evidence.rows[0]!.applyBrand = true
    evidence.rows[0]!.brandName = 'x'.repeat(301)
    evidence.rows[0]!.remember = true
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    expect(useStore.getState().purchaseLog).toEqual(before.purchaseLog)
    expect(useStore.getState().brands).toEqual(before.brands)
    expect(useStore.getState().receiptAliases).toEqual(before.receiptAliases)
  })
  it('also keeps ordinary receipt-row deletion consistent with purchase history', () => {
    const state = useStore.getState(),
      trip = state.completedTrips[0]!
    state.removeCompletedTripItem(trip.id, 'milk')
    expect(useStore.getState().purchaseLog).toHaveLength(1)
    expect(useStore.getState().priceObservations).toHaveLength(0)
    expect(useStore.getState().completedTrips[0]!.items.map((item) => item.id)).toEqual(['bread'])
    expect(useStore.getState().pantry).toEqual(state.pantry)
  })
  it('stores the PDF review source in a valid versioned backup alongside linked corrections', () => {
    const { trip, evidence, snapshot } = prepare()
    evidence.source = 'pdf'
    expect(useStore.getState().saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(true)
    const backup = parseBackup(JSON.stringify({ state: useStore.getState(), version: STORAGE_VERSION }))
    expect(backup.state.completedTrips?.[0]?.receiptReview?.source).toBe('pdf')
    expect(backup.state.completedTrips?.[0]?.items?.[0]?.price).toBe(5)
  })
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
  it('changes a confirmed count at the same total price without another purchase or stock movement', () => {
    const { trip, evidence, snapshot } = prepare('3 x Milch 4.00\nBrot 2.00\nTOTAL CHF 6.00')
    evidence.rows[0]!.apply = false
    evidence.rows[0]!.applyAmount = true
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true)).toMatchObject({
      ok: true,
      updated: 0,
      amountUpdated: 1,
    })
    const state = useStore.getState()
    expect(state.completedTrips[0]!.items[0]).toMatchObject({ amount: '3 Stück', price: 4 })
    expect(state.purchaseLog[0]).toMatchObject({ amount: '3 Stück', price: 4, profilePrice: 1.33333333 })
    expect(state.priceObservations[0]!.price).toEqual({ minor: 133, currency: 'CHF' })
    expect(pricesForCurrency(state.priceProfiles[0]!.variants[0]!, 'CHF').purchaseCount).toBe(1)
    expect(state.lists).toEqual(before.lists)
    expect(state.purchaseLog).toHaveLength(2)
    expect(state.pantry).toEqual(before.pantry)
    expect(state.completedTrips[0]!.receiptReview!.status).toBe('matched')
  })
  it('recomputes the exact kilogram price when the confirmed weight changes but the price is correct', () => {
    const state = useStore.getState(),
      old = state.completedTrips[0]!
    useStore.setState({
      completedTrips: [
        {
          ...old,
          items: old.items.map((item, index) => (index ? item : { ...item, amount: '536 g', price: 2.3 })),
        },
      ],
      purchaseLog: state.purchaseLog.map((entry, index) =>
        index
          ? entry
          : { ...entry, amount: '536 g', price: 2.3, pricePerKg: 4.29104478, profilePrice: 4.29104478 }
      ),
    })
    const { trip, evidence, snapshot } = prepare('Milch 532 g 2.30\nBrot 2.00\nTOTAL CHF 4.30')
    evidence.rows[0]!.apply = false
    evidence.rows[0]!.applyAmount = true
    expect(useStore.getState().saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(true)
    expect(useStore.getState().purchaseLog[0]).toMatchObject({
      amount: '532 g',
      price: 2.3,
      pricePerKg: 4.32330827,
      profilePrice: 4.32330827,
    })
    expect(useStore.getState().priceObservations[0]).toMatchObject({
      basis: 'kg',
      price: { minor: 432, currency: 'CHF' },
    })
    expect(useStore.getState().completedTrips[0]!.receiptReview!.status).toBe('matched')
  })
  it('adds a renamed receipt item with linked prices and recognizes it again without duplicates', () => {
    const { trip, evidence, snapshot } = prepare('Milch 2 x 2.00\nBrot 2.00\nEnergy 2 x 1.20\nTOTAL CHF 8.40')
    evidence.rows[0]!.apply = false
    const extra = evidence.rows[2]!
    Object.assign(extra, { add: true, newName: 'Test Energy', category: 'Getränke' })
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true)).toMatchObject({ ok: true, added: 1 })
    const state = useStore.getState(),
      added = state.completedTrips[0]!.items[2]!,
      log = state.purchaseLog[2]!
    expect(added).toMatchObject({ name: 'Test Energy', amount: '2 Stück', price: 2.4, purchaseLogId: log.id })
    expect(log).toMatchObject({
      price: 2.4,
      profilePrice: 1.2,
      currency: 'CHF',
      storeId: 'CH:migros',
      date: state.purchaseLog[0]!.date,
    })
    expect(state.catalog.find((product) => product.id === log.productId)?.name).toBe('Test Energy')
    expect(state.priceObservations.find((row) => row.purchaseLogId === log.id)?.price).toEqual({
      minor: 120,
      currency: 'CHF',
    })
    expect(state.pantry).toEqual(before.pantry)
    expect(state.lists).toEqual(before.lists)
    expect(state.completedTrips[0]!.receiptReview).toMatchObject({
      status: 'matched',
      checkedItems: 3,
      unresolved: 0,
    })
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    const reread = suggestReceiptRows(
      parseReceiptCheck('Energy 2 x 1.20\nTOTAL CHF 2.40'),
      state.completedTrips[0]!
    )
    expect(reread[0]!.targetId).toBe(added.id)
    expect(
      state.saveReceiptCheck(trip.id, receiptTripSnapshot(state.completedTrips[0]!), evidence, true).ok
    ).toBe(false)
    expect(useStore.getState().purchaseLog).toHaveLength(3)
    const backup = parseBackup(JSON.stringify({ state: useStore.getState(), version: STORAGE_VERSION }))
    expect(backup.state.completedTrips?.[0]?.items?.[2]?.receiptKey).toBe(added.receiptKey)
  })
  it('uses an explicitly selected catalog product and keeps an item-bound discount and kilogram basis', () => {
    const state = useStore.getState()
    useStore.setState({
      catalog: [
        {
          id: 'fruit',
          name: 'Testfrucht',
          category: 'Früchte & Gemüse',
          source: 'manual',
          gtins: [],
          updatedAt: new Date().toISOString(),
        },
      ],
    })
    const { trip, evidence, snapshot } = prepare(
      'Artikelbezeichnung Menge Preis Gespart Total #\nTestfrucht 0.500 4.00 0.50 1.50 1\nTOTAL CHF 1.50'
    )
    Object.assign(evidence.rows[0]!, {
      apply: false,
      add: true,
      newName: 'Testfrucht',
      category: 'Früchte & Gemüse',
      productId: 'fruit',
      addAsWeight: true,
    })
    expect(state.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(true)
    expect(useStore.getState().catalog).toHaveLength(1)
    expect(useStore.getState().purchaseLog[2]).toMatchObject({
      productId: 'fruit',
      amount: '500 g',
      price: 1.5,
      pricePerKg: 3,
      wasSale: true,
    })
    expect(useStore.getState().priceObservations.slice(-1)[0]).toMatchObject({
      productId: 'fruit',
      basis: 'kg',
      discounted: true,
      price: { minor: 300, currency: 'CHF' },
    })
  })
  it('corrects the date on every linked purchase and observation only after selecting the date change', () => {
    const { trip, evidence, snapshot } = prepare('Milch 2 x 2.00\nBrot 2.00\nTOTAL CHF 6.00')
    evidence.rows[0]!.apply = false
    evidence.date = '2026-09-15'
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(true)
    expect(useStore.getState().completedTrips[0]!.completedAt).toBe(trip.completedAt)
    expect(useStore.getState().purchaseLog).toEqual(before.purchaseLog)
    evidence.applyDate = true
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true)).toMatchObject({
      ok: true,
      dateUpdated: true,
      updated: 0,
    })
    const state = useStore.getState()
    expect(state.purchaseLog.every((entry) => entry.date === '2026-09-15')).toBe(true)
    expect(state.priceObservations.every((entry) => entry.observedAt.startsWith('2026-09-15'))).toBe(true)
    expect(pricesForCurrency(state.priceProfiles[0]!.variants[0]!, 'CHF').lastPurchaseDate).toBe('2026-09-15')
    expect(state.completedTrips[0]!.receiptReview!.status).toBe('matched')
    expect(state.purchaseLog.map((entry) => entry.price)).toEqual(
      before.purchaseLog.map((entry) => entry.price)
    )
    expect(state.pantry).toEqual(before.pantry)
  })
  it('rejects an invalid date, wrong dimensions, unknown product and mixed invalid batches atomically', () => {
    const { trip, evidence, snapshot } = prepare('3 x Milch 4.00\nBrot 2.00\nNeu 1.20\nTOTAL CHF 7.20')
    evidence.rows[0]!.apply = false
    evidence.rows[0]!.applyAmount = true
    Object.assign(evidence.rows[2]!, {
      add: true,
      newName: 'Neu',
      category: 'Getränke',
      amount: '1 Stück',
      productId: 'missing',
    })
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    evidence.rows[2]!.productId = undefined
    evidence.date = '2026-02-31'
    evidence.applyDate = true
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    evidence.applyDate = false
    evidence.rows[0]!.amount = '300 g'
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    expect(useStore.getState().purchaseLog).toEqual(before.purchaseLog)
    expect(useStore.getState().completedTrips).toEqual(before.completedTrips)
    expect(useStore.getState().catalog).toEqual(before.catalog)
  })
  it('corrects the date of linked app positions absent from the scan and keeps the review partial', () => {
    const { trip, evidence, snapshot } = prepare('Milch 2 x 2.00\nTOTAL CHF 4.00')
    evidence.rows[0]!.apply = false
    evidence.applyDate = true
    evidence.date = '2026-09-14'
    expect(useStore.getState().saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(true)
    expect(useStore.getState().purchaseLog.every((entry) => entry.date === '2026-09-14')).toBe(true)
    expect(useStore.getState().completedTrips[0]!.receiptReview!.status).toBe('partial')
  })
  it('rejects a date correction touching another receipt through a shared purchase reference', () => {
    const { trip, evidence, snapshot } = prepare('Milch 2 x 2.00\nTOTAL CHF 4.00')
    evidence.rows[0]!.apply = false
    evidence.applyDate = true
    evidence.date = '2026-09-14'
    useStore.setState({ completedTrips: [trip, { ...trip, id: 'other' }] })
    const before = useStore.getState()
    expect(before.saveReceiptCheck(trip.id, snapshot, evidence, true).ok).toBe(false)
    expect(useStore.getState().purchaseLog).toEqual(before.purchaseLog)
    expect(useStore.getState().completedTrips).toEqual(before.completedTrips)
  })
})
