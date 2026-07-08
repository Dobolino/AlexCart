import { describe, expect, it } from 'vitest'
import { applyImportMode } from './mergeList'
import type { ShoppingItem } from '@/types'

function item(name: string, amount = '', done = false): ShoppingItem {
  return { id: name, name, amount, category: 'Sonstiges', done, addedAt: 1 }
}

describe('applyImportMode', () => {
  const existing = [item('Milch', '1 l'), item('Brot', '', true)]
  const imported = [item('Tomaten', '500 g'), item('Milch', '500 ml')]

  it('replace keeps done items and swaps open ones', () => {
    const result = applyImportMode(existing, imported, 'replace')
    expect(result.map((i) => i.name)).toEqual(['Tomaten', 'Milch', 'Brot'])
    expect(result.find((i) => i.name === 'Brot')?.done).toBe(true)
  })

  it('append adds imported after open items', () => {
    const result = applyImportMode(existing, imported, 'append')
    expect(result.map((i) => i.name)).toEqual(['Milch', 'Tomaten', 'Milch', 'Brot'])
  })

  it('merge combines amounts for same name', () => {
    const result = applyImportMode(existing, imported, 'merge')
    const milk = result.find((i) => i.name === 'Milch' && !i.done)
    expect(milk?.amount).toContain('1')
    expect(milk?.amount).toContain('500')
  })
})
