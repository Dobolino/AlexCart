import { describe, expect, it } from 'vitest'
import {
  buildPriceAnalysisPrompt,
  buildPriceExport,
  exportPriceCsv,
  exportPriceJson,
  priceExportFilename,
  storeByPurchaseKey,
} from './priceExport'
import type { CompletedTrip, GlobalBrand, ProductPriceProfile, PurchaseLogEntry } from '@/types'

const log: PurchaseLogEntry[] = [
  {
    name: 'Milch',
    category: 'Milch & Käse',
    date: '2026-08-01',
    price: 1.95,
    variantId: 'v1',
    variantName: '1 l',
  },
  {
    name: 'Tomaten',
    category: 'Früchte & Gemüse',
    date: '2026-08-01',
    price: 3.5,
    wasSale: true,
  },
  {
    name: 'Milch',
    category: 'Milch & Käse',
    date: '2026-08-08',
    price: 2.1,
    variantId: 'v1',
    variantName: '1 l',
  },
]

const brands: GlobalBrand[] = [{ id: 'b1', name: 'M Classic', createdAt: 1 }]

const profiles: ProductPriceProfile[] = [
  {
    id: 'p1',
    itemName: 'Milch',
    category: 'Milch & Käse',
    baseKey: 'milch|milch & kase',
    variants: [
      {
        id: 'v1',
        name: '1 l',
        brandId: 'b1',
        purchaseCount: 2,
        lastPurchaseWasSale: false,
        salePurchaseCount: 0,
      },
    ],
    createdAt: 1,
    updatedAt: 1,
  },
]

const trips: CompletedTrip[] = [
  {
    id: 't1',
    listId: 'l1',
    listName: 'Woche',
    completedAt: Date.parse('2026-08-01T15:00:00'),
    store: 'Migros',
    items: [
      { id: 'a', name: 'Milch', amount: '1 l', price: 1.95 },
      { id: 'b', name: 'Tomaten', amount: '500 g', price: 3.5 },
    ],
  },
  {
    id: 't2',
    listId: 'l1',
    listName: 'Woche',
    completedAt: Date.parse('2026-08-08T15:00:00'),
    store: 'Coop',
    items: [{ id: 'c', name: 'Milch', amount: '1 l', price: 2.1 }],
  },
]

describe('priceExport', () => {
  it('maps store from completed trips onto purchase rows', () => {
    const map = storeByPurchaseKey(trips)
    expect(map.get('2026-08-01|milch')).toBe('Migros')
    expect(map.get('2026-08-08|milch')).toBe('Coop')
  })

  it('builds JSON with averages, category %, and store baskets', () => {
    const payload = buildPriceExport({
      purchaseLog: log,
      priceProfiles: profiles,
      brands,
      completedTrips: trips,
      currency: 'CHF',
      now: new Date('2026-08-21T12:00:00Z'),
    })

    expect(payload.currency).toBe('CHF')
    expect(payload.purchases).toHaveLength(3)
    expect(payload.purchases[0]).toMatchObject({
      date: '2026-08-01',
      name: 'Milch',
      brand: 'M Classic',
      store: 'Migros',
      wasSale: false,
    })
    expect(payload.productAverages.some((p) => p.name === 'Milch' && p.count === 2)).toBe(true)
    expect(payload.categorySpend[0]?.percent).toBeGreaterThan(0)
    expect(payload.storeBaskets.some((s) => s.store === 'Migros')).toBe(true)

    const json = exportPriceJson(payload)
    expect(JSON.parse(json).purchases).toHaveLength(3)
  })

  it('exports CSV with header and currency column', () => {
    const eurLog: PurchaseLogEntry[] = log.map((entry) => ({ ...entry, currency: 'EUR' }))
    const payload = buildPriceExport({
      purchaseLog: eurLog,
      priceProfiles: profiles,
      brands,
      completedTrips: trips,
      currency: 'EUR',
    })
    const csv = exportPriceCsv(payload)
    const lines = csv.split('\n')
    expect(lines[0]).toContain('date,name,category,price,currency')
    expect(lines[1]).toContain('EUR')
    expect(lines).toHaveLength(4)
  })

  it('excludes purchases recorded in a different currency', () => {
    const mixedLog: PurchaseLogEntry[] = [...log, { name: 'Käse', category: 'Milch & Käse', date: '2026-08-09', price: 4.2, currency: 'EUR' }]
    const payload = buildPriceExport({
      purchaseLog: mixedLog,
      priceProfiles: profiles,
      brands,
      completedTrips: trips,
      currency: 'CHF',
    })
    expect(payload.purchases).toHaveLength(3)
    expect(payload.purchases.some((p) => p.name === 'Käse')).toBe(false)
    expect(payload.productAverages.some((p) => p.name === 'Käse')).toBe(false)
  })

  it('builds an AI prompt containing the JSON payload', () => {
    const payload = buildPriceExport({
      purchaseLog: log,
      priceProfiles: profiles,
      brands,
      completedTrips: trips,
      currency: 'CHF',
    })
    const prompt = buildPriceAnalysisPrompt(payload)
    expect(prompt).toContain('Ausgabenanteil')
    expect(prompt).toContain('"currency": "CHF"')
  })

  it('names export files with ISO date', () => {
    expect(priceExportFilename('csv', new Date('2026-08-21T12:00:00Z'))).toBe('alexshop-preise-2026-08-21.csv')
  })
})
