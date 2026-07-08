import { describe, expect, it } from 'vitest'
import {
  buildLowStockSuggestions,
  isLowStock,
  matchesPantryName,
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
