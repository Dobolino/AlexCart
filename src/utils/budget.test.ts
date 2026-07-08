import { describe, expect, it } from 'vitest'
import { budgetProgress, currentWeekSpend, isoWeekStart, totalBudgetSpend } from './budget'

describe('isoWeekStart', () => {
  it('returns Monday for a mid-week date', () => {
    expect(isoWeekStart('2026-07-08')).toBe('2026-07-06')
  })
})

describe('currentWeekSpend', () => {
  it('sums priced entries in the current week only', () => {
    const ref = new Date(2026, 6, 8, 12)
    const log = [
      { name: 'Milch', category: 'Milch & Käse', date: '2026-07-07', price: 2.5 },
      { name: 'Brot', category: 'Brot & Backwaren', date: '2026-07-01', price: 4.0 },
      { name: 'Käse', category: 'Milch & Käse', date: '2026-07-08', price: 6.5 },
    ]
    expect(currentWeekSpend(log, ref)).toBe(9)
  })
})

describe('budgetProgress', () => {
  it('calculates remaining amount and status thresholds', () => {
    expect(budgetProgress(120, 150)).toEqual({
      spent: 120,
      budget: 150,
      remaining: 30,
      percent: 80,
      status: 'warn',
    })
    expect(budgetProgress(155, 150).status).toBe('over')
    expect(budgetProgress(50, 150).status).toBe('ok')
  })
})

describe('totalBudgetSpend', () => {
  it('combines week spend and calculator total', () => {
    expect(totalBudgetSpend(40.5, 8.2)).toBe(48.7)
  })
})
