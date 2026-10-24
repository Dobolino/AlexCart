import { useEffect, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { useStore } from '@/store/useStore'
import { CATEGORIES } from '@/data/products'
import { normalizeGtin, expandUpce } from '@/utils/barcode'
import { lookupProduct } from '@/services/products'
import { quantityText } from '@/utils/quantity'
import { uid } from '@/utils/id'
import type { CatalogProduct } from '@/types/catalog'

type NativeDetector = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string; format: string }>>
}
type NativeConstructor = {
  new (options: { formats: string[] }): NativeDetector
  getSupportedFormats: () => Promise<string[]>
}

export function BarcodeScannerSheet({
  onClose,
  onAdded,
}: {
  onClose: () => void
  onAdded?: (name: string) => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const stop = useRef<() => void>(() => {})
  const controller = useRef<AbortController | null>(null)
  const accepted = useRef(false)
  const added = useRef(false)
  const [generation, setGeneration] = useState(0)
  const [message, setMessage] = useState('Kamera startet…')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('1 Stk')
  const [category, setCategory] = useState('Sonstiges')
  const [product, setProduct] = useState<CatalogProduct | null>(null)
  const [torch, setTorch] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [busy, setBusy] = useState(false)

  async function accept(raw: string, format?: string) {
    if (accepted.current) return
    accepted.current = true
    stop.current()
    setCameraActive(false)
    const normalizedRaw = format === 'upc_e' ? (expandUpce(raw) ?? raw) : raw.replace(/[\s-]/g, '')
    setCode(normalizedRaw)
    setBusy(true)
    setMessage('Produkt wird gesucht…')
    controller.current?.abort()
    controller.current = new AbortController()
    try {
      const state = useStore.getState()
      const found = await lookupProduct(
        normalizedRaw,
        state.settings.apiUrl ?? '',
        state.catalog,
        controller.current.signal
      )
      if (controller.current.signal.aborted) return
      setProduct(found)
      if (found) {
        setName(found.name)
        setCategory(found.category)
        setAmount(found.netQuantity ? `1 × ${quantityText(found.netQuantity)}` : '1 Stk')
        setMessage(
          found.source === 'open-food-facts'
            ? 'Produktdaten: Open Food Facts. Bitte prüfen.'
            : 'Produkt aus deinem Katalog.'
        )
      } else
        setMessage(
          'Noch nicht im Katalog. Trage den Namen ein; das Produkt bleibt danach auch offline verfügbar.'
        )
    } catch (error) {
      if (!controller.current.signal.aborted)
        setMessage(
          `${error instanceof Error ? error.message : 'Produktsuche nicht erreichbar.'} Du kannst das Produkt manuell speichern.`
        )
    } finally {
      setBusy(false)
    }
  }
  const acceptRef = useRef(accept)
  useEffect(() => {
    acceptRef.current = accept
  })

  useEffect(() => {
    let disposed = false
    let timer = 0
    let stopDecoder = () => {}
    accepted.current = false
    function shutdown() {
      clearTimeout(timer)
      stopDecoder()
      const stream = video.current?.srcObject as MediaStream | null
      stream?.getTracks().forEach((track) => track.stop())
      if (video.current) video.current.srcObject = null
    }
    stop.current = shutdown
    const hidden = () => {
      if (document.hidden) {
        shutdown()
        setCameraActive(false)
        setMessage('Kamera pausiert. Du kannst sie erneut starten oder den Code eintippen.')
      }
    }
    document.addEventListener('visibilitychange', hidden)
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia)
          throw new Error('Kamera hier nicht verfügbar. Bitte HTTPS verwenden oder den Code eintippen.')
        const Native = (window as unknown as { BarcodeDetector?: NativeConstructor }).BarcodeDetector
        let supported: string[] = []
        try {
          supported = Native ? await Native.getSupportedFormats() : []
        } catch {
          /* use the bundled decoder */
        }
        if (disposed) return
        if (Native && supported.includes('ean_13')) {
          const formats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'].filter((f) => supported.includes(f))
          const detector = new Native({ formats })
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          })
          if (disposed) {
            stream.getTracks().forEach((t) => t.stop())
            return
          }
          video.current!.srcObject = stream
          await video.current!.play()
          const scan = async () => {
            if (disposed || accepted.current || !video.current?.srcObject) return
            try {
              const results = await detector.detect(video.current)
              if (results[0]) {
                await acceptRef.current(results[0].rawValue, results[0].format)
                return
              }
            } catch {
              /* a frame may not yet be ready */
            }
            timer = window.setTimeout(() => void scan(), 300)
          }
          void scan()
        } else {
          const { BrowserMultiFormatOneDReader, BarcodeFormat } = await import('@zxing/browser')
          if (disposed) return
          const reader = new BrowserMultiFormatOneDReader(undefined, {
            delayBetweenScanAttempts: 300,
            delayBetweenScanSuccess: 1000,
          })
          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: 'environment' } }, audio: false },
            video.current!,
            (result) => {
              if (result && !disposed)
                void acceptRef.current(
                  result.getText(),
                  result.getBarcodeFormat() === BarcodeFormat.UPC_E ? 'upc_e' : undefined
                )
            }
          )
          stopDecoder = () => controls.stop()
          if (disposed || accepted.current) {
            shutdown()
            return
          }
        }
        setCameraActive(true)
        setMessage('Halte den Barcode ruhig vor die Rückkamera.')
      } catch {
        if (!disposed) {
          shutdown()
          setCameraActive(false)
          setMessage(
            'Kamera konnte nicht gestartet werden. Bitte Berechtigung prüfen, ein Bild wählen oder den Code eintippen.'
          )
        }
      }
    }
    void start()
    return () => {
      disposed = true
      shutdown()
      controller.current?.abort()
      document.removeEventListener('visibilitychange', hidden)
    }
  }, [generation])

  function add() {
    if (added.current || !name.trim()) return
    added.current = true
    const gtin = normalizeGtin(code)
    const selected: CatalogProduct = product
      ? { ...product, name: name.trim(), category }
      : {
          id: gtin ? `gtin:${gtin}` : uid(),
          gtins: gtin ? [...new Set([code, gtin])] : [],
          name: name.trim(),
          category,
          source: 'manual',
          updatedAt: new Date().toISOString(),
        }
    const state = useStore.getState()
    state.upsertProduct(selected)
    state.addItemToActiveList({
      name: selected.name,
      category,
      amount,
      productId: selected.id,
      barcode: code || undefined,
    })
    onAdded?.(selected.name)
    onClose()
  }
  return (
    <Sheet onClose={onClose} tall>
      <h2 className="mb-2 text-xl font-bold">Barcode scannen</h2>
      <div className="min-h-0 flex-1 overflow-y-auto pb-2">
        <video
          ref={video}
          playsInline
          muted
          className="h-40 w-full rounded-2xl bg-black object-cover"
          aria-label="Kameravorschau für Barcode"
        />
        <p role="status" className="my-3 text-sm">
          {message}
        </p>
        <div className="mb-3 flex gap-2">
          <button
            className="btn-soft min-h-11 flex-1 px-2"
            onClick={() => {
              accepted.current = false
              setGeneration((n) => n + 1)
            }}
          >
            Kamera neu starten
          </button>
          {cameraActive && (
            <button
              className="btn-soft min-h-11 px-3"
              onClick={async () => {
                const track = (video.current?.srcObject as MediaStream | null)?.getVideoTracks()[0]
                if (!(track?.getCapabilities() as MediaTrackCapabilities & { torch?: boolean })?.torch) {
                  setMessage('Diese Kamera unterstützt kein Licht.')
                  return
                }
                try {
                  await track!.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] })
                  setTorch(!torch)
                } catch {
                  setMessage('Licht konnte nicht geschaltet werden.')
                }
              }}
            >
              Licht
            </button>
          )}
          <label className="btn-soft flex min-h-11 items-center px-3">
            Bild wählen
            <input
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                if (file.size > 15 * 1024 * 1024) {
                  setMessage('Bild ist zu groß (maximal 15 MB).')
                  return
                }
                const url = URL.createObjectURL(file)
                try {
                  const { BrowserMultiFormatOneDReader, BarcodeFormat } = await import('@zxing/browser')
                  const result = await new BrowserMultiFormatOneDReader().decodeFromImageUrl(url)
                  accepted.current = false
                  await accept(
                    result.getText(),
                    result.getBarcodeFormat() === BarcodeFormat.UPC_E ? 'upc_e' : undefined
                  )
                } catch {
                  setMessage('Kein lesbarer Barcode gefunden. Bitte Code eintippen.')
                } finally {
                  URL.revokeObjectURL(url)
                }
              }}
            />
          </label>
        </div>
        <label className="block text-sm font-bold">
          Barcode
          <input
            className="input my-1 w-full"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
        <button
          disabled={!code || busy}
          className="btn-soft my-2 min-h-11 w-full"
          onClick={() => {
            accepted.current = false
            void accept(code)
          }}
        >
          Produkt suchen
        </button>
        <label className="block text-sm font-bold">
          Produktname
          <input className="input my-1 w-full" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="block text-sm font-bold">
          Menge
          <input className="input my-1 w-full" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <label className="block text-sm font-bold">
          Kategorie
          <select
            className="input my-1 w-full"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <button disabled={!name.trim() || busy} className="btn-primary mt-3 min-h-12" onClick={add}>
        Zur Liste hinzufügen
      </button>
    </Sheet>
  )
}
