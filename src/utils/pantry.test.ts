import { describe, expect, it } from 'vitest'
import {
  buildLowStockSuggestions,
  canDecrementPantryAmount,
  decrementPantryAmount,
  isLowStock,
  matchesPantryName,
  prepareLowStockListAddition,
  replenishAmount,
  replenishPantryItem,
  suggestedRestockAmount,
} from './pantry'
import type { PantryItem, ShoppingList } from '@/types'

const list: ShoppingList = {
  id: 'l1',
  name: 'Test',
  weekLabel: '',
  createdAt: 1,
  items: [],
}

describe('matchesPantryName', () => {
  it('matches exact and partial names', () => {
    expect(matchesPantryName('Vollmilch', 'Milch')).toBe(true)
    expect(matchesPantryName('Reis', 'Zucker')).toBe(false)
  })
})

describe('isLowStock', () => {
  it('detects when current amount is below minimum', () => {
    const item: PantryItem = {
      id: '1',
      name: 'Milch',
      category: 'Milch & Käse',
      amount: '0.5 l',
      minAmount: '1 l',
    }
    expect(isLowStock(item)).toBe(true)
    expect(isLowStock({ ...item, amount: '1.5 l' })).toBe(false)
  })
})

describe('replenishAmount', () => {
  it('adds purchased amount to current stock', () => {
    expect(replenishAmount('0.5 l', '2 l')).toBe('2,5 l')
    expect(replenishAmount(undefined, '500 g')).toBe('500 g')
  })
})

describe('suggestedRestockAmount', () => {
  it('returns the missing quantity up to minimum', () => {
    const item: PantryItem = {
      id: '1',
      name: 'Milch',
      category: 'Milch & Käse',
      amount: '0.5 l',
      minAmount: '1 l',
    }
    expect(suggestedRestockAmount(item)).toBe('0,5 l')
  })
})

describe('buildLowStockSuggestions', () => {
  it('suggests low-stock pantry items not already on the list', () => {
    const pantry: PantryItem[] = [
      { id: '1', name: 'Milch', category: 'Milch & Käse', amount: '0.2 l', minAmount: '1 l' },
      { id: '2', name: 'Reis', category: 'Getreide & Beilagen', amount: '2 kg', minAmount: '1 kg' },
    ]
    const suggestions = buildLowStockSuggestions(pantry, list)
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]?.name).toBe('Milch')
  })
})

describe('replenishPantryItem', () => {
  it('updates matching pantry stock when an item is purchased', () => {
    const pantry: PantryItem[] = [{ id: '1', name: 'Milch', category: 'Milch & Käse', amount: '0.5 l', minAmount: '1 l' }]
    const updated = replenishPantryItem(pantry, {
      id: 's1',
      name: 'Milch',
      amount: '2 l',
      category: 'Milch & Käse',
      done: true,
      addedAt: 1,
    })
    expect(updated[0]?.amount).toBe('2,5 l')
  })
})

describe('decrementPantryAmount', () => {
  it('reduces stock by a unit-appropriate step', () => {
    expect(decrementPantryAmount('3 Stück')).toBe('2 Stück')
    expect(decrementPantryAmount('1.5 l')).toBe('1 l')
    expect(decrementPantryAmount('2 kg')).toBe('1,5 kg')
    expect(decrementPantryAmount('500 g')).toBe('450 g')
  })

  it('does not go below zero', () => {
    expect(decrementPantryAmount('1 Stück')).toBe('0 Stück')
    expect(decrementPantryAmount('0.5 l')).toBe('0 l')
    expect(decrementPantryAmount('0 Stück')).toBeNull()
    expect(decrementPantryAmount(undefined)).toBeNull()
  })
})

describe('canDecrementPantryAmount', () => {
  it('allows decrement only when stock is above zero', () => {
    expect(canDecrementPantryAmount('2 l')).toBe(true)
    expect(canDecrementPantryAmount('0 l')).toBe(false)
    expect(canDecrementPantryAmount('')).toBe(false)
  })
})

describe('prepareLowStockListAddition', () => {
  it('returns list payload for low-stock items not already on the list', () => {
    const item: PantryItem = {
      id: '1',
      name: 'Milch',
      category: 'Milch & Käse',
      amount: '0 l',
      minAmount: '1 l',
    }
    expect(prepareLowStockListAddition(item, list)).toEqual({
      name: 'Milch',
      category: 'Milch & Käse',
      amount: '1 l',
    })
  })

  it('returns null when item is already on the list', () => {
    const item: PantryItem = {
      id: '1',
      name: 'Milch',
      category: 'Milch & Käse',
      amount: '0 l',
      minAmount: '1 l',
    }
    const busyList: ShoppingList = {
      ...list,
      items: [{ id: 'x', name: 'Milch', amount: '1 l', category: 'Milch & Käse', done: false, addedAt: 1 }],
    }
    expect(prepareLowStockListAddition(item, busyList)).toBeNull()
  })
})
