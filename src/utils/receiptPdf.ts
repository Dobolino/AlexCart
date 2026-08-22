import { ocrReceiptImage } from '@/utils/receiptOcr'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

const MIN_PDF_TEXT_CHARS = 24

/** Text aus PDF extrahieren (Text-PDFs). Bei Scan-PDFs: Seiten rendern und OCR. */
export async function extractReceiptFromPdf(
  file: File,
  onProgress?: (pct: number) => void
): Promise<string> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = pdfWorker

  const data = new Uint8Array(await file.arrayBuffer())
  const pdf = await getDocument({ data, useWorkerFetch: false, isEvalSupported: false }).promise

  let text = ''
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (pageText) text += `${pageText}\n`
    if (onProgress) onProgress(Math.round((pageNum / pdf.numPages) * 40))
  }

  if (text.replace(/\s/g, '').length >= MIN_PDF_TEXT_CHARS) {
    if (onProgress) onProgress(100)
    return text.trim()
  }

  // Scan-PDF ohne Textschicht → Seiten als Bild OCR
  let ocrText = ''
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) continue
    await page.render({ canvasContext: ctx, viewport }).promise

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
    if (!blob) continue

    const pagePctBase = 40 + Math.round(((pageNum - 1) / pdf.numPages) * 60)
    const pageText = await ocrReceiptImage(blob, (pct) => {
      if (onProgress) {
        const slice = 60 / pdf.numPages
        onProgress(Math.round(pagePctBase + (pct / 100) * slice))
      }
    })
    if (pageText.trim()) ocrText += `${pageText.trim()}\n`
  }

  if (onProgress) onProgress(100)
  return ocrText.trim()
}

export function isPdfFile(file: File): boolean {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
}
