import { describe, expect, it } from 'vitest'
import { formatChf, parseChfInput } from './currency'

describe('formatChf', () => {
  it('formats amounts in Swiss franc style', () => {
    expect(formatChf(48.7)).toBe('CHF 48.70')
    expect(formatChf(0)).toBe('CHF 0.00')
    expect(formatChf(1234.5)).toBe('CHF 1’234.50')
  })
})

describe('parseChfInput', () => {
  it('parses decimal CHF input', () => {
    expect(parseChfInput('12,50')).toBe(12.5)
    expect(parseChfInput('3.90')).toBe(3.9)
    expect(parseChfInput('')).toBeNull()
    expect(parseChfInput('0')).toBeNull()
  })
})
