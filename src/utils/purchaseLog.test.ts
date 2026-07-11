import { describe, expect, it } from 'vitest'
import {
  idsToExcludeTodayPricedCheckoffs,
  receiptItemsForList,
  removeTodayPurchaseLogEntriesForItems,
  removeTodayPurchaseLogEntry,
  syncPurchaseLogForItemRename,
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

  it('syncPurchaseLogForItemRename aktualisiert verknüpfte Einträge', () => {
    const linked = [
      { id: 'x', itemId: 'item-1', name: 'Milch', category: 'Milch & Käse', date: today, price: 2.5 },
      { id: 'y', name: 'Brot', category: 'Brot & Backwaren', date: today, price: 3.2 },
    ]
    const next = syncPurchaseLogForItemRename(
      linked,
      'item-1',
      'Milch',
      'Milch & Käse',
      { name: 'Vollmilch' },
      today
    )
    expect(next[0]?.name).toBe('Vollmilch')
    expect(next[0]?.itemId).toBe('item-1')
    expect(next[1]?.name).toBe('Brot')
  })

  it('removeTodayPurchaseLogEntry bevorzugt itemId bei Duplikaten', () => {
    const dupLog = [
      { id: 'a', itemId: 'item-a', name: 'Milch', category: 'Milch & Käse', date: today, price: 2.5 },
      { id: 'b', itemId: 'item-b', name: 'Milch', category: 'Milch & Käse', date: today, price: 2.8 },
    ]
    const next = removeTodayPurchaseLogEntry(dupLog, 'Milch', 'Milch & Käse', today, 'item-b')
    expect(next).toHaveLength(1)
    expect(next[0]?.itemId).toBe('item-a')
  })

  it('receiptItemsForList baut Quittungszeilen nur für abgehakte Artikel, Preis optional', () => {
    const listItems = [
      { id: 'item-1', name: 'Milch', amount: '1 l', category: 'Milch & Käse', done: true, favorite: false, addedAt: 0 },
      { id: 'item-2', name: 'Brot', amount: '1 Stk', category: 'Brot & Backwaren', done: true, favorite: false, addedAt: 0 },
      { id: 'item-3', name: 'Eier', amount: '6 Stk', category: 'Sonstiges', done: false, favorite: false, addedAt: 0 },
    ]
    const withItemIds = [
      { id: 'x', itemId: 'item-1', name: 'Milch', category: 'Milch & Käse', date: today, price: 2.5 },
      { id: 'y', itemId: 'item-2', name: 'Brot', category: 'Brot & Backwaren', date: today },
    ]
    const receipt = receiptItemsForList(withItemIds, listItems, today)
    expect(receipt).toEqual([
      { id: 'item-1', name: 'Milch', amount: '1 l', price: 2.5 },
      { id: 'item-2', name: 'Brot', amount: '1 Stk', price: undefined },
    ])
  })
})
