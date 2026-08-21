/** Lazy OCR für Kassenbon-Fotos (Tesseract, Deutsch). */
export async function ocrReceiptImage(file: Blob, onProgress?: (pct: number) => void): Promise<string> {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('deu', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number' && onProgress) {
        onProgress(Math.round(m.progress * 100))
      }
    },
  })
  try {
    const result = await worker.recognize(file)
    return result.data.text || ''
  } finally {
    await worker.terminate()
  }
}

export function isReceiptImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|gif)$/i.test(file.name)
}

export async function readTextFile(file: File): Promise<string> {
  return file.text()
}
