import { describe, expect, it } from 'vitest'
import {
  recognizeReceiptLabel,
  receiptAliasKey,
  receiptAmountKey,
  receiptNameScore,
  receiptBrandKey,
} from './receiptVocabulary'

describe('receipt vocabulary', () => {
  it('recognizes the documented Monster / Monster Energy synonym without merging unrelated brands', () => {
    expect(receiptBrandKey('Monster Energy')).toBe(receiptBrandKey('Monster'))
    expect(receiptBrandKey('Monster Munch')).not.toBe(receiptBrandKey('Monster'))
  })
  it.each([
    ['MClass Wienerli', 'CHF:migros', 'M Classic', 'Wienerli'],
    ['MBud Tofu nature', 'CHF:migros', 'M-Budget', 'Tofu nature'],
    ['M-Bud Glasreiniger', 'CHF:migros', 'M-Budget', 'Glasreiniger'],
    ['G&G FRISCHKAESE', 'EUR:edeka', 'Gut & Günstig', 'Frischkäse'],
    ['HERZ.BROCCOLI', 'EUR:marktkauf', 'Edeka Herzstücke', 'BROCCOLI'],
    ['BIO E.TOMATEN', 'EUR:edeka', 'Edeka Bio', 'TOMATEN'],
    ['B&J COOKIE', 'EUR:edeka', 'Ben & Jerry’s', 'COOKIE'],
    ['YOU Skyr Nature', 'CHF:migros', 'YOU', 'Skyr Nature'],
  ])('separates an explicit brand from %s', (label, retailer, brandName, name) => {
    expect(recognizeReceiptLabel(label, retailer)).toMatchObject({ brandName, name, source: 'explicit' })
  })
  it.each([
    'Bio Eier 6 Stück',
    'BJ Extra Erdbeeren',
    'M Piadina Prosciutto',
    'Migros Kokosmilch',
    'IPS Broccoli',
    'MSC Fisch',
    'A.STARS SO.FLU.',
  ])('keeps ambiguous labels unbranded: %s', (label) => {
    expect(recognizeReceiptLabel(label, 'CHF:migros').brandName).toBeUndefined()
  })
  it('restricts retailer abbreviations and keeps learned aliases local to a retailer and package size', () => {
    expect(recognizeReceiptLabel('MClass Milch', 'EUR:edeka').brandName).toBeUndefined()
    const key = receiptAliasKey('CHF:migros', 'Kurze Milch', receiptAmountKey('500 ml'))
    const alias = {
      key,
      retailer: 'CHF:migros',
      label: 'Kurze Milch',
      amountKey: receiptAmountKey('500 ml'),
      name: 'Milch',
      category: 'Milch & Käse',
      brandName: 'Testmarke',
    }
    expect(recognizeReceiptLabel('Kurze Milch', 'CHF:migros', [alias], '500 ml')).toMatchObject({
      source: 'remembered',
      name: 'Milch',
      brandName: 'Testmarke',
    })
    expect(recognizeReceiptLabel('Kurze Milch', 'CHF:migros', [alias], '1 l').source).toBe('none')
    expect(recognizeReceiptLabel('Kurze Milch', 'EUR:edeka', [alias], '500 ml').source).toBe('none')
    expect(receiptAmountKey('300 g', true)).toBe(receiptAmountKey('700 g', true))
  })
  it('suggests candidates without equating unrelated products or erasing variant differences', () => {
    expect(receiptNameScore('MClass Cottage Cheese', 'Hüttenkäse', 'CHF:migros')).toBe(1)
    expect(receiptNameScore('Monster Ultra', 'Monster Energy', 'CHF:migros')).toBeGreaterThanOrEqual(0.45)
    expect(receiptNameScore('Milch', 'Glasreiniger', 'CHF:migros')).toBe(0)
  })
})
