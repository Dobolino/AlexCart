import { describe, expect, it } from 'vitest'
import { isPdfFile } from './receiptPdf'

describe('receiptPdf', () => {
  it('erkennt PDF-Dateien an Typ oder Endung', () => {
    expect(isPdfFile({ type: 'application/pdf', name: 'bon.pdf' } as File)).toBe(true)
    expect(isPdfFile({ type: '', name: 'scan.PDF' } as File)).toBe(true)
    expect(isPdfFile({ type: 'image/jpeg', name: 'bon.jpg' } as File)).toBe(false)
  })
})
