import { useEffect, useRef, useState } from 'react'
import { Sheet } from './Sheet'
import { StoreLayoutSheet } from './StoreLayoutSheet'
import { useStore } from '@/store/useStore'
import { ocrReceiptImage, isReceiptImageFile } from '@/utils/receiptOcr'
import { prepareReceiptPhoto } from '@/utils/receiptPhoto'
import {
  parseReceiptCheck,
  compareReceiptCheck,
  suggestReceiptRows,
  receiptTripSnapshot,
  type ReceiptCheckDocument,
  type ReceiptCheckRow,
  type ReceiptCheckEvidence,
} from '@/utils/receiptCheck'
import { formatMoney } from '@/utils/currency'
import { tripTotalSpent } from '@/utils/stats'
import type { Currency } from '@/types'

type DraftRow = ReceiptCheckRow & { priceText: string }
const editableMinor = (value: string) =>
  /^\d+(?:[.,]\d{1,2})?$/.test(value.trim()) ? Math.round(Number(value.replace(',', '.')) * 100) : NaN

export function ReceiptCheckSheet({
  tripId,
  onClose,
  onSaved,
}: {
  tripId: string
  onClose: () => void
  onSaved: (updated: number, unlinked: number) => void
}) {
  const trip = useStore((state) => state.completedTrips.find((trip) => trip.id === tripId))
  const purchaseLog = useStore((state) => state.purchaseLog)
  const [locationOpen, setLocationOpen] = useState(false)
  const [text, setText] = useState('')
  const [document, setDocument] = useState<ReceiptCheckDocument | null>(null)
  const [rows, setRows] = useState<DraftRow[]>([])
  const [currency, setCurrency] = useState<Currency>(trip?.currency ?? 'CHF')
  const [totalText, setTotalText] = useState('')
  const [snapshot, setSnapshot] = useState('')
  const [analyzedText, setAnalyzedText] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [source, setSource] = useState<'photo' | 'text'>('text')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [onlyDifferences, setOnlyDifferences] = useState(true)
  const [editingId, setEditingId] = useState('')
  const camera = useRef<HTMLInputElement>(null)
  const gallery = useRef<HTMLInputElement>(null)
  const controller = useRef<AbortController | null>(null)
  useEffect(
    () => () => {
      controller.current?.abort()
    },
    []
  )
  useEffect(
    () => () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    },
    [photoUrl]
  )

  function analyze(value = text, actualSource = source) {
    if (!trip) return
    setError('')
    setConfirmed(false)
    setEditingId('')
    try {
      const parsed = parseReceiptCheck(value)
      setDocument(parsed)
      setRows(
        suggestReceiptRows(parsed, trip).map((row) => ({ ...row, priceText: (row.minor / 100).toFixed(2) }))
      )
      setCurrency(parsed.currency ?? trip.currency ?? 'CHF')
      setTotalText(parsed.totalMinor === undefined ? '' : (parsed.totalMinor / 100).toFixed(2))
      setSnapshot(receiptTripSnapshot(trip))
      setAnalyzedText(value)
      setSource(actualSource)
    } catch (error) {
      setDocument(null)
      setError(error instanceof Error ? error.message : 'Bon nicht lesbar.')
    }
  }
  async function readPhoto(file?: File) {
    if (!file) return
    controller.current?.abort()
    setDocument(null)
    setConfirmed(false)
    setText('')
    setError('')
    setPhotoUrl('')
    if (!isReceiptImageFile(file)) {
      setError('Bitte ein Bonfoto als Bild auswählen.')
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Das Bild ist zu groß (maximal 25 MB).')
      return
    }
    const current = new AbortController()
    controller.current = current
    setPhotoUrl(URL.createObjectURL(file))
    setSource('photo')
    setBusy(true)
    setProgress(0)
    try {
      const prepared = await prepareReceiptPhoto(file, current.signal)
      const result = await ocrReceiptImage(
        prepared,
        (value) => {
          if (!current.signal.aborted) setProgress(value)
        },
        current.signal
      )
      if (!current.signal.aborted) {
        setText(result)
        analyze(result, 'photo')
      }
    } catch (error) {
      if (!current.signal.aborted) {
        setSource('text')
        setError(
          error instanceof Error
            ? error.message
            : 'Foto konnte nicht gelesen werden. Bitte den Bon-Text manuell einfügen.'
        )
      }
    } finally {
      if (controller.current === current) {
        setBusy(false)
        controller.current = null
      }
    }
  }
  if (!trip)
    return (
      <Sheet onClose={onClose}>
        <h2 className="text-xl font-bold">Bon nicht gefunden</h2>
        <p>Dieser Einkauf wurde entfernt.</p>
      </Sheet>
    )
  const totalMinor = totalText.trim() ? editableMinor(totalText) : undefined
  const evidence: ReceiptCheckEvidence = {
    rows,
    adjustments: document?.adjustments ?? [],
    totalMinor,
    currency,
    store: document?.store,
    date: document?.date,
    warnings: document?.warnings ?? [],
    source,
  }
  const comparison = compareReceiptCheck(trip, evidence)
  const stale = snapshot !== receiptTripSnapshot(trip) || analyzedText !== text
  const currencyMismatch = currency !== (trip.currency ?? 'CHF')
  const appTotalMinor = Math.round(tripTotalSpent(trip) * 100)
  const selected = rows.filter((row) => row.apply).length
  const invalid =
    comparison.rows.some((row) => row.invalidPrice || row.duplicate || (row.apply && !row.canApply)) ||
    (totalMinor !== undefined && !Number.isSafeInteger(totalMinor))
  const visible = comparison.rows.filter(
    (row) => !onlyDifferences || !row.equal || row.quantityMismatch || row.duplicate
  )
  function changeRow(id: string, patch: Partial<DraftRow>) {
    setRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    setConfirmed(false)
  }
  function save() {
    const result = useStore.getState().saveReceiptCheck(tripId, snapshot, evidence, confirmed)
    if (!result.ok) setError(result.error ?? 'Abgleich konnte nicht gespeichert werden.')
    else onSaved(result.updated ?? 0, result.unlinked ?? 0)
  }
  return (
    <Sheet onClose={onClose} tall>
      <h2 className="mb-1 shrink-0 text-xl font-bold">Bon mit Foto prüfen</h2>
      <p className="mb-3 shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
        {trip.store ?? trip.listName} · gespeicherte Summe{' '}
        {formatMoney(tripTotalSpent(trip), trip.currency ?? 'CHF')}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            className="btn-primary min-h-12 px-2 text-sm"
            disabled={busy}
            onClick={() => camera.current?.click()}
          >
            Bon fotografieren
          </button>
          <button
            className="btn-soft min-h-12 px-2 text-sm"
            disabled={busy}
            onClick={() => gallery.current?.click()}
          >
            Bild auswählen
          </button>
        </div>
        <input
          ref={camera}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Bon fotografieren"
          type="file"
          accept="image/*"
          capture="environment"
          disabled={busy}
          onChange={(event) => {
            void readPhoto(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <input
          ref={gallery}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Bonbild auswählen"
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(event) => {
            void readPhoto(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Das Foto bleibt auf deinem Gerät. Beim ersten Mal lädt die Texterkennung Sprachdateien aus dem
          Internet. Bitte den ganzen Bon scharf, gerade und ohne Spiegelungen fotografieren.
        </p>
        {photoUrl && (
          <details className="mb-3">
            <summary className="min-h-11 cursor-pointer text-sm font-semibold">Bonfoto ansehen</summary>
            <img
              className="max-h-72 w-full rounded-xl object-contain"
              src={photoUrl}
              alt="Ausgewähltes Bonfoto zum Gegenlesen"
            />
          </details>
        )}
        {busy && (
          <div role="status" className="card-surface mb-3 p-3">
            <p>Texterkennung {progress ? `${progress} %` : 'wird geladen…'}</p>
            <progress
              className="my-2 w-full"
              max={100}
              value={progress}
              aria-label="Fortschritt der Texterkennung"
            />
            <button
              className="btn-soft min-h-11 w-full"
              onClick={() => {
                controller.current?.abort()
                setBusy(false)
                setSource('text')
                setError('Erkennung abgebrochen. Du kannst ein anderes Foto wählen oder Bon-Text einfügen.')
              }}
            >
              Erkennung abbrechen
            </button>
          </div>
        )}
        <details className="mb-3" open={!document}>
          <summary className="min-h-11 cursor-pointer text-sm font-bold">
            Erkannten Text prüfen oder Bon-Text einfügen
          </summary>
          <label className="block text-xs font-semibold">
            Bon-Text
            <textarea
              aria-label="Bon-Text"
              className="input my-2 min-h-36 w-full"
              value={text}
              disabled={busy}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              placeholder={'Migros\nMilch 1.50\nBrot 2.00\nTOTAL CHF 3.50'}
              onChange={(event) => {
                setText(event.target.value)
                setConfirmed(false)
              }}
            />
          </label>
          <button
            className="btn-soft mb-2 min-h-11 w-full"
            disabled={busy || !text.trim()}
            onClick={() => analyze()}
          >
            Text abgleichen
          </button>
        </details>
        {document && (
          <>
            {stale && (
              <div role="alert" className="card-surface mb-3 p-3 text-sm">
                Bon oder Text wurde verändert.{' '}
                <button className="min-h-11 font-bold underline" onClick={() => analyze()}>
                  Abgleich neu erstellen
                </button>
              </div>
            )}
            <div className="mb-3 grid grid-cols-2 gap-2">
              <label className="text-xs font-semibold">
                Währung laut Bon
                <select
                  className="input mt-1 w-full"
                  value={currency}
                  onChange={(event) => {
                    setCurrency(event.target.value as Currency)
                    setConfirmed(false)
                  }}
                >
                  <option value="CHF">CHF</option>
                  <option value="EUR">EUR</option>
                </select>
              </label>
              <label className="text-xs font-semibold">
                Endbetrag laut Bon
                <input
                  className="input mt-1 w-full"
                  inputMode="decimal"
                  value={totalText}
                  placeholder="nicht erkannt"
                  onChange={(event) => {
                    setTotalText(event.target.value)
                    setConfirmed(false)
                  }}
                />
              </label>
            </div>
            {currencyMismatch && (
              <p role="alert" className="mb-3 text-sm" style={{ color: 'var(--danger)' }}>
                Der Einkauf ist in {trip.currency ?? 'CHF'} gespeichert, der Bon in {currency}. Bitte zuerst
                die Währungsangabe am Einkauf prüfen. Preise werden nicht umgerechnet.
              </p>
            )}
            {currencyMismatch && (
              <button
                className="btn-soft mb-3 min-h-11 w-full px-2 text-sm"
                onClick={() => setLocationOpen(true)}
              >
                Einkaufsort oder Währung ändern
              </button>
            )}
            <section className="card-surface mb-3 p-3 text-sm">
              <p className="font-bold">
                {comparison.rows.filter((row) => row.equal && !row.quantityMismatch && !row.duplicate).length}{' '}
                von {rows.length} erkannten Positionen preisgleich
              </p>
              <p className="mt-1">
                Erkannte Zeilen inkl. Zu-/Abschläge: {formatMoney(comparison.lineSum / 100, currency)}
              </p>
              {!currencyMismatch && totalMinor !== undefined && Number.isSafeInteger(totalMinor) && (
                <p className="mt-1 font-semibold">
                  {totalMinor === appTotalMinor
                    ? 'Bon-Endbetrag und App-Summe sind gleich.'
                    : `Bon-Endbetrag ist ${formatMoney(Math.abs(totalMinor - appTotalMinor) / 100, currency)} ${totalMinor > appTotalMinor ? 'höher' : 'niedriger'} als die App-Summe.`}
                </p>
              )}
              <p className="mt-1 font-semibold">
                {totalMinor === undefined
                  ? 'Endbetrag fehlt – bitte am Foto prüfen.'
                  : comparison.totalMatches
                    ? 'Erkannte Zeilensumme entspricht dem Endbetrag.'
                    : 'Zeilensumme und Endbetrag weichen ab – Erkennung prüfen.'}
              </p>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Preisgleichheit gilt nur für den erkannten Text. Foto, Mengen und Produkte bitte gegenlesen.
              </p>
            </section>
            {comparison.metadataMismatch && (
              <p className="mb-3 text-sm" style={{ color: 'var(--danger)' }}>
                Erkanntes Datum oder Geschäft weicht vom gespeicherten Einkauf ab. Bitte sicherstellen, dass
                dies der richtige Bon ist.
              </p>
            )}
            {document.warnings.map((warning) => (
              <p key={warning} className="mb-2 text-xs" style={{ color: 'var(--danger)' }}>
                {warning}
              </p>
            ))}
            {!!document.adjustments.length && (
              <section className="card-surface mb-3 p-3 text-xs">
                <p className="mb-1 font-bold">Rabatte, Pfand oder Rundung gesondert prüfen</p>
                {document.adjustments.map((row, index) => (
                  <p key={index}>
                    {row.name}: {formatMoney(row.minor / 100, currency)}
                  </p>
                ))}
                <p className="mt-2">
                  Diese Beträge werden nicht automatisch auf Artikel verteilt oder in die App-Summe
                  übernommen.
                </p>
              </section>
            )}
            <label className="mb-3 flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={onlyDifferences}
                onChange={(event) => setOnlyDifferences(event.target.checked)}
              />
              Nur Abweichungen und offene Zuordnungen
            </label>
            {!visible.length && (
              <p className="mb-3 text-sm">Keine Preisabweichung bei den zugeordneten Positionen.</p>
            )}
            {visible.map((row) => (
              <section key={row.id} className="card-surface mb-3 p-3" aria-label={`Bonposition ${row.name}`}>
                <p className="font-bold">
                  {row.name}
                  {row.occurrences > 1 ? ` · ${row.occurrences} zusammengefasst` : ''}
                </p>
                <p className="my-1 text-sm">
                  Bon: {row.invalidPrice ? 'Preis prüfen' : formatMoney(row.minor / 100, currency)} · App:{' '}
                  {row.appMinor === undefined
                    ? 'ohne Preis'
                    : formatMoney(row.appMinor / 100, trip.currency ?? 'CHF')}
                </p>
                {row.amount && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Bonmenge: {row.amount} · App: {row.item?.amount || 'nicht erfasst'}
                  </p>
                )}
                <button
                  className="btn-soft my-2 min-h-11 w-full px-2 text-left text-xs"
                  onClick={() => setEditingId(editingId === row.id ? '' : row.id)}
                >
                  {row.item ? `App: ${row.item.name} · ${row.item.amount}` : 'Produkt zuordnen'} · bearbeiten
                </button>
                {editingId === row.id && (
                  <div className="mb-2 space-y-2">
                    <label className="block text-xs font-semibold">
                      App-Position
                      <select
                        className="input mt-1 w-full"
                        aria-label="App-Position"
                        value={row.targetId}
                        onChange={(event) =>
                          changeRow(row.id, { targetId: event.target.value, apply: false })
                        }
                      >
                        <option value="">Nicht zugeordnet</option>
                        {trip.items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} · {item.amount}
                            {item.price === undefined
                              ? ''
                              : ` · ${formatMoney(item.price, trip.currency ?? 'CHF')}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-semibold">
                      Erkannter Bonpreis
                      <input
                        className="input mt-1 w-full"
                        inputMode="decimal"
                        value={rows.find((draft) => draft.id === row.id)?.priceText ?? ''}
                        onChange={(event) =>
                          changeRow(row.id, {
                            priceText: event.target.value,
                            minor: editableMinor(event.target.value),
                            apply: false,
                          })
                        }
                      />
                    </label>
                  </div>
                )}
                {row.quantityMismatch && (
                  <p className="mb-2 text-xs" style={{ color: 'var(--danger)' }}>
                    Mengen weichen ab. Diese Position wird nicht automatisch korrigiert.
                  </p>
                )}
                {row.apply &&
                  row.item &&
                  !purchaseLog.some((entry) => entry.id === row.item?.purchaseLogId) && (
                    <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Bei dieser älteren Position kann nur der Bonpreis korrigiert werden. Eine eindeutige
                      Verknüpfung für den Preisverlauf fehlt.
                    </p>
                  )}
                {row.duplicate && (
                  <p className="mb-2 text-xs" style={{ color: 'var(--danger)' }}>
                    Mehrere Bonzeilen sind derselben App-Position zugeordnet. Bitte Zuordnung auflösen.
                  </p>
                )}
                {row.minor === 0 && row.appMinor !== 0 && (
                  <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Null- oder Gratispreis bitte gesondert prüfen. Er wird nicht automatisch übernommen.
                  </p>
                )}
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={row.apply}
                    disabled={!row.canApply || currencyMismatch}
                    onChange={(event) => changeRow(row.id, { apply: event.target.checked })}
                  />
                  Preis für {row.name} übernehmen
                </label>
              </section>
            ))}
            {!!comparison.missingItems.length && (
              <details className="mb-3 text-xs">
                <summary className="min-h-11 cursor-pointer font-semibold">
                  {comparison.missingItems.length} App-Positionen auf dem Foto nicht zugeordnet
                </summary>
                {comparison.missingItems.map((item) => (
                  <p key={item.id} className="py-1">
                    {item.name} · {item.amount}
                  </p>
                ))}
              </details>
            )}
            <label className="my-3 flex min-h-12 items-start gap-2 text-sm font-semibold">
              <input
                className="mt-1"
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              Das Foto bzw. der Text gehört zu diesem Einkauf. Beträge, Mengen und Zuordnungen sind geprüft.
            </label>
          </>
        )}
        {error && (
          <p role="alert" className="my-3 text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </div>
      <button
        className="btn-primary mt-3 min-h-12 shrink-0 px-2"
        disabled={busy || !document || stale || !confirmed || currencyMismatch || invalid}
        onClick={save}
      >
        {selected
          ? `${selected} Preisänderung${selected === 1 ? '' : 'en'} & Prüfung speichern`
          : 'Prüfergebnis speichern'}
      </button>
      {locationOpen && <StoreLayoutSheet tripId={tripId} onClose={() => setLocationOpen(false)} />}
    </Sheet>
  )
}
