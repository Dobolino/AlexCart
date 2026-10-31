import { describe, it, expect } from 'vitest'
import {
  parseReceiptCheck,
  suggestReceiptRows,
  compareReceiptCheck,
  quantityMismatch,
  type ReceiptCheckEvidence,
} from './receiptCheck'
import type { CompletedTrip } from '@/types'
const trip: CompletedTrip = {
  id: 'trip',
  listId: 'list',
  listName: 'Migros',
  store: 'Migros',
  completedAt: new Date(2026, 9, 31, 12).getTime(),
  currency: 'CHF',
  items: [
    { id: 'milk', name: 'Milch', amount: '1 Stück', price: 1.5 },
    { id: 'bread', name: 'Brot', amount: '1 Stück', price: 2 },
  ],
}
const evidence = (text: string): ReceiptCheckEvidence => {
  const parsed = parseReceiptCheck(text)
  return {
    ...parsed,
    rows: suggestReceiptRows(parsed, trip),
    currency: parsed.currency ?? 'CHF',
    source: 'text',
  }
}
describe('receipt photo text comparison', () => {
  it('reads CHF totals and tax suffixes, excluding payment, change and tax lines', () => {
    const result = evidence(
      'MIGROS\n31.10.2026\nMilch 1.50 A\nBrot 2.00 B\nTOTAL CHF3.50\nBAR 4.00\nRückgeld 0.50\nMWST 0.20'
    )
    expect(result.rows.map((row) => row.name)).toEqual(['Milch', 'Brot'])
    expect(result.totalMinor).toBe(350)
    expect(compareReceiptCheck(trip, result)).toMatchObject({
      status: 'matched',
      lineSum: 350,
      allEqual: true,
      totalMatches: true,
    })
  })
  it('keeps coupons and deposits separate and never treats subtotal or card payment as purchased products', () => {
    const parsed = parseReceiptCheck(
      'EDEKA\nMilch 1,50 B\nBrot 2,00 A\nPfand 0,25\nRabatt 0,50-\nZwischensumme 3,25\nSUMME EUR 3,25\nKartenzahlung 3,25'
    )
    expect(parsed.currency).toBe('EUR')
    expect(parsed.lines).toHaveLength(2)
    expect(parsed.adjustments).toEqual([
      { name: 'Pfand', minor: 25 },
      { name: 'Rabatt', minor: -50 },
    ])
    expect(parsed.totalMinor).toBe(325)
    const result = compareReceiptCheck(
      { ...trip, store: 'Edeka', currency: 'EUR' },
      { ...parsed, rows: suggestReceiptRows(parsed, trip), currency: 'EUR', source: 'photo' }
    )
    expect(result.lineSum).toBe(325)
    expect(result.status).toBe('partial')
  })
  it('groups duplicate receipt labels and handles explicit unit-price multiplication once', () => {
    const parsed = parseReceiptCheck('Milch 1.50\nMilch 1.50\nBrot 2 x 2.00\n2 x Joghurt 3.00\nTOTAL 10.00')
    expect(parsed.lines).toMatchObject([
      { name: 'Milch', minor: 300, occurrences: 2 },
      { name: 'Brot', minor: 400, occurrences: 2 },
      { name: 'Joghurt', minor: 300, occurrences: 2 },
    ])
    expect(parsed.totalMinor).toBe(1000)
  })
  it('does not match different names or ambiguous duplicate app rows automatically', () => {
    const parsed = parseReceiptCheck('Milch 1.50\nBio Milch 2.00\nTOTAL 3.50')
    const rows = suggestReceiptRows(parsed, {
      ...trip,
      items: [...trip.items, { ...trip.items[0]!, id: 'other' }],
    })
    expect(rows.map((row) => row.targetId)).toEqual(['', ''])
    expect(rows.every((row) => !row.apply)).toBe(true)
  })
  it('flags changed prices, unknown app prices and missing positions instead of reporting complete agreement', () => {
    const result = compareReceiptCheck(trip, evidence('Milch 1.70\nTOTAL CHF 1.70'))
    expect(result.rows[0]).toMatchObject({ appMinor: 150, minor: 170, equal: false, canApply: true })
    expect(result.missingItems.map((item) => item.id)).toEqual(['bread'])
    expect(result.status).toBe('partial')
  })
  it('blocks automatic corrections for incompatible known quantities and duplicate destinations', () => {
    expect(quantityMismatch('500 g', '0.5 kg')).toBe(false)
    expect(quantityMismatch('500 g', '300 g')).toBe(true)
    expect(quantityMismatch('1 l', '1 Stück')).toBe(false)
    const parsed = parseReceiptCheck('Milch 500 g 2.00\nTOTAL 2.00')
    const result = compareReceiptCheck(
      { ...trip, items: [{ ...trip.items[0]!, amount: '300 g' }] },
      { ...parsed, rows: suggestReceiptRows(parsed, trip), currency: 'CHF', source: 'photo' }
    )
    expect(result.rows[0]).toMatchObject({ quantityMismatch: true, canApply: false })
    const duplicate = evidence('Milch 1.50\nBrot 2.00\nTOTAL 3.50')
    duplicate.rows[1]!.targetId = 'milk'
    expect(compareReceiptCheck(trip, duplicate).rows.every((row) => row.duplicate && !row.canApply)).toBe(
      true
    )
  })
  it('preserves uncertainty about multiple totals, unparsed money lines, other stores and other dates', () => {
    const multiple = parseReceiptCheck('Milch 1.50\nTOTAL 1.50\nTOTAL 9.99\nCHF EUR')
    expect(multiple.totalMinor).toBeUndefined()
    expect(multiple.currency).toBeUndefined()
    expect(multiple.warnings).toHaveLength(2)
    const incomplete = evidence('Milch 1.50\nBrot 2.00\nTOTAL 3.50\nUnklare Geldzeile 7.00')
    expect(compareReceiptCheck(trip, incomplete).status).toBe('partial')
    const wrong = evidence('EDEKA\n30.10.2026\nMilch 1.50\nBrot 2.00\nTOTAL CHF 3.50')
    expect(compareReceiptCheck(trip, wrong)).toMatchObject({ metadataMismatch: true, status: 'partial' })
  })
  it('distinguishes zero-price lines from missing prices and limits unbounded OCR input', () => {
    const parsed = parseReceiptCheck('Gratis 0.00\nTOTAL CHF 0.00')
    expect(parsed.lines[0]!.minor).toBe(0)
    expect(parsed.totalMinor).toBe(0)
    expect(compareReceiptCheck(trip, evidence('Milch 0.00\nTOTAL CHF 0.00')).rows[0]!.canApply).toBe(false)
    expect(() => parseReceiptCheck('a'.repeat(100001))).toThrow('zu lang')
  })
})
