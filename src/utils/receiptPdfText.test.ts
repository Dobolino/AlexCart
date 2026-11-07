import { describe, expect, it } from 'vitest'
import { receiptPdfText } from './receiptPdfText'
const item = (str: string, x: number, y: number, width = str.length * 5) => ({
  str,
  transform: [1, 0, 0, 10, x, y],
  width,
  height: 10,
})
describe('PDF receipt reading order', () => {
  it('restores rows and columns even when the PDF stores prices before labels', () => {
    expect(
      receiptPdfText([
        item('2.00', 180, 90),
        item('Brot', 10, 90.5),
        item('Total CHF', 10, 70),
        item('3.50', 180, 70),
        item('Milch', 10, 110),
        item('1.50', 180, 110),
        { type: 'beginMarkedContent' },
      ])
    ).toBe('Milch 1.50\nBrot 2.00\nTotal CHF 3.50')
  })
  it('preserves adjacent glyphs and separates actual table cells', () => {
    expect(
      receiptPdfText([
        item('M', 10, 100, 5),
        item('ilch', 15, 100, 20),
        item('1', 100, 100),
        item('1.50', 150, 100),
        item('1.50', 200, 100),
        item(' ', 35, 100),
      ])
    ).toBe('Milch 1 1.50 1.50')
  })
})
