/** A worker is scoped to one import, so pages share language initialization. */
export async function createReceiptOcr(onProgress?: (pct: number) => void, signal?: AbortSignal) {
  const abortReason = () =>
    signal?.reason instanceof Error
      ? signal.reason
      : new DOMException('Texterkennung abgebrochen.', 'AbortError')
  if (signal?.aborted) throw abortReason()
  const { createWorker } = await import('tesseract.js')
  if (signal?.aborted) throw abortReason()
  const pending = createWorker('deu', 1, {
    logger: (message) => {
      if (!signal?.aborted && message.status === 'recognizing text' && typeof message.progress === 'number')
        onProgress?.(Math.round(message.progress * 100))
    },
  })
  let worker: Awaited<typeof pending> | undefined
  let closed = false
  async function close() {
    if (closed || !worker) return
    closed = true
    await worker.terminate()
  }
  let rejectAbort: (reason: Error) => void = () => {}
  const aborted = new Promise<never>((_, reject) => {
    rejectAbort = reject
  })
  const onAbort = () => {
    rejectAbort(abortReason())
    void close().catch(() => {})
  }
  signal?.addEventListener('abort', onAbort, { once: true })
  try {
    worker = await Promise.race([pending, aborted])
    await Promise.race([
      worker.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '300' }),
      aborted,
    ])
    return {
      recognize: async (file: Blob) => {
        if (closed || signal?.aborted) throw abortReason()
        return (await Promise.race([worker!.recognize(file), aborted])).data.text || ''
      },
      close: async () => {
        signal?.removeEventListener('abort', onAbort)
        await close()
      },
    }
  } catch (error) {
    signal?.removeEventListener('abort', onAbort)
    if (worker) await close().catch(() => {})
    else void pending.then((lateWorker) => lateWorker.terminate()).catch(() => {})
    throw error
  }
}
export async function ocrReceiptImage(
  file: Blob,
  onProgress?: (pct: number) => void,
  signal?: AbortSignal
): Promise<string> {
  const controller = new AbortController()
  const cancel = () => controller.abort(signal?.reason)
  if (signal?.aborted) cancel()
  else signal?.addEventListener('abort', cancel, { once: true })
  const timeout = setTimeout(
    () =>
      controller.abort(
        new DOMException(
          'Texterkennung dauert zu lange. Bitte ein scharfes Foto oder Bon-Text verwenden.',
          'TimeoutError'
        )
      ),
    120000
  )
  let engine: Awaited<ReturnType<typeof createReceiptOcr>> | undefined
  try {
    engine = await createReceiptOcr(onProgress, controller.signal)
    return await engine.recognize(file)
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', cancel)
    await engine?.close()
  }
}
export function isReceiptImageFile(file: File): boolean {
  return file.type.startsWith('image/') || /\.(jpe?g|png|webp|heic|heif|gif)$/i.test(file.name)
}
export async function readTextFile(file: File): Promise<string> {
  return file.text()
}
