import { describe, expect, it } from 'vitest'
import {
  removeAllTodayPricedCheckoffs,
  removeTodayPurchaseLogEntriesForItems,
  removeTodayPurchaseLogEntry,
  todayPricedTotal,
  todayPricedTotalForList,
} from './purchaseLog'

const log = [
  { name: 'Milch', category: 'Milch & Käse', date: '2026-07-09', price: 2.5 },
  { name: 'Brot', category: 'Brot & Backwaren', date: '2026-07-09', price: 3.2 },
  { name: 'Äpfel', category: 'Obst & Gemüse', date: '2026-07-08', price: 4.0 },
]

describe('purchaseLog', () => {
  it('removeTodayPurchaseLogEntry entfernt den passenden Eintrag', () => {
    const next = removeTodayPurchaseLogEntry(log, 'Milch', 'Milch & Käse', '2026-07-09')
    expect(next).toHaveLength(2)
    expect(next[0]?.name).toBe('Brot')
  })

  it('removeTodayPurchaseLogEntriesForItems ignoriert offene Artikel', () => {
    const next = removeTodayPurchaseLogEntriesForItems(log, [
      { name: 'Milch', category: 'Milch & Käse', done: true },
      { name: 'Brot', category: 'Brot & Backwaren', done: false },
    ])
    expect(next).toHaveLength(2)
    expect(next[0]?.name).toBe('Brot')
  })

  it('todayPricedTotal summiert nur heute', () => {
    expect(todayPricedTotal(log, '2026-07-09')).toBe(5.7)
  })

  it('todayPricedTotalForList zählt nur erledigte Listeneinträge', () => {
    const total = todayPricedTotalForList(
      log,
      [
        { id: '1', name: 'Milch', category: 'Milch & Käse', done: true, favorite: false, amount: '', addedAt: 0 },
        { id: '2', name: 'Brot', category: 'Brot & Backwaren', done: false, favorite: false, amount: '', addedAt: 0 },
      ],
      '2026-07-09'
    )
    expect(total).toBe(2.5)
  })

  it('removeAllTodayPricedCheckoffs entfernt nur heutige Preise', () => {
    const next = removeAllTodayPricedCheckoffs(log, '2026-07-09')
    expect(next).toHaveLength(1)
    expect(next[0]?.name).toBe('Äpfel')
  })
})
