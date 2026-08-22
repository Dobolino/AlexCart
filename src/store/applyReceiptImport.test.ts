import { beforeEach, describe, expect, it } from 'vitest'
import { useStore } from './useStore'
import type { ShoppingItem, ShoppingList } from '@/types'

function item(name: string, id = name): ShoppingItem {
  return { id, name, amount: '', category: 'Sonstiges', done: false, addedAt: 1 }
}

function listWith(items: ShoppingItem[]): ShoppingList {
  return { id: 'l1', name: 'Woche', weekLabel: 'KW1', items, createdAt: 1 }
}

describe('applyReceiptImport', () => {
  beforeEach(() => {
    useStore.setState({
      lists: [listWith([item('Milch'), item('Brot')])],
      activeListId: 'l1',
      purchaseLog: [],
      priceProfiles: [],
      pantry: [],
      completedTrips: [],
    })
  })

  it('does not duplicate a receipt line that already matches an existing list item', () => {
    const result = useStore.getState().applyReceiptImport({
      store: 'Migros',
      target: 'existing',
      listId: 'l1',
      addMissingItems: true,
      items: [
        { name: 'Milch', amount: '1 l', category: 'Milch & Käse', price: 1.95 },
        { name: 'Brot', amount: '', category: 'Brot & Getreide', price: 2.5 },
      ],
    })

    expect(result.ok).toBe(true)
    const list = useStore.getState().lists.find((l) => l.id === 'l1')!
    expect(list.items.filter((i) => i.name === 'Milch')).toHaveLength(1)
    expect(list.items.filter((i) => i.name === 'Brot')).toHaveLength(1)
    expect(list.items).toHaveLength(2)
  })

  it('adds a genuinely missing receipt item without touching the matched ones', () => {
    useStore.getState().applyReceiptImport({
      store: 'Migros',
      target: 'existing',
      listId: 'l1',
      addMissingItems: true,
      items: [
        { name: 'Milch', amount: '1 l', category: 'Milch & Käse', price: 1.95 },
        { name: 'Käse', amount: '', category: 'Milch & Käse', price: 4.2 },
      ],
    })

    const list = useStore.getState().lists.find((l) => l.id === 'l1')!
    expect(list.items.map((i) => i.name).sort()).toEqual(['Brot', 'Käse', 'Milch'])
  })

  it('does not let a second receipt line steal the price already assigned to a substring match', () => {
    useStore.setState({
      lists: [listWith([item('Milch')])],
    })

    useStore.getState().applyReceiptImport({
      store: 'Migros',
      target: 'existing',
      listId: 'l1',
      items: [
        { name: 'Milch', amount: '1 l', category: 'Milch & Käse', price: 1.95 },
        { name: 'Kokosmilch', amount: '400 ml', category: 'Milch & Käse', price: 2.6 },
      ],
    })

    const log = useStore.getState().purchaseLog
    const milch = log.find((e) => e.name === 'Milch')
    const kokosmilch = log.find((e) => e.name === 'Kokosmilch')
    expect(milch?.price).toBe(1.95)
    expect(kokosmilch?.price).toBe(2.6)
  })

  it('uses purchaseDate for trip and purchase log', () => {
    useStore.getState().applyReceiptImport({
      store: 'Migros',
      target: 'new',
      newListName: 'Migros',
      purchaseDate: '2026-07-15',
      items: [{ name: 'Milch', amount: '1 l', category: 'Milch & Käse', price: 1.95 }],
    })

    const trip = useStore.getState().completedTrips[0]!
    expect(new Date(trip.completedAt).toLocaleDateString('sv-SE')).toBe('2026-07-15')
    expect(useStore.getState().purchaseLog[0]?.date).toBe('2026-07-15')
  })
})
