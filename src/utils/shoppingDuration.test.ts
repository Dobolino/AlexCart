import { describe, expect, it } from 'vitest'
import { activeShoppingDurationMs, formatShoppingDuration, isShoppingPaused } from './shoppingDuration'
import type { ShoppingSession } from '@/types'

describe('shoppingDuration', () => {
  const base: ShoppingSession = {
    listId: 'l1',
    startedAt: 1_000_000,
    totalPausedMs: 0,
  }

  it('misst aktive Zeit ohne Pause', () => {
    expect(activeShoppingDurationMs(base, 1_000_000 + 25 * 60_000)).toBe(25 * 60_000)
  })

  it('stoppt die Uhr während der Pause', () => {
    const paused: ShoppingSession = {
      ...base,
      pausedAt: 1_000_000 + 10 * 60_000,
      totalPausedMs: 0,
    }
    expect(activeShoppingDurationMs(paused, 1_000_000 + 60 * 60_000)).toBe(10 * 60_000)
  })

  it('zieht kumulierte Pausenzeit ab', () => {
    const session: ShoppingSession = {
      ...base,
      totalPausedMs: 5 * 60_000,
    }
    expect(activeShoppingDurationMs(session, 1_000_000 + 20 * 60_000)).toBe(15 * 60_000)
  })

  it('erkennt Pause-Zustand', () => {
    expect(isShoppingPaused(null)).toBe(false)
    expect(isShoppingPaused({ ...base, pausedAt: 123 })).toBe(true)
  })

  it('formatiert Dauer lesbar', () => {
    expect(formatShoppingDuration(23 * 60_000)).toBe('23 Min.')
    expect(formatShoppingDuration(65 * 60_000)).toBe('1 Std. 5 Min.')
  })
})
