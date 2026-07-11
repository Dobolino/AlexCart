import { describe, expect, it } from 'vitest'
import {
  idsToExcludeTodayPricedCheckoffs,
  removeTodayPurchaseLogEntriesForItems,
  removeTodayPurchaseLogEntry,
  todayPricedEntries,
  todayPricedTotal,
  todayPricedTotalForList,
} from './purchaseLog'

const today = '2026-07-09'

const log = [
  { id: 'a', name: 'Milch', category: 'Milch & Käse', date: today, price: 2.5 },
  { id: 'b', name: 'Brot', category: 'Brot & Backwaren', date: today, price: 3.2 },
  { id: 'c', name: 'Äpfel', category: 'Obst & Gemüse', date: '2026-07-08', price: 4.0 },
]

describe('purchaseLog', () => {
  it('removeTodayPurchaseLogEntry entfernt den passenden Eintrag', () => {
    const next = removeTodayPurchaseLogEntry(log, 'Milch', 'Milch & Käse', '2026-07-09')
    expect(next).toHaveLength(2)
    expect(next[0]?.name).toBe('Brot')
  })

  it('removeTodayPurchaseLogEntriesForItems ignoriert offene Artikel', () => {
    const next = removeTodayPurchaseLogEntriesForItems(
      log,
      [
        { name: 'Milch', category: 'Milch & Käse', done: true },
        { name: 'Brot', category: 'Brot & Backwaren', done: false },
      ],
      today
    )
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

  it('todayPricedEntries ignoriert ausgeblendete Rechner-Einträge', () => {
    const hidden = new Set(['a'])
    const visible = todayPricedEntries(log, '2026-07-09', hidden)
    expect(visible).toHaveLength(1)
    expect(visible[0]?.name).toBe('Brot')
    expect(todayPricedTotal(log, '2026-07-09', hidden)).toBe(3.2)
  })

  it('idsToExcludeTodayPricedCheckoffs liefert nur heutige Preis-IDs', () => {
    const ids = idsToExcludeTodayPricedCheckoffs(log, '2026-07-09')
    expect(ids).toEqual(['a', 'b'])
  })
})
