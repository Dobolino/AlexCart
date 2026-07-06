import { describe, it, expect } from 'vitest'
import { groupByCategory } from './group'

describe('groupByCategory', () => {
  it('orders known categories per the supermarket layout and appends unknown ones sorted', () => {
    const items = [
      { category: 'Sonstiges', name: 'a' },
      { category: 'Früchte & Gemüse', name: 'b' },
      { category: 'Zzz Custom', name: 'c' },
      { category: 'Aaa Custom', name: 'd' },
    ]
    const groups = groupByCategory(items)
    expect(groups.map((g) => g.category)).toEqual(['Früchte & Gemüse', 'Sonstiges', 'Aaa Custom', 'Zzz Custom'])
  })
})
