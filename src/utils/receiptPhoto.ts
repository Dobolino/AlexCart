/** Bound OCR working memory while retaining the full receipt; no photo leaves the device. */
export async function prepareReceiptPhoto(file: File, signal: AbortSignal): Promise<Blob> {
  if (file.size > 25 * 1024 * 1024) throw new Error('Das Bild ist zu groß (maximal 25 MB).')
  const url = URL.createObjectURL(file)
  const picture = new Image()
  const abort = () => {
    picture.src = ''
    rejectImage(new DOMException('Bildverarbeitung abgebrochen.', 'AbortError'))
  }
  let rejectImage: (reason: Error) => void = () => {}
  try {
    await new Promise<void>((resolve, reject) => {
      rejectImage = reject
      picture.onload = () => resolve()
      picture.onerror = () =>
        reject(new Error('Bild nicht lesbar. Bitte ein JPEG-, PNG- oder WebP-Foto verwenden.'))
      signal.addEventListener('abort', abort, { once: true })
      if (signal.aborted) {
        abort()
        return
      }
      picture.src = url
    })
    if (signal.aborted) throw new DOMException('Bildverarbeitung abgebrochen.', 'AbortError')
    const { naturalWidth: width, naturalHeight: height } = picture
    if (!width || !height) throw new Error('Das Bild hat keine lesbare Größe.')
    const scale = Math.min(1, 1600 / width, Math.sqrt(6000000 / (width * height)))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    try {
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Das Bild konnte nicht vorbereitet werden.')
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(picture, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.94))
      if (!blob) throw new Error('Das Bild konnte nicht verarbeitet werden.')
      if (signal.aborted) throw new DOMException('Bildverarbeitung abgebrochen.', 'AbortError')
      return blob
    } finally {
      canvas.width = 0
      canvas.height = 0
    }
  } finally {
    signal.removeEventListener('abort', abort)
    picture.onload = null
    picture.onerror = null
    URL.revokeObjectURL(url)
  }
}
