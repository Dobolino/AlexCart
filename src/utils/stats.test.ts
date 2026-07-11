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

describe('completed trip stats', () => {
  const trips: CompletedTrip[] = [
    { id: '1', listId: 'l1', listName: 'Wocheneinkauf', completedAt: Date.parse('2026-07-01'), itemCount: 10, totalSpent: 40 },
    { id: '2', listId: 'l1', listName: 'Wocheneinkauf', completedAt: Date.parse('2026-07-08'), itemCount: 6, totalSpent: 20 },
  ]

  it('averages spend and item count per completed trip', () => {
    expect(avgSpendPerCompletedTrip(trips)).toBeCloseTo(30)
    expect(avgItemsPerCompletedTrip(trips)).toBeCloseTo(8)
  })

  it('returns 0 for an empty list', () => {
    expect(avgSpendPerCompletedTrip([])).toBe(0)
    expect(avgItemsPerCompletedTrip([])).toBe(0)
  })

  it('buckets completed trips per week', () => {
    const today = new Date().toLocaleDateString('sv-SE')
    const sameWeekTrips: CompletedTrip[] = [
      { id: '1', listId: 'l1', listName: 'A', completedAt: Date.parse(today), itemCount: 3, totalSpent: 10 },
      { id: '2', listId: 'l1', listName: 'A', completedAt: Date.parse(today), itemCount: 2, totalSpent: 5 },
    ]
    const result = completedTripsPerWeek(sameWeekTrips, 1)
    expect(result[0].count).toBe(2)
  })
})
