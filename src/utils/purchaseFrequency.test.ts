import { describe, expect, it } from 'vitest'
import {
  buildLastPurchaseIndex,
  daysSincePurchase,
  formatLastPurchasedHint,
  lastPurchasedHintForName,
} from './purchaseFrequency'
import type { CompletedTrip } from '@/types'

function trip(completedAt: number, names: string[]): CompletedTrip {
  return {
    id: 't1',
    listId: 'l1',
    listName: 'Test',
    completedAt,
    items: names.map((name, i) => ({ id: `i${i}`, name, amount: '1 Stk' })),
  }
}

describe('purchaseFrequency', () => {
  it('baut einen Index mit dem neuesten Kaufdatum pro Produktname', () => {
    const older = new Date('2026-07-01T10:00:00').getTime()
    const newer = new Date('2026-07-10T10:00:00').getTime()
    const index = buildLastPurchaseIndex([
      trip(older, ['Tomaten', 'Milch']),
      trip(newer, ['Tomaten']),
    ])
    expect(index.get('tomaten')).toBe(newer)
    expect(index.get('milch')).toBe(older)
  })

  it('normalisiert Umlaute beim Lookup', () => {
    const at = new Date('2026-07-05T10:00:00').getTime()
    const index = buildLastPurchaseIndex([trip(at, ['Äpfel'])])
    expect(lastPurchasedHintForName('Apfel', index, '2026-07-08')).toMatch(/vor 3 Tagen/)
  })

  it('formatiert Tages-Hinweise', () => {
    expect(formatLastPurchasedHint(0)).toBe('Heute bereits gekauft')
    expect(formatLastPurchasedHint(1)).toBe('Zuletzt gekauft: gestern')
    expect(formatLastPurchasedHint(5)).toBe('Zuletzt gekauft: vor 5 Tagen')
  })

  it('liefert null für unbekannte Produkte', () => {
    const index = buildLastPurchaseIndex([])
    expect(lastPurchasedHintForName('Kartoffeln', index)).toBeNull()
  })

  it('berechnet Kalendertage korrekt', () => {
    const at = new Date('2026-07-08T23:59:00').getTime()
    expect(daysSincePurchase(at, '2026-07-08')).toBe(0)
    expect(daysSincePurchase(at, '2026-07-09')).toBe(1)
  })
})
