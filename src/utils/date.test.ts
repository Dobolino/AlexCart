import { describe, it, expect } from 'vitest'
import { updateStreak, type StreakState } from './date'

describe('updateStreak', () => {
  it('starts a new streak at 1 from an empty state', () => {
    const result = updateStreak({ current: 0, longest: 0, lastDate: '' }, '2026-07-06')
    expect(result.current).toBe(1)
    expect(result.longest).toBe(1)
  })
  it('increments the streak on a consecutive day', () => {
    const state: StreakState = { current: 3, longest: 3, lastDate: '2026-07-05' }
    const result = updateStreak(state, '2026-07-06')
    expect(result.current).toBe(4)
    expect(result.longest).toBe(4)
  })
  it('resets the streak after a gap day', () => {
    const state: StreakState = { current: 5, longest: 5, lastDate: '2026-07-01' }
    const result = updateStreak(state, '2026-07-06')
    expect(result.current).toBe(1)
    expect(result.longest).toBe(5)
  })
  it('is a no-op when called again the same day', () => {
    const state: StreakState = { current: 2, longest: 2, lastDate: '2026-07-06' }
    const result = updateStreak(state, '2026-07-06')
    expect(result).toEqual(state)
  })
})
