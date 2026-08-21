import { describe, expect, it } from 'vitest'
import { parseReceiptInput, parseReceiptText } from './receiptParse'

describe('parseReceiptText', () => {
  it('parst Migros-ähnliche Zeilen', () => {
    const text = `
Migros
Banane 1.20
4 x Cottage Cheese 7.20
Pouletschnitzel 500g 7.50
Total 15.90
`
    const parsed = parseReceiptText(text, 'Migros')
    expect(parsed.store).toBe('Migros')
    expect(parsed.total).toBe(15.9)
    expect(parsed.items.length).toBeGreaterThanOrEqual(3)
    const cottage = parsed.items.find((i) => /cottage/i.test(i.name))
    expect(cottage?.quantity).toBe(4)
    expect(cottage?.price).toBe(7.2)
    const schnitzel = parsed.items.find((i) => /poulet|schnitzel/i.test(i.name))
    expect(schnitzel?.amount).toMatch(/500/)
    expect(schnitzel?.price).toBe(7.5)
  })
})

describe('parseReceiptInput', () => {
  it('liest Claude-JSON', () => {
    const json = JSON.stringify({
      store: 'Migros',
      total: 10,
      items: [
        { name: 'Milch', amount: '1 l', category: 'Milch & Käse', price: 1.6 },
        { name: 'Brot', amount: '1 Stück', category: 'Brot & Backwaren', price: 2.1 },
      ],
    })
    const parsed = parseReceiptInput(json, 'Migros')
    expect(parsed.items).toHaveLength(2)
    expect(parsed.items[0]?.price).toBe(1.6)
  })
})
