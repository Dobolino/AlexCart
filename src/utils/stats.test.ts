import { describe, it, expect } from 'vitest'
import {
  topItems,
  categoryBreakdown,
  avgItemsPerTrip,
  distinctShoppingDays,
  productsPerWeek,
  totalSpent,
  avgSpendPerTrip,
  maxTripSpend,
  pricedPurchaseCount,
  avgSpendPerCompletedTrip,
  avgItemsPerCompletedTrip,
  completedTripsPerWeek,
  tripTotalSpent,
  isoWeekNumber,
  tripsByMonth,
} from './stats'
import type { CompletedTrip } from '@/types'

const log = [
  { name: 'Tomaten', category: 'Früchte & Gemüse', date: '2026-07-01' },
  { name: 'tomaten', category: 'Früchte & Gemüse', date: '2026-07-02' },
  { name: 'Milch', category: 'Milch & Käse', date: '2026-07-02' },
]

describe('topItems', () => {
  it('counts case-insensitively and sorts descending', () => {
    const result = topItems(log)
    expect(result[0]).toEqual({ label: 'Tomaten', count: 2 })
    expect(result[1]).toEqual({ label: 'Milch', count: 1 })
  })
})

describe('categoryBreakdown', () => {
  it('aggregates purchase counts per category', () => {
    const result = categoryBreakdown(log)
    expect(result).toEqual([
      { label: 'Früchte & Gemüse', count: 2 },
      { label: 'Milch & Käse', count: 1 },
    ])
  })
})

describe('distinctShoppingDays', () => {
  it('counts distinct calendar dates', () => {
    expect(distinctShoppingDays(log)).toBe(2)
    expect(distinctShoppingDays([])).toBe(0)
  })
})

describe('avgItemsPerTrip', () => {
  it('divides total items by distinct shopping days', () => {
    expect(avgItemsPerTrip(log)).toBeCloseTo(1.5)
  })
  it('returns 0 for an empty log', () => {
    expect(avgItemsPerTrip([])).toBe(0)
  })
})

describe('productsPerWeek', () => {
  it('returns the requested number of week buckets, oldest first', () => {
    const result = productsPerWeek(log, 4)
    expect(result).toHaveLength(4)
  })
  it('buckets two entries from the current week together', () => {
    const today = new Date().toLocaleDateString('sv-SE')
    const sameWeekLog = [
      { name: 'A', category: 'Sonstiges', date: today },
      { name: 'B', category: 'Sonstiges', date: today },
    ]
    const result = productsPerWeek(sameWeekLog, 1)
    expect(result[0].count).toBe(2)
  })
})

describe('spend stats', () => {
  const pricedLog = [
    { name: 'Milch', category: 'Milch & Käse', date: '2026-07-01', price: 2.5 },
    { name: 'Brot', category: 'Brot & Backwaren', date: '2026-07-01', price: 4.2 },
    { name: 'Käse', category: 'Milch & Käse', date: '2026-07-02', price: 6.8 },
  ]

  it('sums priced purchases and aggregates per trip', () => {
    expect(totalSpent(pricedLog)).toBeCloseTo(13.5)
    expect(avgSpendPerTrip(pricedLog)).toBeCloseTo(6.75)
    expect(maxTripSpend(pricedLog)).toBeCloseTo(6.8)
    expect(pricedPurchaseCount(pricedLog)).toBe(3)
  })
})

/** `n` Quittungszeilen, deren Preise sich zu `total` aufsummieren. */
function makeItems(n: number, total: number) {
  return Array.from({ length: n }, (_, i) => ({
    id: `i${i}`,
    name: `Artikel ${i}`,
    amount: '',
    price: i === 0 ? total : undefined,
  }))
}

describe('completed trip stats', () => {
  const trips: CompletedTrip[] = [
    { id: '1', listId: 'l1', listName: 'Wocheneinkauf', completedAt: Date.parse('2026-07-01'), items: makeItems(10, 40) },
    { id: '2', listId: 'l1', listName: 'Wocheneinkauf', completedAt: Date.parse('2026-07-08'), items: makeItems(6, 20) },
  ]

  it('averages spend and item count per completed trip', () => {
    expect(avgSpendPerCompletedTrip(trips)).toBeCloseTo(30)
    expect(avgItemsPerCompletedTrip(trips)).toBeCloseTo(8)
  })

  it('tripTotalSpent sums item prices, ignoring unpriced items', () => {
    expect(tripTotalSpent(trips[0]!)).toBe(40)
  })

  it('returns 0 for an empty list', () => {
    expect(avgSpendPerCompletedTrip([])).toBe(0)
    expect(avgItemsPerCompletedTrip([])).toBe(0)
  })

  it('buckets completed trips per week', () => {
    const today = new Date().toLocaleDateString('sv-SE')
    const sameWeekTrips: CompletedTrip[] = [
      { id: '1', listId: 'l1', listName: 'A', completedAt: Date.parse(today), items: makeItems(3, 10) },
      { id: '2', listId: 'l1', listName: 'A', completedAt: Date.parse(today), items: makeItems(2, 5) },
    ]
    const result = completedTripsPerWeek(sameWeekTrips, 1)
    expect(result[0].count).toBe(2)
  })
})

describe('isoWeekNumber', () => {
  it('returns ISO week 1 for the first Monday-anchored week of the year', () => {
    expect(isoWeekNumber(new Date(2021, 0, 4))).toBe(1)
  })

  it('returns ISO week 53 for the last days of a 53-week year', () => {
    expect(isoWeekNumber(new Date(2020, 11, 31))).toBe(53)
  })
})

describe('tripsByMonth', () => {
  const trips: CompletedTrip[] = [
    { id: '1', listId: 'l1', listName: 'A', completedAt: new Date(2026, 5, 5).getTime(), items: makeItems(1, 10) },
    { id: '2', listId: 'l1', listName: 'A', completedAt: new Date(2026, 6, 1).getTime(), items: makeItems(1, 20) },
    { id: '3', listId: 'l1', listName: 'A', completedAt: new Date(2026, 6, 8).getTime(), items: makeItems(1, 30) },
  ]

  it('groups trips by calendar month, newest month first', () => {
    const groups = tripsByMonth(trips)
    expect(groups.map((g) => g.key)).toEqual(['2026-07', '2026-06'])
  })

  it('sorts trips within a month newest first and sums the month subtotal', () => {
    const groups = tripsByMonth(trips)
    const july = groups.find((g) => g.key === '2026-07')!
    expect(july.trips.map((t) => t.id)).toEqual(['3', '2'])
    expect(july.subtotal).toBe(50)
  })

  it('returns an empty array for no trips', () => {
    expect(tripsByMonth([])).toEqual([])
  })
})
