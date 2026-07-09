import { describe, expect, it } from 'vitest'
import { removeTodayPurchaseLogEntriesForItems, removeTodayPurchaseLogEntry } from './purchaseLog'

const log = [
  { name: 'Milch', category: 'Milch & Käse', date: '2026-07-09', price: 2.5 },
  { name: 'Brot', category: 'Brot & Backwaren', date: '2026-07-09', price: 3.2 },
]

describe('purchaseLog', () => {
  it('removeTodayPurchaseLogEntry entfernt den passenden Eintrag', () => {
    const next = removeTodayPurchaseLogEntry(log, 'Milch', 'Milch & Käse', '2026-07-09')
    expect(next).toHaveLength(1)
    expect(next[0]?.name).toBe('Brot')
  })

  it('removeTodayPurchaseLogEntriesForItems ignoriert offene Artikel', () => {
    const next = removeTodayPurchaseLogEntriesForItems(log, [
      { name: 'Milch', category: 'Milch & Käse', done: true },
      { name: 'Brot', category: 'Brot & Backwaren', done: false },
    ])
    expect(next).toHaveLength(1)
    expect(next[0]?.name).toBe('Brot')
  })
})
