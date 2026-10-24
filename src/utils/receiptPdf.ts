import { createReceiptOcr } from '@/utils/receiptOcr'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
const MIN_PDF_TEXT_CHARS = 24

export async function extractReceiptFromPdf(file: File, onProgress?: (pct: number) => void): Promise<string> {
  if (file.size > 25 * 1024 * 1024) throw new Error('PDF ist zu groß (maximal 25 MB).')
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = pdfWorker
  const pdf = await getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    useWorkerFetch: false,
    isEvalSupported: false,
  }).promise
  let engine: Awaited<ReturnType<typeof createReceiptOcr>> | undefined
  let activePage = 0
  try {
    if (pdf.numPages > 20) throw new Error('Bitte höchstens 20 PDF-Seiten auf einmal importieren.')
    let text = ''
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum)
      try {
        const content = await page.getTextContent()
        const pageText = content.items
          .map((item) => ('str' in item ? item.str : ''))
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim()
        if (pageText) text += `${pageText}\n`
      } finally {
        page.cleanup()
      }
      onProgress?.(Math.round((pageNum / pdf.numPages) * 40))
    }
    if (text.replace(/\s/g, '').length >= MIN_PDF_TEXT_CHARS) {
      onProgress?.(100)
      return text.trim()
    }
    engine = await createReceiptOcr((pct) =>
      onProgress?.(Math.round(40 + ((activePage + pct / 100) / pdf.numPages) * 60))
    )
    let ocrText = ''
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      activePage = pageNum - 1
      const page = await pdf.getPage(pageNum)
      const canvas = document.createElement('canvas')
      try {
        const original = page.getViewport({ scale: 1 })
        const viewport = page.getViewport({
          scale: Math.min(2, 2400 / Math.max(original.width, original.height)),
        })
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        const context = canvas.getContext('2d')
        if (!context) throw new Error('PDF-Seite konnte nicht als Bild gelesen werden.')
        await page.render({ canvasContext: context, viewport }).promise
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
        if (!blob) throw new Error('PDF-Seite konnte nicht verarbeitet werden.')
        const result = await engine.recognize(blob)
        if (result.trim()) ocrText += `${result.trim()}\n`
      } finally {
        page.cleanup()
        canvas.width = 0
        canvas.height = 0
      }
    }
    onProgress?.(100)
    return ocrText.trim()
  } finally {
    try {
      await engine?.close()
    } finally {
      await pdf.destroy()
    }
  }
}
export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}
