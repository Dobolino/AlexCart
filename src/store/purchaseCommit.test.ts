import { describe, expect, it } from 'vitest'
import { commitItemPurchase, parseCheckoffInput, undoTodayCheckoff } from './purchaseCommit'
import { todayKey } from '@/utils/date'
import type { PantryItem, ProductPriceProfile, PurchaseLogEntry, ShoppingItem, ShoppingList } from '@/types'

const today = todayKey()

function makeItem(overrides: Partial<ShoppingItem> = {}): ShoppingItem {
  return {
    id: 'item-1',
    name: 'Milch',
    category: 'Milch & Käse',
    amount: '1 l',
    done: false,
    favorite: false,
    addedAt: 0,
    ...overrides,
  }
}

function makeList(item: ShoppingItem): ShoppingList {
  return {
    id: 'list-1',
    name: 'Wocheneinkauf',
    weekLabel: '',
    items: [item],
    createdAt: 0,
  }
}

function baseState(item: ShoppingItem) {
  return {
    purchaseLog: [] as PurchaseLogEntry[],
    priceProfiles: [] as ProductPriceProfile[],
    lists: [makeList(item)],
    pantry: [] as PantryItem[],
  }
}

describe('purchaseCommit', () => {
  it('parseCheckoffInput normalisiert Zahlen und Objekte', () => {
    expect(parseCheckoffInput(2.5)).toEqual({ price: 2.5, wasSale: false })
    expect(parseCheckoffInput({ price: 3, wasSale: true })).toEqual({ price: 3, wasSale: true })
    expect(parseCheckoffInput(0)).toBeUndefined()
  })

  it('commitItemPurchase speichert itemId im Kaufprotokoll', () => {
    const item = makeItem()
    const next = commitItemPurchase(baseState(item), item, { price: 2.5, wasSale: false }, {
      listId: 'list-1',
      itemId: 'item-1',
      markDone: true,
      wasDone: false,
    })

    expect(next.purchaseLog).toHaveLength(1)
    expect(next.purchaseLog[0]?.itemId).toBe('item-1')
    expect(next.purchaseLog[0]?.price).toBe(2.5)
    expect(next.lists[0]?.items[0]?.done).toBe(true)
  })

  it('zwei gleiche Produkte erzeugen getrennte Log-Einträge', () => {
    const itemA = makeItem({ id: 'a', name: 'Milch' })
    const itemB = makeItem({ id: 'b', name: 'Milch' })
    const state = {
      ...baseState(itemA),
      lists: [{ ...makeList(itemA), items: [itemA, itemB] }],
    }

    const afterA = commitItemPurchase(state, itemA, { price: 2.5, wasSale: false }, {
      listId: 'list-1',
      itemId: 'a',
      markDone: true,
      wasDone: false,
    })
    const afterB = commitItemPurchase(afterA, itemB, { price: 2.8, wasSale: false }, {
      listId: 'list-1',
      itemId: 'b',
      markDone: true,
      wasDone: false,
    })

    expect(afterB.purchaseLog).toHaveLength(2)
    expect(afterB.purchaseLog.map((e) => e.itemId)).toEqual(['a', 'b'])
  })

  it('undoTodayCheckoff findet Eintrag über itemId', () => {
    const item = makeItem({ done: true })
    const state = {
      ...baseState(item),
      purchaseLog: [
        {
          id: 'log-1',
          itemId: 'item-1',
          name: 'Milch',
          category: 'Milch & Käse',
          date: today,
          price: 2.5,
        },
      ],
      lists: [makeList(item)],
    }

    const next = undoTodayCheckoff(state, item, 'list-1', 'item-1')
    expect(next.purchaseLog).toHaveLength(0)
    expect(next.lists[0]?.items[0]?.done).toBe(false)
  })
})
