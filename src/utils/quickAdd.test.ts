import { describe, expect, it } from 'vitest'
import { buildQuickPicks } from './quickAdd'
import type { CustomProduct, ShoppingList } from '@/types'

function list(id: string, items: ShoppingList['items']): ShoppingList {
  return { id, name: id, weekLabel: '', items, createdAt: 1 }
}

describe('buildQuickPicks', () => {
  it('prefers favorites and skips items already on the open list', () => {
    const active = list('a', [
      { id: '1', name: 'Milch', amount: '1 l', category: 'Milchprodukte', done: false, addedAt: 1, favorite: false },
      { id: '2', name: 'Brot', amount: '', category: 'Backwaren', done: false, addedAt: 2, favorite: true },
    ])
    const other = list('b', [
      { id: '3', name: 'Tomaten', amount: '500 g', category: 'Obst & Gemüse', done: false, addedAt: 99 },
    ])
    const picks = buildQuickPicks(active, [active, other], [])
    expect(picks.some((p) => p.name === 'Tomaten')).toBe(true)
    expect(picks.some((p) => p.name === 'Milch')).toBe(false)
  })

  it('includes custom products not yet on the list', () => {
    const active = list('a', [])
    const custom: CustomProduct[] = [
      { id: 'c1', name: 'Haferflocken', category: 'Getreide & Beilagen', defaultAmount: '500 g', createdAt: 1 },
    ]
    const picks = buildQuickPicks(active, [active], custom)
    expect(picks[0]?.name).toBe('Haferflocken')
  })
})
