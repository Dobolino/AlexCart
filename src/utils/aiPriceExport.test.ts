import { describe, it, expect } from 'vitest'
import { buildAiPriceExport, aiPriceCsv, aiPricePrompt, type AiPriceInput } from './aiPriceExport'

const input: AiPriceInput = {
  purchaseLog: [
    {
      id: 'ch',
      name: 'Milch',
      category: 'Milch & Käse',
      amount: '2 l',
      date: '2026-10-24',
      price: 4,
      currency: 'CHF',
      storeId: 'CH:migros',
    },
    {
      id: 'de',
      name: 'Milch',
      category: 'Milch & Käse',
      amount: '1 l',
      date: '2026-10-24',
      price: 1.2,
      currency: 'EUR',
      storeId: 'DE:edeka',
    },
    {
      id: 'unknown',
      name: 'Ohne Mengenangabe',
      category: 'Sonstiges',
      date: '2026-10-24',
      price: 3,
      currency: 'CHF',
    },
  ],
  priceProfiles: [],
  brands: [],
  completedTrips: [],
  catalog: [],
  retailStores: [
    { id: 'CH:migros', name: 'Migros', country: 'CH', retailerId: 'migros', currency: 'CHF' },
    { id: 'DE:edeka', name: 'Edeka', country: 'DE', retailerId: 'edeka', currency: 'EUR' },
  ],
  priceObservations: [],
  fxSnapshot: null,
  settings: { currency: 'CHF' },
}
describe('AI price export', () => {
  it('retains original currencies, distinguishes stores for the same product/date and computes known unit prices', () => {
    const result = buildAiPriceExport(input)
    expect(result.records.find((r) => r.id === 'ch')).toMatchObject({
      country: 'CH',
      store: 'Migros',
      price: { minor: 400, currency: 'CHF' },
      unitPrice: { amount: '2', currency: 'CHF', unit: 'l' },
    })
    expect(result.records.find((r) => r.id === 'de')).toMatchObject({
      country: 'DE',
      store: 'Edeka',
      price: { minor: 120, currency: 'EUR' },
      unitPrice: { amount: '1.2', unit: 'l' },
    })
    expect(result.records.find((r) => r.id === 'unknown')?.unitPrice).toBeNull()
    expect(result.records.find((r) => r.id === 'unknown')?.countryInferredFromCurrency).toBe(true)
    expect(result.exchangeRate).toBeNull()
    expect(result.records.find((r) => r.id === 'ch')?.loyaltyRequired).toBeNull()
    expect(buildAiPriceExport(input, 'DE').records.map((r) => r.id)).toEqual(['de'])
  })
  it('keeps a per-kg observation separate from the product package size', () => {
    const result = buildAiPriceExport({
      ...input,
      purchaseLog: [],
      catalog: [
        {
          id: 'apples',
          name: 'Äpfel',
          category: 'Früchte & Gemüse',
          gtins: [],
          netQuantity: { value: 500, unit: 'g' },
          source: 'manual',
          updatedAt: '2026-10-24T12:00:00Z',
        },
      ],
      priceObservations: [
        {
          id: 'kg',
          productId: 'apples',
          storeId: 'CH:migros',
          price: { minor: 399, currency: 'CHF' },
          basis: 'kg',
          observedAt: '2026-10-24T12:00:00Z',
          source: 'manual',
        },
      ],
    })
    expect(result.records[0]).toMatchObject({
      amount: '1 kg',
      amountMeaning: 'unit basis',
      unitPrice: { amount: '3.99', currency: 'CHF', unit: 'kg' },
    })
  })
  it('includes standalone observations and avoids exporting the same receipt observation twice', () => {
    const result = buildAiPriceExport({
      ...input,
      catalog: [
        {
          id: 'milk',
          name: 'Milch',
          category: 'Milch & Käse',
          gtins: [],
          netQuantity: { value: 1000, unit: 'ml' },
          source: 'manual',
          updatedAt: new Date().toISOString(),
        },
      ],
      priceObservations: [
        {
          id: 'linked',
          purchaseLogId: 'ch',
          productId: 'milk',
          storeId: 'CH:migros',
          price: { minor: 200, currency: 'CHF' },
          basis: 'package',
          observedAt: '2026-10-24T12:00:00Z',
          source: 'receipt',
        },
        {
          id: 'manual',
          productId: 'milk',
          storeId: 'DE:edeka',
          price: { minor: 140, currency: 'EUR' },
          basis: 'package',
          observedAt: '2026-10-24T12:00:00Z',
          source: 'manual',
        },
      ],
    })
    expect(result.records).toHaveLength(4)
    expect(result.records.some((r) => r.id === 'linked')).toBe(false)
    expect(result.records.find((r) => r.id === 'manual')).toMatchObject({
      kind: 'observation',
      price: { basis: 'package' },
      unitPrice: { amount: '1.4', unit: 'l' },
    })
  })
  it('uses linked receipt quantities without exporting personal list names or notes and protects CSV formula cells', () => {
    const result = buildAiPriceExport({
      ...input,
      completedTrips: [
        {
          id: 't',
          listId: 'secret',
          listName: 'Privater Listenname',
          completedAt: Date.now(),
          currency: 'CHF',
          items: [{ id: 'item', name: 'Unbekannt', amount: '500 g', purchaseLogId: 'unknown' }],
        },
      ],
      purchaseLog: [
        ...input.purchaseLog,
        {
          id: 'formula',
          name: '=HYPERLINK("https://example.com")',
          category: 'Sonstiges',
          date: '2026-10-24',
          currency: 'CHF',
          price: 1,
        },
      ],
    })
    expect(result.records.find((r) => r.id === 'unknown')?.unitPrice).toMatchObject({
      amount: '6',
      unit: 'kg',
    })
    expect(JSON.stringify(result)).not.toContain('Privater Listenname')
    expect(aiPriceCsv(result)).toContain("'=HYPERLINK")
    expect(aiPricePrompt(result)).toContain('kein Händler-Preisranking')
  })
})
