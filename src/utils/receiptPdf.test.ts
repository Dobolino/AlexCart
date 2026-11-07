import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const mock = vi.hoisted(() => ({ getDocument: vi.fn(), createReceiptOcr: vi.fn() }))
vi.mock('pdfjs-dist', () => ({ getDocument: mock.getDocument, GlobalWorkerOptions: {} }))
vi.mock('./receiptOcr', () => ({ createReceiptOcr: mock.createReceiptOcr }))
import { extractReceiptFromPdf, isPdfFile } from './receiptPdf'
const file = { size: 100, arrayBuffer: async () => new ArrayBuffer(1) } as File
const page = (text: string) => ({
  getTextContent: vi.fn().mockResolvedValue({
    items: text ? [{ str: text, transform: [1, 0, 0, 10, 10, 100], width: 100, height: 10 }] : [],
  }),
  getViewport: vi.fn().mockReturnValue({ width: 200, height: 400 }),
  render: vi.fn().mockReturnValue({ promise: Promise.resolve() }),
  cleanup: vi.fn(),
})
beforeEach(() => {
  vi.clearAllMocks()
})
afterEach(() => {
  vi.unstubAllGlobals()
})
function setup(pages: ReturnType<typeof page>[]) {
  const destroy = vi.fn().mockResolvedValue(undefined)
  const pdf = {
    numPages: pages.length,
    getPage: vi.fn().mockImplementation(async (n: number) => pages[n - 1]),
  }
  mock.getDocument.mockReturnValue({ promise: Promise.resolve(pdf), destroy })
  return { pdf, destroy }
}

describe('receiptPdf', () => {
  it('erkennt PDF-Dateien an Typ oder Endung', () => {
    expect(isPdfFile({ type: 'application/pdf', name: 'bon.pdf' } as File)).toBe(true)
    expect(isPdfFile({ type: '', name: 'scan.PDF' } as File)).toBe(true)
    expect(isPdfFile({ type: 'image/jpeg', name: 'bon.jpg' } as File)).toBe(false)
  })
  it('reads native text without initializing OCR and releases the PDF', async () => {
    const native = page('MIGROS Milch Brot TOTAL CHF 3.50')
    const { destroy } = setup([native])
    expect(await extractReceiptFromPdf(file)).toBe('MIGROS Milch Brot TOTAL CHF 3.50')
    expect(mock.createReceiptOcr).not.toHaveBeenCalled()
    expect(native.cleanup).toHaveBeenCalledOnce()
    expect(destroy).toHaveBeenCalledOnce()
  })
  it('retains native pages and OCRs each scanned page with one shared worker', async () => {
    const native = page('MIGROS Milch Brot TOTAL CHF 3.50'),
      scan = page('')
    const { destroy } = setup([native, scan, page('')])
    const engine = {
      recognize: vi.fn().mockResolvedValueOnce('Scan 2').mockResolvedValueOnce('Scan 3'),
      close: vi.fn().mockResolvedValue(undefined),
    }
    mock.createReceiptOcr.mockResolvedValue(engine)
    vi.stubGlobal('document', {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({}),
        toBlob: (cb: (b: Blob) => void) => cb(new Blob()),
      }),
    })
    const progress = vi.fn()
    expect(await extractReceiptFromPdf(file, progress)).toBe(
      'MIGROS Milch Brot TOTAL CHF 3.50\nScan 2\nScan 3'
    )
    expect(mock.createReceiptOcr).toHaveBeenCalledOnce()
    expect(engine.recognize).toHaveBeenCalledTimes(2)
    expect(engine.close).toHaveBeenCalledOnce()
    expect(destroy).toHaveBeenCalledOnce()
    expect(progress).toHaveBeenLastCalledWith(100)
  })
  it('releases resources on a failed scan and rejects oversized documents', async () => {
    const { destroy } = setup(Array.from({ length: 21 }, () => page('')))
    await expect(extractReceiptFromPdf(file)).rejects.toThrow('20 PDF-Seiten')
    expect(destroy).toHaveBeenCalledOnce()
    await expect(extractReceiptFromPdf({ ...file, size: 26 * 1024 * 1024 })).rejects.toThrow('25 MB')
    const scanned = setup([page('')])
    mock.createReceiptOcr.mockRejectedValue(new Error('OCR offline'))
    await expect(extractReceiptFromPdf(file)).rejects.toThrow('OCR offline')
    expect(scanned.destroy).toHaveBeenCalledOnce()
  })
  it('aborts reading, cleans up the current page and never returns a partial document', async () => {
    const controller = new AbortController(),
      native = page('')
    native.getTextContent.mockImplementation(async () => {
      controller.abort()
      return { items: [] }
    })
    const { destroy } = setup([native])
    await expect(extractReceiptFromPdf(file, undefined, controller.signal)).rejects.toMatchObject({
      name: 'AbortError',
    })
    expect(native.cleanup).toHaveBeenCalledOnce()
    expect(destroy).toHaveBeenCalledOnce()
    expect(mock.createReceiptOcr).not.toHaveBeenCalled()
  })
  it('explains invalid or password-protected PDFs in German and releases the loading task', async () => {
    for (const [name, message] of [
      ['InvalidPDFException', 'beschädigt'],
      ['PasswordException', 'passwortgeschützt'],
    ]) {
      const destroy = vi.fn().mockResolvedValue(undefined)
      mock.getDocument.mockImplementation(() => ({
        promise: Promise.reject(Object.assign(new Error('PDF error'), { name })),
        destroy,
      }))
      await expect(extractReceiptFromPdf(file)).rejects.toThrow(message)
      expect(destroy).toHaveBeenCalledOnce()
    }
  })
})
