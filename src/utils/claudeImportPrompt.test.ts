import { describe, expect, it } from 'vitest'
import { buildClaudeImportPrompt } from './claudeImportPrompt'
import { CATEGORIES } from '@/data/products'
import { UNITS } from '@/constants/units'

describe('buildClaudeImportPrompt', () => {
  it('enthält Schema, Kategorien, Einheiten und Mengenregeln', () => {
    const prompt = buildClaudeImportPrompt()
    expect(prompt).toContain('"week"')
    expect(prompt).toContain('"items"')
    expect(prompt).toContain('Nur JSON')
    expect(prompt).toContain('2 Becher')
    expect(prompt).toContain('FALSCH')
    for (const category of CATEGORIES) {
      expect(prompt).toContain(category)
    }
    for (const unit of UNITS) {
      expect(prompt).toContain(unit)
    }
  })
})
