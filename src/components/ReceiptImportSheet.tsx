import { useMemo, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { mergeStoreOptions, STORE_PRESETS } from '@/constants/stores'
import { buildClaudeReceiptPrompt } from '@/utils/claudeReceiptPrompt'
import { formatMoney } from '@/utils/currency'
import { todayKey } from '@/utils/date'
import { isReceiptImageFile, ocrReceiptImage, readTextFile } from '@/utils/receiptOcr'
import { parseReceiptInput, type ReceiptLineItem } from '@/utils/receiptParse'
import { useStore } from '@/store/useStore'
import type { Currency } from '@/types'

type ReceiptTarget = 'existing' | 'new'
type Step = 'setup' | 'review'

interface ReceiptImportSheetProps {
  onClose: () => void
  onDone: (message: string) => void
}

function defaultNewListName(store: string): string {
  const date = todayKey().split('-').reverse().join('.')
  const label = store.trim() || 'Kassenbon'
  return `${label} ${date}`
}

export function ReceiptImportSheet({ onClose, onDone }: ReceiptImportSheetProps) {
  const currency = useStore((s) => s.settings.currency)
  const customStores = useStore((s) => s.settings.customStores ?? [])
  const lists = useStore((s) => s.lists)
  const activeListId = useStore((s) => s.activeListId)
  const addCustomStore = useStore((s) => s.addCustomStore)
  const removeCustomStore = useStore((s) => s.removeCustomStore)
  const applyReceiptImport = useStore((s) => s.applyReceiptImport)

  const storeOptions = useMemo(() => mergeStoreOptions(customStores), [customStores])
  const [store, setStore] = useState<string>(STORE_PRESETS[0])
  const [newStore, setNewStore] = useState('')
  const [target, setTarget] = useState<ReceiptTarget>('existing')
  const [listId, setListId] = useState<string>(activeListId || lists[0]?.id || '')
  const [newListName, setNewListName] = useState(() => defaultNewListName(STORE_PRESETS[0]))
  const [addMissingItems, setAddMissingItems] = useState(false)
  const [step, setStep] = useState<Step>('setup')
  const [text, setText] = useState('')
  const [items, setItems] = useState<ReceiptLineItem[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ocrPct, setOcrPct] = useState<number | null>(null)
  const [promptCopied, setPromptCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const prompt = useMemo(() => buildClaudeReceiptPrompt(store, customStores), [store, customStores])
  const total = useMemo(
    () => Math.round(items.reduce((s, i) => s + i.price, 0) * 100) / 100,
    [items]
  )

  function selectStore(name: string) {
    setStore(name)
    if (target === 'new') {
      setNewListName(defaultNewListName(name))
    }
  }

  function submitNewStore() {
    const trimmed = newStore.trim()
    if (!trimmed) return
    addCustomStore(trimmed)
    selectStore(trimmed)
    setNewStore('')
  }

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
    if (target === 'existing' && !listId) {
      setError('Bitte eine bestehende Liste wählen.')
      return
    }
    if (store.trim()) addCustomStore(store)
    const result = applyReceiptImport({
      store,
      target,
      listId: target === 'existing' ? listId : undefined,
      newListName: target === 'new' ? newListName : undefined,
      addMissingItems: target === 'existing' ? addMissingItems : undefined,
      items,
    })
    if (!result.ok) {
      setError(result.error || 'Import fehlgeschlagen.')
      return
    }
    onDone(result.message)
    onClose()
  }

  const selectedListName = lists.find((l) => l.id === listId)?.name

  return (
    <Sheet onClose={onClose} tall>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-1 pb-4">
        <h2 className="mb-1 text-lg font-bold">Kassenbon importieren</h2>
        <p className="mb-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Foto oder PDF vom Bon – mit einer Liste abgleichen oder als neuen Kassenbon anlegen.
        </p>

        {step === 'setup' && (
          <>
            <div className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
              Kette / Filiale
            </div>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {storeOptions.map((s) => {
                const isCustom = !(STORE_PRESETS as readonly string[]).includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    className="tap-scale inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-bold"
                    style={{
                      background: store === s ? 'var(--accent-soft)' : 'var(--chip-bg)',
                      color: store === s ? 'var(--accent)' : 'var(--text)',
                      outline: store === s ? '2px solid var(--accent)' : 'none',
                    }}
                    onClick={() => selectStore(s)}
                  >
                    {s}
                    {isCustom ? (
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-0.5 opacity-60"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeCustomStore(s)
                          if (store === s) selectStore(STORE_PRESETS[0])
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.stopPropagation()
                            removeCustomStore(s)
                            if (store === s) selectStore(STORE_PRESETS[0])
                          }
                        }}
                        aria-label={`${s} entfernen`}
                      >
                        ×
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
            <div className="mb-3 flex gap-2">
              <input
                type="text"
                className="input min-w-0 flex-1 py-2.5 text-[14px]"
                placeholder="Neue Kette / Einkaufszentrum…"
                value={newStore}
                onChange={(e) => setNewStore(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    submitNewStore()
                  }
                }}
              />
              <button
                type="button"
                className="btn-soft tap-scale shrink-0 px-3.5 py-2.5 text-[13px] font-bold"
                onClick={submitNewStore}
                disabled={!newStore.trim()}
              >
                Hinzufügen
              </button>
            </div>

            <div className="mb-2 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
              Kassenbon zuordnen
            </div>
            <div className="mb-2 flex flex-col gap-1.5">
              {(
                [
                  [
                    'existing',
                    'Bestehende Liste abgleichen',
                    'Prüft den Bon gegen eine vorhandene Einkaufsliste und speichert die Preise',
                  ],
                  [
                    'new',
                    'Neuen Kassenbon anlegen',
                    'Erstellt eine neue Liste aus dem Bon und legt die Quittung an',
                  ],
                ] as const
              ).map(([value, label, hint]) => (
                <button
                  key={value}
                  type="button"
                  className="tap-scale rounded-xl px-3.5 py-2.5 text-left"
                  style={{
                    background: target === value ? 'var(--accent-soft)' : 'var(--chip-bg)',
                    outline: target === value ? '2px solid var(--accent)' : 'none',
                  }}
                  onClick={() => {
                    setTarget(value)
                    if (value === 'new') setNewListName(defaultNewListName(store))
                  }}
                >
                  <div className="text-[14px] font-bold">{label}</div>
                  <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {hint}
                  </div>
                </button>
              ))}
            </div>

            {target === 'existing' && (
              <div className="mb-3">
                <div className="mb-1.5 text-[12px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  Welche Liste?
                </div>
                <select
                  className="input w-full py-3 text-[14px] font-semibold"
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                >
                  {lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                      {l.id === activeListId ? ' (aktuell)' : ''}
                    </option>
                  ))}
                </select>
                <label className="mt-2 flex items-start gap-2.5 px-0.5 text-[13px]">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={addMissingItems}
                    onChange={(e) => setAddMissingItems(e.target.checked)}
                  />
                  <span style={{ color: 'var(--text-muted)' }}>
                    Fehlende Bon-Artikel auch auf die Liste setzen
                  </span>
                </label>
              </div>
            )}

            {target === 'new' && (
              <div className="mb-3">
                <div className="mb-1.5 text-[12px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  Name des neuen Kassenbons
                </div>
                <input
                  type="text"
                  className="input w-full py-3 text-[14px] font-semibold"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="z. B. Migros 21.08.2026"
                />
              </div>
            )}

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
              {store}
              {' · '}
              {target === 'new'
                ? `Neuer Kassenbon „${newListName.trim() || defaultNewListName(store)}"`
                : `Abgleich „${selectedListName || 'Liste'}"`}
              {' · '}
              {items.length} Positionen
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
              {target === 'new' ? 'Neuen Kassenbon anlegen' : 'Liste abgleichen'}
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
