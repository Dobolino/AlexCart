import { describe, expect, it } from 'vitest'
import { formatListItemDisplay } from './listItemDisplay'

describe('formatListItemDisplay', () => {
  it('trennt Packungsanzahl und Grösse', () => {
    expect(formatListItemDisplay('4 × 200 g')).toEqual({ countPrefix: '4×', detailLine: '200 g' })
    expect(formatListItemDisplay('2 × 500 g')).toEqual({ countPrefix: '2×', detailLine: '500 g' })
  })

  it('zeigt Stück-Mengen als Präfix', () => {
    expect(formatListItemDisplay('4 Stück')).toEqual({ countPrefix: '4×', detailLine: 'Stück' })
    expect(formatListItemDisplay('2 Becher')).toEqual({ countPrefix: '2×', detailLine: 'Becher' })
  })

  it('lässt reine Gewichtsangaben in der Detailzeile', () => {
    expect(formatListItemDisplay('500 g')).toEqual({ countPrefix: '', detailLine: '500 g' })
    expect(formatListItemDisplay('1 kg')).toEqual({ countPrefix: '', detailLine: '1 kg' })
  })
})
