import { describe, expect, it } from 'vitest'
import { parseRecipeLine, parseRecipeText, truncateRecipeSnippet } from './recipe'

describe('parseRecipeLine', () => {
  it('parses common ingredient formats', () => {
    expect(parseRecipeLine('- 500 g Mehl')).toEqual({ name: 'Mehl', amount: '500 g' })
    expect(parseRecipeLine('2 Stück Eier')).toEqual({ name: 'Eier', amount: '2 Stück' })
    expect(parseRecipeLine('• Salz')).toEqual({ name: 'Salz', amount: '' })
  })

  it('skips headings and empty lines', () => {
    expect(parseRecipeLine('Zutaten')).toBeNull()
    expect(parseRecipeLine('')).toBeNull()
  })

  it('rundet Mengen-Spannen auf den höheren Wert auf', () => {
    expect(parseRecipeLine('1-2 Bund Petersilie')).toEqual({
      name: 'Petersilie',
      amount: '2 Bund',
    })
    expect(parseRecipeLine('- 1 - 2 EL Olivenöl')).toEqual({
      name: 'Olivenöl',
      amount: '2 EL',
    })
  })
})

describe('parseRecipeText', () => {
  it('deduplicates and assigns categories from product search', () => {
    const text = `Zutaten
- 500 g Mehl
- 2 Stück Eier
- 500 g Mehl
- 1 l Milch`
    const items = parseRecipeText(text)
    expect(items.map((i) => i.name)).toEqual(['Mehl', 'Eier', 'Milch'])
    expect(items[2]?.category).toBe('Milch & Käse')
  })
})

describe('truncateRecipeSnippet', () => {
  it('kürzt lange Rezepttexte für die Vorschau', () => {
    const long = 'Zutaten\n' + '- Mehl\n'.repeat(30)
    const snippet = truncateRecipeSnippet(long, 40)
    expect(snippet.length).toBeLessThanOrEqual(40)
    expect(snippet.endsWith('…')).toBe(true)
  })
})
