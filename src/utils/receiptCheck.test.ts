import { describe, it, expect } from 'vitest'
import {
  parseReceiptCheck,
  suggestReceiptRows,
  compareReceiptCheck,
  quantityMismatch,
  receiptQuantity,
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
  it('does not report equal prices as a verified match when the known product brands differ', () => {
    const input = evidence('Milch 1.50\nBrot 2.00\nTOTAL CHF 3.50')
    input.rows[0]!.brandName = 'Neue Marke'
    const result = compareReceiptCheck(
      {
        ...trip,
        items: trip.items.map((item) =>
          item.id === 'milk' ? { ...item, brandName: 'Bisherige Marke' } : item
        ),
      },
      input
    )
    expect(result.rows[0]).toMatchObject({ equal: true, brandMismatch: true })
    expect(result.status).toBe('partial')
  })
  it('does not multiply a table line total by a pack count printed in the product label', () => {
    const parsed = parseReceiptCheck(
      'Artikelbezeichnung Menge Preis Gespart Total #\nTestpapier 12x 1 8.00 8.00 2\nTotal CHF 8.00'
    )
    expect(parsed.lines).toMatchObject([{ name: 'Testpapier 12x', minor: 800, occurrences: 1 }])
    expect(parsed.totalMinor).toBe(800)
  })
  it('excludes individual point multipliers even if OCR loses the loyalty heading', () => {
    const parsed = parseReceiptCheck(
      'Testbrot 2.00\n+3xPkt. Ges.Sort. 6.00\nBonus-Coupon 2x 4.00\nCUM_5xPkt Test 10.00\n10x Cumulus gesamte SM 20.00\nTotal CHF 2.00'
    )
    expect(parsed.lines.map((line) => line.name)).toEqual(['Testbrot'])
    expect(parsed.adjustments).toEqual([])
    expect(parsed.warnings).toEqual([])
  })
  it('excludes the whole loyalty section, and keeps monetary Cumulus vouchers and rounding separate', () => {
    const parsed = parseReceiptCheck(
      'Artikelbezeichnung Menge Preis Gespart Total #\nTestbrot 1 12.03 12.03 1\nZwischentotal 12.03\nCumulus Bons\nCUMULUS BON 5.- 5.00- 9\nCumulus Bonuspunkte\n+3xPkt. Ges.Sort. 36.09\nBonus-Coupon 2x 24.06\n10x Cumulus gesamte SM 120.30\nRundungsvorteil 0.03-\nTotal CHF 7.00'
    )
    expect(parsed.lines.map((line) => line.name)).toEqual(['Testbrot'])
    expect(parsed.adjustments.map((line) => line.minor)).toEqual([-500, -3])
    expect(parsed.totalMinor).toBe(700)
    expect(parsed.warnings).toEqual([])
  })
  it('reads marked price columns and the summary of additional discounts without double counting details', () => {
    const parsed = parseReceiptCheck(
      'Artikelbezeichnung Menge Preis Gespart Total #\nGemüse 1 4.20 * 4.20 S1\nZwischentotal 4.20\n* weitere Rabatte\n1 CHF Coupon 1.00\nTotal weitere Rabatte 1.00-\nTotal CHF 3.20'
    )
    expect(parsed.lines[0]!.minor).toBe(420)
    expect(parsed.adjustments).toEqual([{ name: 'Weitere Rabatte', minor: -100 }])
    expect(parsed.totalMinor).toBe(320)
    expect(parsed.warnings).toEqual([])
  })
  it('uses an EDEKA final total after explained promotion/coupon reductions and ignores tax appendices and tender vouchers', () => {
    const parsed = parseReceiptCheck(
      'EDEKA\nTestchips 6.00 A\nSumme 6.00\nTestchips 3 fuer 2 -1.00\nSUMME € 5.00\nCoupon Testchips € 0.50\nSUMME € 4.50\nApp Gutschein € 1.00\nVisa 3.50\nMwSt NETTO MwSt UMSATZ\nSumme 6.00 0.50 5.50'
    )
    expect(parsed.lines).toHaveLength(1)
    expect(parsed.totalMinor).toBe(450)
    expect(parsed.adjustments.map((line) => line.minor)).toEqual([-100, -50])
    expect(parsed.warnings).toEqual([])
  })
  it('nets explicit table cancellations without losing products starting with Bar', () => {
    const parsed = parseReceiptCheck(
      'Artikelbezeichnung Menge Preis Gespart Total #\nKarotten 2 1.50 3.00 1\nKarotten -2 1.50 3.00- 1\nKarotten 1 1.50 1.50 1\nBar Vanille 1 2.00 2.00 1\nTotal CHF 3.50\nBAR 4.00\nRückgeld 0.50'
    )
    expect(parsed.lines).toMatchObject([
      { name: 'Karotten', minor: 150, occurrences: 1 },
      { name: 'Bar Vanille', minor: 200 },
    ])
    expect(new Set(parsed.lines.map((line) => line.id)).size).toBe(parsed.lines.length)
    expect(parsed.totalMinor).toBe(350)
    expect(parsed.warnings).toEqual([])
  })
  it('recognizes a negative refund total without inventing a product for an unnamed return', () => {
    const parsed = parseReceiptCheck(
      'Artikelbezeichnung Menge Preis Gespart Total #\nTestfrucht 0.200 10.00 2.00 1\n0.250 10.00- 2.50- 1\nTotal CHF -0.50\nZurück 0.50'
    )
    expect(parsed.totalMinor).toBe(-50)
    expect(
      parsed.lines.reduce((sum, line) => sum + line.minor, 0) +
        parsed.adjustments.reduce((sum, line) => sum + line.minor, 0)
    ).toBe(-50)
    expect(parsed.warnings).toEqual([])
  })
  it('validates editable receipt amounts including count units without treating fractional counts as whole packages', () => {
    for (const amount of ['2 Packungen', '2 Becher', '2 Knollen', '2 Gläser', '2 Päckchen'])
      expect(receiptQuantity(amount)).toEqual({ value: 2, unit: 'piece' })
    expect(receiptQuantity('0 Stück')).toBeNull()
    expect(receiptQuantity('1.5 Stück')).toBeNull()
    expect(receiptQuantity('unbekannt')).toBeNull()
    expect(receiptQuantity('0.532 kg')).toEqual({ value: 532, unit: 'g' })
  })
  it('reads Migros table totals instead of unit prices, savings, tax groups or loyalty points', () => {
    // Fictional receipt with the same column structure as a digital Migros receipt.
    const parsed = parseReceiptCheck(`05:01 €
GENOSSENSCHAFT MIGROS TEST
Artikelbezeichnung Menge Preis Gespart Total #
Birnen 0.400 4.00 0.20 1.40 1
Trauben 0.250 8.00 2.00 1
Saft 500ml 2 1.10 2.20 1
Zwischentotal 5.60
Cumulus 20-Fach. 120.00
Sie sparen total 0.20
Total CHF 5.60
Visa 5.60
Total EFT CHF: 5.60
Punktestand per 01.01.2026 100.00
Erhaltene Punkte 20.00
# MWST.-Nummer CHE-000.000.000 MWST
Gr Satz Total MWST
1 2.60 % 5.60 0.14`)
    expect(parsed).toMatchObject({ currency: 'CHF', store: 'Migros', totalMinor: 560, warnings: [] })
    expect(parsed.lines).toMatchObject([
      { name: 'Birnen', minor: 140, amount: '400 g' },
      { name: 'Trauben', minor: 200, amount: '250 g' },
      { name: 'Saft', minor: 220, amount: '2 × 500ml', occurrences: 2 },
    ])
    expect(parsed.adjustments).toEqual([])
  })
  it('reads EDEKA tax flags, quantity totals and item-bound app discounts exactly once', () => {
    const parsed = parseReceiptCheck(`EDEKA
Saft 0,5L1,20 € x 2 2,40 B
PFAND 0,25 € x 2 0,50*B
Tofu 2,00 AW
App Preis / Rabatt -0,30
Tofu 2,00 AW
App Preis / Rabatt -0,30
Coupon -0,20
SUMME € 6,10
Visa € 6,10
A 7% 3,18 0,22 3,40
Für den Einkauf von 5,60 EUR auf
Punktestand entspricht: 12,00 EUR
2026-01-01T10:11:12.000Z2026-01-01T10:11
:15.000Z`)
    expect(parsed).toMatchObject({ totalMinor: 610, currency: 'EUR', warnings: [] })
    expect(parsed.lines).toMatchObject([
      { name: 'Saft', minor: 240, amount: '2 × 0,5L', occurrences: 2 },
      { name: 'Tofu', minor: 340, occurrences: 2, discountMinor: -60 },
    ])
    expect(parsed.adjustments.map((a) => a.minor)).toEqual([50, -20])
    expect(
      parsed.lines.reduce((sum, line) => sum + line.minor, 0) +
        parsed.adjustments.reduce((sum, line) => sum + line.minor, 0)
    ).toBe(610)
  })
  it('never allocates an oversized, separated or generic discount to a product', () => {
    const parsed = parseReceiptCheck(
      'Milch 1.50\nApp Preis / Rabatt -2.00\nBrot 2.00\nHinweis\nApp Preis / Rabatt -0.50\nRabatt -0.20\nTOTAL CHF 0.80'
    )
    expect(parsed.lines.map((line) => line.minor)).toEqual([150, 200])
    expect(parsed.adjustments.map((line) => line.minor)).toEqual([-200, -50, -20])
  })
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
