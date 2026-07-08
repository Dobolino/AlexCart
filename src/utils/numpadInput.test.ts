import { describe, expect, it } from 'vitest'
import { applyFixedDecimalKey, centsToAmount } from './numpadInput'

describe('applyFixedDecimalKey', () => {
  it('builds amounts digit by digit like a cash register', () => {
    let cents = 0
    for (const key of ['1', '0', '2', '2', '5']) {
      cents = applyFixedDecimalKey(cents, key)
    }
    expect(cents).toBe(10_225)
    expect(centsToAmount(cents)).toBe(102.25)
  })

  it('clears with C and deletes with backspace', () => {
    expect(applyFixedDecimalKey(1025, '⌫')).toBe(102)
    expect(applyFixedDecimalKey(1025, 'C')).toBe(0)
  })
})

describe('centsToAmount', () => {
  it('returns null for zero or negative cents', () => {
    expect(centsToAmount(0)).toBeNull()
    expect(centsToAmount(-1)).toBeNull()
  })
})
