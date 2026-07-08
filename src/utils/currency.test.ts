import { describe, expect, it } from 'vitest'
import { formatMoney, parseMoneyInput } from './currency'

describe('formatMoney', () => {
  it('formats CHF in Swiss style', () => {
    expect(formatMoney(48.7, 'CHF')).toBe('CHF 48.70')
    expect(formatMoney(0, 'CHF')).toBe('CHF 0.00')
    expect(formatMoney(1234.5, 'CHF')).toBe("CHF 1'234.50")
  })

  it('formats EUR in German style', () => {
    expect(formatMoney(48.7, 'EUR')).toBe('48,70 €')
    expect(formatMoney(1234.5, 'EUR')).toBe('1.234,50 €')
  })
})

describe('parseMoneyInput', () => {
  it('parses decimal money input', () => {
    expect(parseMoneyInput('12,50')).toBe(12.5)
    expect(parseMoneyInput('3.90')).toBe(3.9)
    expect(parseMoneyInput('')).toBeNull()
    expect(parseMoneyInput('0')).toBeNull()
  })
})
