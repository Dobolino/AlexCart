import { createReceiptOcr } from '@/utils/receiptOcr'
import { receiptPdfText } from './receiptPdfText'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
const MIN_PDF_TEXT_CHARS = 24

export async function extractReceiptFromPdf(
  file: File,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<string> {
  signal?.throwIfAborted()
  if (file.size > 25 * 1024 * 1024) throw new Error('PDF ist zu groß (maximal 25 MB).')
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = pdfWorker
  const data = new Uint8Array(await file.arrayBuffer())
  signal?.throwIfAborted()
  const loading = getDocument({
    data,
    useWorkerFetch: false,
    isEvalSupported: false,
  })
  let engine: Awaited<ReturnType<typeof createReceiptOcr>> | undefined
  let activePage = 0
  let destruction: Promise<void> | undefined
  const destroy = () => (destruction ??= loading.destroy())
  const abort = () => {
    void destroy().catch(() => {})
    void engine?.close().catch(() => {})
  }
  signal?.addEventListener('abort', abort, { once: true })
  try {
    const pdf = await loading.promise
    signal?.throwIfAborted()
    if (pdf.numPages > 20) throw new Error('Bitte höchstens 20 PDF-Seiten auf einmal importieren.')
    const pages: string[] = []
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      signal?.throwIfAborted()
      activePage = pageNum - 1
      const page = await pdf.getPage(pageNum)
      let canvas: HTMLCanvasElement | undefined
      try {
        const content = await page.getTextContent()
        signal?.throwIfAborted()
        const pageText = receiptPdfText(content.items)
        if (pageText.replace(/\s/g, '').length >= MIN_PDF_TEXT_CHARS) {
          pages.push(pageText)
          continue
        }
        // Decide per page: a document may contain native text AND scanned receipt pages.
        engine ??= await createReceiptOcr(
          (pct) => onProgress?.(Math.round(((activePage + pct / 100) / pdf.numPages) * 100)),
          signal
        )
        signal?.throwIfAborted()
        canvas = document.createElement('canvas')
        const original = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({
          scale: Math.min(2, 2400 / Math.max(original.width, original.height)),
        })
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('PDF-Seite konnte nicht als Bild gelesen werden.')
        await page.render({ canvasContext: context, viewport }).promise
        signal?.throwIfAborted()
        const pageCanvas = canvas
        const blob = await new Promise<Blob | null>((resolve) =>
          pageCanvas.toBlob(resolve, 'image/jpeg', 0.92)
        )
        if (!blob) throw new Error('PDF-Seite konnte nicht verarbeitet werden.')
        const result = await engine.recognize(blob)
        signal?.throwIfAborted()
        pages.push(result.trim())
      } finally {
        page.cleanup()
        if (canvas) {
          canvas.width = 0
          canvas.height = 0
        }
        if (!signal?.aborted) onProgress?.(Math.round((pageNum / pdf.numPages) * 100))
      }
    }
    onProgress?.(100)
    return pages.filter(Boolean).join('\n').trim()
  } catch (error) {
    signal?.throwIfAborted()
    if (error instanceof Error && error.name === 'PasswordException')
      throw new Error('Die PDF ist passwortgeschützt. Bitte eine ungeschützte Kopie auswählen.')
    if (error instanceof Error && error.name === 'InvalidPDFException')
      throw new Error(
        'Die PDF ist beschädigt oder nicht lesbar. Bitte eine andere Datei auswählen oder Bon-Text einfügen.'
      )
    throw error
  } finally {
    signal?.removeEventListener('abort', abort)
    try {
      await engine?.close()
    } finally {
      await destroy()
    }
  }
}
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}
