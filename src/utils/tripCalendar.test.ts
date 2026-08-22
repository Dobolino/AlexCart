import { describe, expect, it } from 'vitest'
import { buildMonthGrid, tripsByDateKey } from './tripCalendar'
import type { CompletedTrip } from '@/types'

describe('tripCalendar', () => {
  it('groups trips by date', () => {
    const trips: CompletedTrip[] = [
      {
        id: '1',
        listId: 'l',
        listName: 'Test',
        completedAt: Date.parse('2026-08-21T12:00:00'),
        items: [{ id: 'a', name: 'Milch', amount: '', price: 2 }],
      },
    ]
    const map = tripsByDateKey(trips)
    expect(map.get('2026-08-21')?.totalSpent).toBe(2)
  })

  it('builds a month grid starting on Monday', () => {
    const grid = buildMonthGrid(2026, 7)
    expect(grid.filter((c) => c.inMonth)).toHaveLength(31)
    expect(grid[0]?.inMonth).toBe(false)
  })
})
