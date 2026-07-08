import { describe, expect, it } from 'vitest'
import { buildRepeatCandidates, previousWeekRange } from './repeatWeek'

describe('previousWeekRange', () => {
  it('returns the Monday–Sunday window before the current week', () => {
    // Wednesday 2026-07-08 → previous week 2026-06-29 (Mon) – 2026-07-05 (Sun)
    const ref = new Date(2026, 6, 8, 12)
    expect(previousWeekRange(ref)).toEqual({ start: '2026-06-29', end: '2026-07-05' })
  })
})

describe('buildRepeatCandidates', () => {
  it('collects unique purchases from the previous week', () => {
    const ref = new Date(2026, 6, 8, 12)
    const candidates = buildRepeatCandidates(
      [
        { name: 'Milch', category: 'Milch & Käse', date: '2026-07-01' },
        { name: 'Milch', category: 'Milch & Käse', date: '2026-07-03' },
        { name: 'Reis', category: 'Getreide & Beilagen', date: '2026-07-05' },
        { name: 'Heute', category: 'Sonstiges', date: '2026-07-08' },
      ],
      [],
      [{ id: '1', name: 'Milch', category: 'Milch & Käse', defaultAmount: '2 ×', createdAt: 1 }],
      [{ id: 'p1', name: 'Reis', category: 'Getreide & Beilagen' }],
      ref
    )

    expect(candidates).toEqual([{ name: 'Milch', category: 'Milch & Käse', amount: '2 ×' }])
  })
})
