import { it, expect } from 'vitest'
import { normalizeListInput } from './listInput'
import { importFromJSON } from './import'
it('accepts JSON objects, item arrays and ordinary ingredient lists without converting malformed JSON to products', () => {
  for (const text of [
    '{"items":[{"name":"Milch","amount":"1 l"}]}',
    '[{"name":"Milch","amount":"1 l"}]',
    '1 l Milch\n500 g Tomaten',
  ]) {
    const result = importFromJSON(normalizeListInput(text), [])
    expect(result.ok).toBe(true)
    expect(result.kept?.some((i) => i.name.toLowerCase().includes('milch'))).toBe(true)
  }
  expect(importFromJSON(normalizeListInput('{broken json'), []).ok).toBe(false)
  expect(() => normalizeListInput('a'.repeat(1024 * 1024 + 1))).toThrow('zu groß')
})
