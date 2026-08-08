import { describe, expect, it } from 'vitest'
import { productPriceHistory, spendPerWeek } from './priceHistory'

const log = [
  { name: 'Milch', category: 'Milch & Käse', date: '2026-07-01', price: 2.1 },
  { name: 'Milch', category: 'Milch & Käse', date: '2026-07-08', price: 2.5 },
  { name: 'Brot', category: 'Brot & Backwaren', date: '2026-07-08', price: 3.2 },
]

describe('productPriceHistory', () => {
  it('aggregates average, last, min and max per product', () => {
    const stats = productPriceHistory(log)
    const milk = stats.find((s) => s.name === 'Milch')
    expect(milk).toMatchObject({
      count: 2,
      avgPrice: 2.3,
      lastPrice: 2.5,
      minPrice: 2.1,
      maxPrice: 2.5,
    })
  })
})

describe('spendPerWeek', () => {
  it('returns weekly spend buckets', () => {
    // Datum relativ zu heute, damit der Test nicht mit fortschreitender Zeit aus dem
    // 4-Wochen-Fenster fällt (fixe Kalenderdaten liefen sonst irgendwann ins Leere).
    const today = new Date().toLocaleDateString('sv-SE')
    const recentLog = [{ name: 'Milch', category: 'Milch & Käse', date: today, price: 2.5 }]
    const weeks = spendPerWeek(recentLog, 4)
    expect(weeks).toHaveLength(4)
    expect(weeks.some((w) => w.amount > 0)).toBe(true)
  })
})
