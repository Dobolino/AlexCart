import { describe, expect, it } from 'vitest'
import { exportListJson } from './exportList'
import type { ShoppingList } from '@/types'

const list: ShoppingList = {
  id: '1',
  name: 'Wocheneinkauf',
  weekLabel: '2026-28',
  createdAt: 1,
  items: [
    { id: 'a', name: 'Milch', amount: '2 l', category: 'Milch & Käse', done: false, addedAt: 1 },
  ],
}

describe('exportListJson', () => {
  it('exports list without internal ids', () => {
    const json = exportListJson(list)
    const data = JSON.parse(json)
    expect(data.name).toBe('Wocheneinkauf')
    expect(data.items[0]).toEqual({
      name: 'Milch',
      amount: '2 l',
      category: 'Milch & Käse',
      done: false,
    })
    expect(data.items[0].id).toBeUndefined()
  })
})
