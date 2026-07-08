import { describe, expect, it } from 'vitest'
import { buildRecurringSuggestions } from './recurring'
import type { ShoppingList } from '@/types'

const list: ShoppingList = {
  id: 'l1',
  name: 'Test',
  weekLabel: '',
  createdAt: 1,
  items: [],
}

describe('buildRecurringSuggestions', () => {
  it('suggests items when the typical purchase interval has passed', () => {
    const ref = new Date(2026, 6, 15, 12)
    const suggestions = buildRecurringSuggestions(
      [
        { name: 'Milch', category: 'Milch & Käse', date: '2026-07-01' },
        { name: 'Milch', category: 'Milch & Käse', date: '2026-07-08' },
      ],
      list,
      [],
      ref
    )
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]?.name).toBe('Milch')
    expect(suggestions[0]?.intervalDays).toBe(7)
  })

  it('skips items already on the open list', () => {
    const ref = new Date(2026, 6, 15, 12)
    const suggestions = buildRecurringSuggestions(
      [
        { name: 'Milch', category: 'Milch & Käse', date: '2026-07-01' },
        { name: 'Milch', category: 'Milch & Käse', date: '2026-07-08' },
      ],
      {
        ...list,
        items: [{ id: '1', name: 'Milch', amount: '2 l', category: 'Milch & Käse', done: false, addedAt: 1 }],
      },
      [],
      ref
    )
    expect(suggestions).toHaveLength(0)
  })
})
