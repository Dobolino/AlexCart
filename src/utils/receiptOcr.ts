/** A worker is scoped to one import, so pages share language initialization. */
export async function createReceiptOcr(onProgress?: (pct: number) => void) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('deu', 1, {
    logger: (message) => {
      if (message.status === 'recognizing text' && typeof message.progress === 'number')
        onProgress?.(Math.round(message.progress * 100))
    },
  })
  return {
    recognize: async (file: Blob) => (await worker.recognize(file)).data.text || '',
    close: async () => {
      await worker.terminate()
    },
  }
}
export async function ocrReceiptImage(file: Blob, onProgress?: (pct: number) => void): Promise<string> {
  const engine = await createReceiptOcr(onProgress)
  try {
    return await engine.recognize(file)
  } finally {
    await engine.close()
  }
}
export function isReceiptImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|gif)$/i.test(file.name)
}
export async function readTextFile(file: File): Promise<string> {
  return file.text()
}
