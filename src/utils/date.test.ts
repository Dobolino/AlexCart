import { describe, expect, it } from 'vitest'
import { dateKeyToTimestamp, findReceiptDateInText, parseReceiptDate, timestampToDateKey } from './date'

describe('date helpers', () => {
  it('converts date keys and timestamps', () => {
    const key = '2026-08-21'
    const ts = dateKeyToTimestamp(key)
    expect(timestampToDateKey(ts)).toBe(key)
  })

  it('parses receipt dates', () => {
    expect(parseReceiptDate('21.08.2026')).toBe('2026-08-21')
    expect(parseReceiptDate('05.03.24')).toBe('2024-03-05')
    expect(findReceiptDateInText('Migros\n21.08.2026\nBanane')).toBe('2026-08-21')
  })
})
