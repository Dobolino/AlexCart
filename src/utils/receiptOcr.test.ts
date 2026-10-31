import { describe, it, expect, beforeEach, vi } from 'vitest'
const mock = vi.hoisted(() => ({ createWorker: vi.fn() }))
vi.mock('tesseract.js', () => ({ createWorker: mock.createWorker }))
import { createReceiptOcr, ocrReceiptImage } from './receiptOcr'
const worker = () => ({
  recognize: vi.fn().mockResolvedValue({ data: { text: 'Milch 1.50' } }),
  setParameters: vi.fn().mockResolvedValue(undefined),
  terminate: vi.fn().mockResolvedValue(undefined),
})
beforeEach(() => {
  mock.createWorker.mockReset()
})
describe('receipt OCR lifetime', () => {
  it('recognizes an image and releases its worker once', async () => {
    const engine = worker()
    mock.createWorker.mockResolvedValue(engine)
    expect(await ocrReceiptImage(new Blob(['image']))).toBe('Milch 1.50')
    expect(engine.terminate).toHaveBeenCalledTimes(1)
  })
  it('terminates recognition when the user cancels', async () => {
    const engine = worker()
    engine.recognize.mockImplementation(() => new Promise(() => {}))
    mock.createWorker.mockResolvedValue(engine)
    const controller = new AbortController()
    const pending = ocrReceiptImage(new Blob(), undefined, controller.signal)
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    await vi.waitFor(() => expect(engine.recognize).toHaveBeenCalled())
    controller.abort()
    await rejected
    expect(engine.terminate).toHaveBeenCalledTimes(1)
  })
  it('cleans up a worker that finishes initializing after cancellation', async () => {
    const engine = worker()
    let resolve: (value: typeof engine) => void = () => {}
    mock.createWorker.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done
        })
    )
    const controller = new AbortController()
    const pending = createReceiptOcr(undefined, controller.signal)
    const rejected = expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    await vi.waitFor(() => expect(mock.createWorker).toHaveBeenCalled())
    controller.abort()
    await rejected
    resolve(engine)
    await vi.waitFor(() => expect(engine.terminate).toHaveBeenCalledTimes(1))
  })
})
