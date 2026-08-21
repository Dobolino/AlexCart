import { useMemo, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { STORE_PRESETS } from '@/constants/stores'
import { buildClaudeReceiptPrompt } from '@/utils/claudeReceiptPrompt'
import { formatMoney } from '@/utils/currency'
import { isReceiptImageFile, ocrReceiptImage, readTextFile } from '@/utils/receiptOcr'
import { parseReceiptInput, type ReceiptLineItem } from '@/utils/receiptParse'
import { useStore } from '@/store/useStore'
import type { Currency } from '@/types'

type ReceiptMode = 'create' | 'prices'
type Step = 'setup' | 'review'

interface ReceiptImportSheetProps {
  onClose: () => void
  onDone: (message: string) => void
}

export function ReceiptImportSheet({ onClose, onDone }: ReceiptImportSheetProps) {
  const currency = useStore((s) => s.settings.currency)
  const applyReceiptImport = useStore((s) => s.applyReceiptImport)

  const [store, setStore] = useState<string>(STORE_PRESETS[0])
  const [mode, setMode] = useState<ReceiptMode>('prices')
  const [step, setStep] = useState<Step>('setup')
  const [text, setText] = useState('')
  const [items, setItems] = useState<ReceiptLineItem[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ocrPct, setOcrPct] = useState<number | null>(null)
  const [promptCopied, setPromptCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const prompt = useMemo(() => buildClaudeReceiptPrompt(store), [store])
  const total = useMemo(
    () => Math.round(items.reduce((s, i) => s + i.price, 0) * 100) / 100,
    [items]
  )

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError('')
    setBusy(true)
    setOcrPct(null)
    try {
      if (isReceiptImageFile(file)) {
        setOcrPct(0)
        const ocrText = await ocrReceiptImage(file, setOcrPct)
        setText(ocrText)
        const parsed = parseReceiptInput(ocrText, store)
        if (!parsed.items.length) {
          setError('Kein Artikel erkannt – Text prüfen oder Claude-Prompt nutzen.')
        } else {
          setItems(parsed.items)
          setStep('review')
        }
      } else if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)) {
        const pdfText = await readTextFile(file).catch(() => '')
        if (pdfText && pdfText.length > 40 && !pdfText.includes('%PDF')) {
          setText(pdfText)
          const parsed = parseReceiptInput(pdfText, store)
          if (parsed.items.length) {
            setItems(parsed.items)
            setStep('review')
          } else {
            setError('PDF ohne lesbaren Text – Foto vom Bon oder Text einfügen.')
          }
        } else {
          setError('PDF-Scan: bitte Foto vom Bon machen oder Text / Claude-JSON einfügen.')
        }
      } else {
        const content = await readTextFile(file)
        setText(content)
        goParse(content)
      }
    } catch (err) {
      console.error(err)
      setError('Datei konnte nicht gelesen werden.')
    } finally {
      setBusy(false)
      setOcrPct(null)
    }
  }

  function goParse(source = text) {
    setError('')
    const parsed = parseReceiptInput(source, store)
    if (!parsed.items.length) {
      setError('Keine Artikel gefunden. JSON oder Bon-Text prüfen.')
      return
    }
    setItems(parsed.items)
    setStep('review')
  }

  function toggleItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  function apply() {
    if (!items.length) return
    const result = applyReceiptImport({ store, mode, items })
    if (!result.ok) {
      setError(result.error || 'Import fehlgeschlagen.')
      return
    }
    onDone(result.message)
    onClose()
  }

  return (
    <Sheet onClose={onClose} tall>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-1 pb-4">
        <h2 className="mb-1 text-lg font-bold">Kassenbon importieren</h2>
        <p className="mb-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Foto oder Text vom Bon – Preise in AlexShop übernehmen oder Liste anlegen.
        </p>

        {step === 'setup' && (
          <>
            <div className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
              Filiale
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {STORE_PRESETS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="tap-scale rounded-full px-3 py-1.5 text-[13px] font-bold"
                  style={{
                    background: store === s ? 'var(--accent-soft)' : 'var(--chip-bg)',
                    color: store === s ? 'var(--accent)' : 'var(--text)',
                    outline: store === s ? '2px solid var(--accent)' : 'none',
                  }}
                  onClick={() => setStore(s)}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
              Ziel
            </div>
            <div className="mb-3 flex flex-col gap-1.5">
              {(
                [
                  ['prices', 'Preise aktualisieren', 'Passt erkannte Artikel an die aktuelle Liste / Preisgedächtnis'],
                  ['create', 'Liste anlegen', 'Übernimmt Bon-Artikel als neue Listeneinträge'],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  className="tap-scale rounded-xl px-3.5 py-2.5 text-left"
                  style={{
                    background: mode === value ? 'var(--accent-soft)' : 'var(--chip-bg)',
                    outline: mode === value ? '2px solid var(--accent)' : 'none',
                  }}
                  onClick={() => setMode(value)}
                >
                  <div className="text-[14px] font-bold">{label}</div>
                  <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {hint}
                  </div>
                </button>
              ))}
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf,text/plain,.json"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <button
              type="button"
              className="btn-primary mb-2 flex w-full items-center justify-center gap-2 py-3.5 text-[15px]"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Icon path={ICON_PATHS.import} size={18} />
              {busy ? (ocrPct != null ? `Erkenne Text… ${ocrPct}%` : 'Lade…') : 'Foto / PDF wählen'}
            </button>

            <details className="mb-3 rounded-xl px-3.5 py-3 text-[12px]" style={{ background: 'var(--chip-bg)' }}>
              <summary className="cursor-pointer font-bold" style={{ color: 'var(--text)' }}>
                Claude-Prompt für den Bon
              </summary>
              <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
                Prompt kopieren, mit Bon-Foto an Claude senden, JSON hier einfügen – oft genauer als OCR.
              </p>
              <button
                type="button"
                className="btn-soft tap-scale mt-2 flex w-full items-center justify-center gap-2 py-2.5 text-[13px] font-bold"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(prompt)
                    setPromptCopied(true)
                    window.setTimeout(() => setPromptCopied(false), 2000)
                  } catch {
                    setError('Kopieren nicht möglich.')
                  }
                }}
              >
                <Icon path={ICON_PATHS.copy} size={15} />
                {promptCopied ? 'Kopiert' : 'Prompt kopieren'}
              </button>
            </details>

            <div className="mb-1 text-[12px] font-bold" style={{ color: 'var(--text-muted)' }}>
              Oder Bon-Text / JSON einfügen
            </div>
            <textarea
              className="input min-h-[140px] font-mono text-[13px]"
              placeholder={'Banane 1.20\n2 x Cottage Cheese 3.60\n… oder Claude-JSON'}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setError('')
              }}
            />
            <div className="mt-2 min-h-[16px] text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
            <button className="btn-primary mt-2 w-full py-3.5 text-[15px]" onClick={() => goParse()} disabled={busy}>
              Erkennen
            </button>
          </>
        )}

        {step === 'review' && (
          <>
            <button
              type="button"
              className="mb-2 text-left text-[13px] font-bold"
              style={{ color: 'var(--accent)' }}
              onClick={() => setStep('setup')}
            >
              ← Zurück
            </button>
            <div className="mb-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {store} · {items.length} Positionen · {mode === 'prices' ? 'Preise aktualisieren' : 'Liste anlegen'}
            </div>
            <div className="mb-3 flex flex-col gap-1.5">
              {items.map((item, index) => (
                <ReceiptReviewRow
                  key={`${item.name}-${index}`}
                  item={item}
                  currency={currency}
                  onRemove={() => toggleItem(index)}
                />
              ))}
            </div>
            <div
              className="mb-3 flex items-center justify-between rounded-xl px-3.5 py-3"
              style={{ background: 'var(--chip-bg)' }}
            >
              <span className="text-[14px] font-bold">Summe erkannt</span>
              <span className="text-[16px] font-extrabold tabular-nums">{formatMoney(total, currency)}</span>
            </div>
            <div className="min-h-[16px] text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
              {error}
            </div>
            <button className="btn-primary mt-1 w-full py-3.5 text-[15px]" onClick={apply}>
              {mode === 'prices' ? 'Preise übernehmen' : 'Liste übernehmen'}
            </button>
          </>
        )}
      </div>
    </Sheet>
  )
}

function ReceiptReviewRow({
  item,
  currency,
  onRemove,
}: {
  item: ReceiptLineItem
  currency: Currency
  onRemove: () => void
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold">{item.name}</div>
        <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {item.amount || item.category}
          {item.wasSale ? ' · Aktion' : ''}
        </div>
      </div>
      <span className="flex-none text-[14px] font-extrabold tabular-nums">{formatMoney(item.price, currency)}</span>
      <button type="button" className="tap-scale flex h-8 w-8 items-center justify-center" style={{ color: 'var(--danger)' }} onClick={onRemove} aria-label="Entfernen">
        <Icon path={ICON_PATHS.close} size={16} />
      </button>
    </div>
  )
}
