import { describe, expect, it } from 'vitest'
import { applyMoneyNumpadKey } from './numpadInput'

describe('applyMoneyNumpadKey', () => {
  it('appends digits and comma', () => {
    expect(applyMoneyNumpadKey('', '1')).toBe('1')
    expect(applyMoneyNumpadKey('12', ',')).toBe('12,')
    expect(applyMoneyNumpadKey('', ',')).toBe('0,')
  })

  it('limits decimals to two places', () => {
    expect(applyMoneyNumpadKey('1,23', '4')).toBe('1,23')
  })

  it('deletes the last character', () => {
    expect(applyMoneyNumpadKey('12,5', '⌫')).toBe('12,')
  })
})
