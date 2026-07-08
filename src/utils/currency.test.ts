import { describe, expect, it } from 'vitest'
import { formatChf } from './currency'

describe('formatChf', () => {
  it('formats amounts in Swiss franc style', () => {
    expect(formatChf(48.7)).toBe('CHF 48.70')
    expect(formatChf(0)).toBe('CHF 0.00')
    expect(formatChf(1234.5)).toBe('CHF 1’234.50')
  })
})
