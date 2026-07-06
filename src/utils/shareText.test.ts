import { describe, it, expect } from 'vitest'
import { buildShareText } from './shareText'
import type { ShoppingList } from '@/types'

const list: ShoppingList = {
  id: '1',
  name: 'Wocheneinkauf',
  weekLabel: '',
  createdAt: 0,
  items: [
    { id: 'a', name: 'Tomaten', amount: '500 g', category: 'Früchte & Gemüse', done: false, addedAt: 0 },
    { id: 'b', name: 'Milch', amount: '1 l', category: 'Milch & Käse', done: false, addedAt: 0 },
    { id: 'c', name: 'Erledigtes Ding', amount: '', category: 'Sonstiges', done: true, addedAt: 0 },
  ],
}

describe('buildShareText', () => {
  it('includes the list name and open items grouped by category', () => {
    const text = buildShareText(list)
    expect(text).toContain('Wocheneinkauf')
    expect(text).toContain('FRÜCHTE & GEMÜSE')
    expect(text).toContain('• Tomaten – 500 g')
    expect(text).toContain('MILCH & KÄSE')
    expect(text).toContain('• Milch – 1 l')
  })
  it('excludes items that are already done', () => {
    const text = buildShareText(list)
    expect(text).not.toContain('Erledigtes Ding')
  })
})
