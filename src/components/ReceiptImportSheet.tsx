import type { ReactNode } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { OptionCard } from './OptionCard'
import { ICON_PATHS } from '@/constants/icons'
import { mergeStoreOptions, STORE_PRESETS } from '@/constants/stores'
import { buildClaudeReceiptPrompt } from '@/utils/claudeReceiptPrompt'
import { formatMoney } from '@/utils/currency'
import { todayKey, findReceiptDateInText, formatDateKeyDe, timestampToDateKey } from '@/utils/date'
import { tripTotalSpent } from '@/utils/stats'
import { isReceiptImageFile, ocrReceiptImage, readTextFile } from '@/utils/receiptOcr'
import { extractReceiptFromPdf, isPdfFile } from '@/utils/receiptPdf'
import { parseReceiptInput, type ReceiptLineItem } from '@/utils/receiptParse'
import { useStore } from '@/store/useStore'
import type { Currency } from '@/types'

type ReceiptTarget = 'existing' | 'trip' | 'new'
type Step = 'setup' | 'review'

interface ReceiptImportSheetProps {
  onClose: () => void
  onDone: (message: string) => void
}

function defaultNewListName(store: string): string {
  return store.trim() || 'Kassenbon'
}

export function ReceiptImportSheet({ onClose, onDone }: ReceiptImportSheetProps) {
  const currency = useStore((s) => s.settings.currency)
  const customStores = useStore((s) => s.settings.customStores ?? [])
  const lists = useStore((s) => s.lists)
  const completedTrips = useStore((s) => s.completedTrips)
  const activeListId = useStore((s) => s.activeListId)
  const addCustomStore = useStore((s) => s.addCustomStore)
  const removeCustomStore = useStore((s) => s.removeCustomStore)
  const applyReceiptImport = useStore((s) => s.applyReceiptImport)

  const storeOptions = useMemo(() => mergeStoreOptions(customStores), [customStores])
  const [store, setStore] = useState<string>(STORE_PRESETS[0])
  const [newStore, setNewStore] = useState('')
  const [target, setTarget] = useState<ReceiptTarget>(() =>
    completedTrips.length > 0 ? 'trip' : 'existing'
  )
  const [listId, setListId] = useState<string>(activeListId || lists[0]?.id || '')
  const [tripId, setTripId] = useState<string>(completedTrips[0]?.id || '')
  const [newListName, setNewListName] = useState(() => defaultNewListName(STORE_PRESETS[0]))
  const [purchaseDate, setPurchaseDate] = useState(todayKey)
  const [addMissingItems, setAddMissingItems] = useState(false)
  const [addMissingTripItems, setAddMissingTripItems] = useState(true)
  const [step, setStep] = useState<Step>('setup')
  const [text, setText] = useState('')
  const [items, setItems] = useState<ReceiptLineItem[]>([])
  const [error, setError] = useState('')
  const [showAiHelp, setShowAiHelp] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progressPct, setProgressPct] = useState<number | null>(null)
  const [progressLabel, setProgressLabel] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const prompt = useMemo(() => buildClaudeReceiptPrompt(store, customStores), [store, customStores])
  const total = useMemo(
    () => Math.round(items.reduce((s, i) => s + i.price, 0) * 100) / 100,
    [items]
  )

  useEffect(() => {
    if (!lists.length) return
    if (!listId || !lists.some((l) => l.id === listId)) {
      setListId(activeListId || lists[0]!.id)
    }
  }, [lists, listId, activeListId])

  useEffect(() => {
    if (!completedTrips.length) {
      if (tripId) setTripId('')
      return
    }
    if (!tripId || !completedTrips.some((t) => t.id === tripId)) {
      setTripId(completedTrips[0]!.id)
    }
  }, [completedTrips, tripId])

  function selectStore(name: string) {
    setStore(name)
    if (target === 'new') setNewListName(defaultNewListName(name))
  }

  function selectTrip(id: string) {
    setTripId(id)
    const trip = completedTrips.find((t) => t.id === id)
    if (!trip) return
    if (trip.store?.trim()) setStore(trip.store.trim())
    setPurchaseDate(timestampToDateKey(trip.completedAt))
  }

  function submitNewStore() {
    const trimmed = newStore.trim()
    if (!trimmed) return
    addCustomStore(trimmed)
    selectStore(trimmed)
    setNewStore('')
  }

  function failParse(message: string) {
    setError(message)
    setShowAiHelp(true)
  }

  function applyParsedText(source: string) {
    const detected = findReceiptDateInText(source)
    if (detected) setPurchaseDate(detected)
  }

  async function handleFile(file: File | undefined) {
    if (!file) return
    setError('')
    setShowAiHelp(false)
    setBusy(true)
    setProgressPct(0)
    setProgressLabel('Datei wird gelesen…')
    try {
      if (isReceiptImageFile(file)) {
        setProgressLabel('Text wird erkannt…')
        const ocrText = await ocrReceiptImage(file, setProgressPct)
        setText(ocrText)
        applyParsedText(ocrText)
        const parsed = parseReceiptInput(ocrText, store)
        if (!parsed.items.length) {
          failParse('Keine Artikel erkannt – Text prüfen oder unten einfügen.')
        } else {
          setItems(parsed.items)
          setStep('review')
        }
      } else if (isPdfFile(file)) {
        setProgressLabel('PDF wird ausgelesen…')
        const pdfText = await extractReceiptFromPdf(file, setProgressPct)
        setText(pdfText)
        applyParsedText(pdfText)
        if (!pdfText.trim()) {
          failParse('PDF konnte nicht gelesen werden – Foto vom Bon oder Text einfügen.')
          return
        }
        const parsed = parseReceiptInput(pdfText, store)
        if (!parsed.items.length) {
          failParse('Im PDF keine Artikel erkannt – Text unten prüfen oder anpassen.')
        } else {
          setItems(parsed.items)
          setStep('review')
        }
      } else {
        const content = await readTextFile(file)
        setText(content)
        goParse(content)
      }
    } catch (err) {
      console.error(err)
      setError('Datei konnte nicht gelesen werden.')
      setShowAiHelp(true)
    } finally {
      setBusy(false)
      setProgressPct(null)
      setProgressLabel('')
    }
  }

  function goParse(source = text) {
    setError('')
    setShowAiHelp(false)
    applyParsedText(source)
    const parsed = parseReceiptInput(source, store)
    if (!parsed.items.length) {
      failParse('Keine Artikel gefunden – Bon-Text oder JSON prüfen.')
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
    if (target === 'trip' && !tripId) {
      setError('Bitte einen bestehenden Kassenbon wählen.')
      return
    }
    if (store.trim()) addCustomStore(store)
    const result = applyReceiptImport({
      store,
      target,
      listId: target === 'existing' ? listId : undefined,
      tripId: target === 'trip' ? tripId : undefined,
      newListName: target === 'new' ? newListName : undefined,
      purchaseDate,
      addMissingItems: target === 'existing' ? addMissingItems : undefined,
      addMissingTripItems: target === 'trip' ? addMissingTripItems : undefined,
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
  const selectedTrip = completedTrips.find((t) => t.id === tripId)

  return (
    <Sheet onClose={onClose} tall>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-1 pb-4">
        <h2 className="mb-1 text-lg font-bold">Kassenbon importieren</h2>
        <p className="mb-3 text-[13px] leading-snug" style={{ color: 'var(--text)' }}>
          Foto oder PDF wählen – die App liest den Bon direkt aus. Optional mit einer Liste abgleichen.
        </p>

        {step === 'setup' && (
          <>
            <SectionLabel>Kette / Filiale</SectionLabel>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {storeOptions.map((s) => {
                const isCustom = !(STORE_PRESETS as readonly string[]).includes(s)
                const selected = store === s
                return (
                  <div key={s} className="inline-flex max-w-full">
                    <button
                      type="button"
                      className="tap-scale min-h-[44px] rounded-full px-3.5 py-2 text-[13px] font-bold"
                      style={{
                        background: selected ? 'var(--accent)' : 'var(--chip-bg)',
                        color: selected ? 'var(--accent-fg)' : 'var(--text)',
                      }}
                      onClick={() => selectStore(s)}
                    >
                      {s}
                    </button>
                    {isCustom ? (
                      <button
                        type="button"
                        className="tap-scale ml-0.5 flex h-[44px] w-[44px] items-center justify-center rounded-full text-[18px] font-bold leading-none"
                        style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}
                        onClick={() => {
                          removeCustomStore(s)
                          if (store === s) selectStore(STORE_PRESETS[0])
                        }}
                        aria-label={`${s} entfernen`}
                      >
                        ×
                      </button>
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div className="mb-4 flex gap-2">
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

            <SectionLabel>Einkaufsdatum</SectionLabel>
            <div className="mb-4">
              <input
                type="date"
                className="input w-full py-3 text-[15px] font-semibold"
                value={purchaseDate}
                max={todayKey()}
                onChange={(e) => setPurchaseDate(e.target.value || todayKey())}
              />
              <p className="mt-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Wann war der Einkauf? Wird im Kalender und Einkaufsverlauf angezeigt
                {purchaseDate !== todayKey() ? ` · ${formatDateKeyDe(purchaseDate)}` : ''}.
              </p>
            </div>

            <SectionLabel>Kassenbon zuordnen</SectionLabel>
            <div className="mb-2 flex flex-col gap-1.5">
              <OptionCard
                selected={target === 'trip'}
                onClick={() => setTarget('trip')}
                title="Bestehenden Kassenbon abgleichen"
                hint="Preise und Artikel auf einer vorhandenen Quittung aktualisieren"
              />
              <OptionCard
                selected={target === 'existing'}
                onClick={() => setTarget('existing')}
                title="Bestehende Liste abgleichen"
                hint="Bon gegen eine Einkaufsliste prüfen und Preise speichern"
              />
              <OptionCard
                selected={target === 'new'}
                onClick={() => {
                  setTarget('new')
                  setNewListName(defaultNewListName(store))
                }}
                title="Neuen Kassenbon anlegen"
                hint="Neue Liste aus dem Bon erstellen und Quittung speichern"
              />
            </div>

            {target === 'trip' && (
              <div className="mb-4">
                <div className="mb-1.5 text-[13px] font-bold" style={{ color: 'var(--text)' }}>
                  Welcher Kassenbon?
                </div>
                {!completedTrips.length ? (
                  <p className="rounded-xl px-3.5 py-3 text-[13px]" style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}>
                    Noch keine Quittungen. Lege zuerst einen neuen Kassenbon an oder schliesse einen Einkauf ab.
                  </p>
                ) : (
                  <div className="flex max-h-[240px] flex-col gap-1.5 overflow-y-auto overscroll-contain pr-0.5">
                    {completedTrips.slice(0, 30).map((trip) => {
                      const dateLabel = formatDateKeyDe(timestampToDateKey(trip.completedAt))
                      const title = trip.store?.trim() || trip.listName
                      return (
                        <OptionCard
                          key={trip.id}
                          selected={tripId === trip.id}
                          onClick={() => selectTrip(trip.id)}
                          title={title}
                          hint={`${dateLabel} · ${trip.items.length} Artikel · ${formatMoney(tripTotalSpent(trip), currency)}${trip.store && trip.listName !== trip.store ? ` · ${trip.listName}` : ''}`}
                        />
                      )
                    })}
                  </div>
                )}
                <label className="mt-3 flex items-start gap-2.5 rounded-xl px-1 py-1 text-[13px]">
                  <input
                    type="checkbox"
                    className="mt-1 h-[18px] w-[18px] shrink-0 accent-[var(--accent)]"
                    checked={addMissingTripItems}
                    onChange={(e) => setAddMissingTripItems(e.target.checked)}
                  />
                  <span style={{ color: 'var(--text)' }}>Fehlende Bon-Artikel auch auf die Quittung setzen</span>
                </label>
              </div>
            )}

            {target === 'existing' && (
              <div className="mb-4">
                <div className="mb-1.5 text-[13px] font-bold" style={{ color: 'var(--text)' }}>
                  Welche Liste?
                </div>
                <div className="flex max-h-[220px] flex-col gap-1.5 overflow-y-auto overscroll-contain pr-0.5">
                  {lists.map((l) => {
                    const open = l.items.filter((i) => !i.done).length
                    return (
                      <OptionCard
                        key={l.id}
                        selected={listId === l.id}
                        onClick={() => setListId(l.id)}
                        title={l.name}
                        hint={`${open} offen · ${l.items.length} Artikel gesamt`}
                        trailing={
                          l.id === activeListId ? (
                            <span
                              className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                            >
                              Aktuell
                            </span>
                          ) : undefined
                        }
                      />
                    )
                  })}
                </div>
                <label className="mt-3 flex items-start gap-2.5 rounded-xl px-1 py-1 text-[13px]">
                  <input
                    type="checkbox"
                    className="mt-1 h-[18px] w-[18px] shrink-0 accent-[var(--accent)]"
                    checked={addMissingItems}
                    onChange={(e) => setAddMissingItems(e.target.checked)}
                  />
                  <span style={{ color: 'var(--text)' }}>Fehlende Bon-Artikel auch auf die Liste setzen</span>
                </label>
              </div>
            )}

            {target === 'new' && (
              <div className="mb-4">
                <div className="mb-1.5 text-[13px] font-bold" style={{ color: 'var(--text)' }}>
                  Name der Liste
                </div>
                <input
                  type="text"
                  className="input w-full py-3 text-[14px] font-semibold"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="z. B. Migros"
                />
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf,text/plain,.json"
              className="hidden"
              onChange={(e) => {
                void handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="btn-primary mb-2 flex w-full items-center justify-center gap-2 py-3.5 text-[15px]"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              <Icon path={ICON_PATHS.import} size={18} />
              {busy
                ? progressLabel + (progressPct != null ? ` ${progressPct}%` : '')
                : 'Foto oder PDF wählen'}
            </button>

            <div className="mb-1 text-[13px] font-bold" style={{ color: 'var(--text)' }}>
              Oder Bon-Text / JSON einfügen
            </div>
            <textarea
              className="input min-h-[120px] font-mono text-[13px]"
              placeholder={'Banane 1.20\n2 x Cottage Cheese 3.60\n…'}
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
              Artikel erkennen
            </button>

            {(showAiHelp || text.trim()) && (
              <details
                className="mt-4 rounded-xl border px-3.5 py-3 text-[12px]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                open={showAiHelp}
              >
                <summary className="cursor-pointer text-[13px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  Optional: KI-Hilfe (nur wenn die Erkennung scheitert)
                </summary>
                <p className="mt-2 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  Prompt kopieren, Bon-Foto an ChatGPT oder Claude senden, JSON hier einfügen.
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
            )}
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
            <div className="mb-2 text-[13px] leading-snug" style={{ color: 'var(--text)' }}>
              <span className="font-bold">{store}</span>
              {' · '}
              {target === 'new'
                ? `Neuer Kassenbon „${newListName.trim() || defaultNewListName(store)}" · ${formatDateKeyDe(purchaseDate)}`
                : target === 'trip'
                  ? `Abgleich Kassenbon „${selectedTrip?.store || selectedTrip?.listName || 'Quittung'}" · ${formatDateKeyDe(purchaseDate)}`
                  : `Abgleich „${selectedListName || 'Liste'}" · ${formatDateKeyDe(purchaseDate)}`}
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
              {target === 'new'
                ? 'Neuen Kassenbon anlegen'
                : target === 'trip'
                  ? 'Kassenbon abgleichen'
                  : 'Liste abgleichen'}
            </button>
          </>
        )}
      </div>
    </Sheet>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
      {children}
    </div>
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
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2.5"
      style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-bold">{item.name}</div>
        <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {item.amount || item.category}
          {item.wasSale ? ' · Aktion' : ''}
        </div>
      </div>
      <span className="flex-none text-[14px] font-extrabold tabular-nums">{formatMoney(item.price, currency)}</span>
      <button
        type="button"
        className="tap-scale flex h-11 w-11 items-center justify-center"
        style={{ color: 'var(--danger)' }}
        onClick={onRemove}
        aria-label="Entfernen"
      >
        <Icon path={ICON_PATHS.close} size={16} />
      </button>
    </div>
  )
}
