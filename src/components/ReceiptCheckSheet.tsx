import { useEffect, useRef, useState, useMemo } from 'react'
import { Sheet } from './Sheet'
import { StoreLayoutSheet } from './StoreLayoutSheet'
import { useStore } from '@/store/useStore'
import { ocrReceiptImage, isReceiptImageFile } from '@/utils/receiptOcr'
import { prepareReceiptPhoto } from '@/utils/receiptPhoto'
import { extractReceiptFromPdf, isPdfFile } from '@/utils/receiptPdf'
import {
  parseReceiptCheck,
  compareReceiptCheck,
  suggestReceiptRows,
  receiptTripSnapshot,
  validReceiptDate,
  checkName,
  type ReceiptCheckDocument,
  type ReceiptCheckRow,
  type ReceiptCheckEvidence,
} from '@/utils/receiptCheck'
import { formatMoney } from '@/utils/currency'
import { tripTotalSpent } from '@/utils/stats'
import type { Currency } from '@/types'
import { CATEGORIES, PRODUCTS } from '@/data/products'
import { timestampToDateKey, formatDateKeyDe } from '@/utils/date'
import { baseQuantity } from '@/utils/quantity'
import { BrandSelect } from './BrandSelect'
import { uid } from '@/utils/id'
import { fingerprint } from '@/utils/fingerprint'
import { recognizeReceiptLabel, receiptNameScore, receiptRetailerKey } from '@/data/receiptVocabulary'
import { retailSelection } from '@/data/retailCatalog'
import { receiptBrandKey as brandSearchKey } from '@/data/receiptVocabulary'
import { receiptChangingItems, findReceiptCommitConflict } from '@/store/receiptBrandCommit'
import type { GlobalBrand } from '@/types'

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
  onSaved: (message: string) => void
}) {
  const trip = useStore((state) => state.completedTrips.find((trip) => trip.id === tripId))
  const purchaseLog = useStore((state) => state.purchaseLog)
  const catalog = useStore((state) => state.catalog)
  const brands = useStore((state) => state.brands)
  const priceProfiles = useStore((state) => state.priceProfiles)
  const aliases = useStore((state) => state.receiptAliases)
  const settings = useStore((state) => state.settings)
  const metadata = useMemo(
    () => ({
      logs: new Map(purchaseLog.flatMap((entry) => (entry.id ? [[entry.id, entry] as const] : []))),
      variants: new Map(
        priceProfiles.flatMap((profile) => profile.variants).map((variant) => [variant.id, variant])
      ),
      products: new Map(catalog.map((product) => [product.id, product])),
      brands: new Map(brands.map((brand) => [brand.id, brand])),
    }),
    [purchaseLog, priceProfiles, catalog, brands]
  )
  const [brandContext, setBrandContext] = useState(() =>
    retailSelection({ ...settings, currency: trip?.currency ?? settings.currency }, trip?.store)
  )
  const [draftBrands, setDraftBrands] = useState<GlobalBrand[]>([])
  const newBrandNames = useRef(new Map<string, string>())
  const [locationOpen, setLocationOpen] = useState(false)
  const [text, setText] = useState('')
  const [document, setDocument] = useState<ReceiptCheckDocument | null>(null)
  const [rows, setRows] = useState<DraftRow[]>([])
  const [currency, setCurrency] = useState<Currency>(trip?.currency ?? 'CHF')
  const [totalText, setTotalText] = useState('')
  const [receiptDate, setReceiptDate] = useState('')
  const [applyDate, setApplyDate] = useState(false)
  const [snapshot, setSnapshot] = useState('')
  const [analyzedText, setAnalyzedText] = useState('')
  const [photoUrl, setPhotoUrl] = useState('')
  const [pdfName, setPdfName] = useState('')
  const [source, setSource] = useState<ReceiptCheckEvidence['source']>('text')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [onlyDifferences, setOnlyDifferences] = useState(true)
  const [editingId, setEditingId] = useState('')
  const [removeItemIds, setRemoveItemIds] = useState<string[]>([])
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

  function existingBrand(itemId: string): string | undefined {
    const item = trip?.items.find((item) => item.id === itemId)
    const entry = metadata.logs.get(item?.purchaseLogId ?? '')
    const variant = metadata.variants.get(entry?.variantId ?? '')
    return (
      item?.brandName ??
      metadata.products.get(entry?.productId ?? '')?.brand ??
      metadata.brands.get(variant?.brandId ?? '')?.name
    )
  }
  function brandConflict(row: ReceiptCheckRow) {
    const known = existingBrand(row.targetId)
    return (
      !!known && !!row.brandName && brandSearchKey(known) !== brandSearchKey(row.brandName) && !row.applyBrand
    )
  }
  function analyze(value = text, actualSource = source) {
    if (!trip) return
    setError('')
    setConfirmed(false)
    setEditingId('')
    try {
      const parsed = parseReceiptCheck(value)
      setDocument(parsed)
      setRows(
        suggestReceiptRows(parsed, trip, aliases).map((row) => {
          const recognized = recognizeReceiptLabel(
            row.name,
            receiptRetailerKey(trip.store, trip.currency ?? 'CHF'),
            aliases,
            row.amount,
            !!row.weighed
          )
          const item = trip.items.find((item) => item.id === row.targetId)
          const log = purchaseLog.find((entry) => entry.id === item?.purchaseLogId)
          const appBrand =
            existingBrand(item?.id ?? '') ?? catalog.find((product) => product.id === log?.productId)?.brand
          return {
            ...row,
            priceText: (row.minor / 100).toFixed(2),
            newName: recognized.name,
            brandName: recognized.brandName ?? appBrand ?? '',
            brandOrigin:
              recognized.source === 'explicit'
                ? 'Bontext'
                : recognized.source === 'remembered'
                  ? 'Gemerkte Zuordnung'
                  : appBrand
                    ? 'App-Angabe'
                    : undefined,
            applyBrand: !!item && !!recognized.brandName && !appBrand,
            remember: true,
            category:
              recognized.category ??
              catalog.find((product) => checkName(product.name) === checkName(row.name))?.category ??
              PRODUCTS.find((product) => checkName(product.name) === checkName(recognized.name))?.category ??
              'Sonstiges',
            addAsWeight: !!row.weighed,
          }
        })
      )
      setRemoveItemIds([])
      setCurrency(parsed.currency ?? trip.currency ?? 'CHF')
      setTotalText(parsed.totalMinor === undefined ? '' : (parsed.totalMinor / 100).toFixed(2))
      setReceiptDate(parsed.date ?? '')
      setApplyDate(false)
      setSnapshot(receiptTripSnapshot(trip))
      setAnalyzedText(value)
      setSource(actualSource)
    } catch (error) {
      setDocument(null)
      setError(error instanceof Error ? error.message : 'Bon nicht lesbar.')
    }
  }
  async function readDocument(file?: File) {
    if (!file) return
    controller.current?.abort()
    setDocument(null)
    setConfirmed(false)
    setText('')
    setError('')
    setPhotoUrl('')
    setPdfName('')
    const pdf = isPdfFile(file)
    if (!pdf && !isReceiptImageFile(file)) {
      setError('Bitte ein Bonfoto oder eine PDF-Datei auswählen.')
      return
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('Die Datei ist zu groß (maximal 25 MB).')
      return
    }
    const current = new AbortController()
    controller.current = current
    if (pdf) setPdfName(file.name)
    else setPhotoUrl(URL.createObjectURL(file))
    setSource(pdf ? 'pdf' : 'photo')
    setBusy(true)
    setProgress(0)
    try {
      const reportProgress = (value: number) => {
        if (!current.signal.aborted) setProgress(value)
      }
      const result = pdf
        ? await extractReceiptFromPdf(file, reportProgress, current.signal)
        : await ocrReceiptImage(
            await prepareReceiptPhoto(file, current.signal),
            reportProgress,
            current.signal
          )
      if (!current.signal.aborted) {
        setText(result)
        analyze(result, pdf ? 'pdf' : 'photo')
      }
    } catch (error) {
      if (!current.signal.aborted) {
        setSource('text')
        setError(
          error instanceof Error
            ? error.message
            : 'Bon konnte nicht gelesen werden. Bitte den Bon-Text manuell einfügen.'
        )
      }
    } finally {
      if (controller.current === current) {
        setBusy(false)
        controller.current = null
      }
    }
  }
  const totalMinor = totalText.trim() ? editableMinor(totalText) : undefined
  const evidence: ReceiptCheckEvidence = {
    rows,
    adjustments: document?.adjustments ?? [],
    totalMinor,
    currency,
    store: document?.store,
    date: receiptDate || undefined,
    applyDate,
    removeItemIds,
    warnings: document?.warnings ?? [],
    source,
  }
  // compareReceiptCheck tut O(rows² × items) Arbeit (Duplikat-Erkennung, Marken-/Mengen-Abgleich je
  // Zeile) - memoisiert, damit ein Tastendruck in einem Preis-/Mengenfeld (changeRow, unten) nicht
  // bei jedem Zeichen den kompletten Bon neu abgleicht. Hooks müssen vor dem "Bon nicht gefunden"-
  // Return weiter unten stehen, daher hier die Variante ohne Trip selbst behandeln.
  const comparison = useMemo(
    () =>
      trip
        ? compareReceiptCheck(
            {
              ...trip,
              items: trip.items
                .filter((item) => !removeItemIds.includes(item.id))
                .map((item) => ({ ...item, brandName: existingBrand(item.id) })),
            },
            evidence
          )
        : null,
    // evidence ist pro Render neu gebaut; die tatsächlichen Eingaben sind rows/document/
    // totalMinor/currency/receiptDate/applyDate/removeItemIds/source (daraus abgeleitet) plus
    // trip/metadata (von existingBrand genutzt).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trip, rows, document, totalMinor, currency, receiptDate, applyDate, removeItemIds, source, metadata]
  )
  const unassignedAppItems = useMemo(
    () => trip?.items.filter((item) => !rows.some((row) => row.targetId === item.id)) ?? [],
    [trip, rows]
  )
  if (!trip || !comparison)
    return (
      <Sheet onClose={onClose}>
        <h2 className="text-xl font-bold">Bon nicht gefunden</h2>
        <p>Dieser Einkauf wurde entfernt.</p>
      </Sheet>
    )
  const refund = (document?.totalMinor ?? 0) < 0
  const brandOptions = [
    ...brands,
    ...draftBrands.filter(
      (brand) => !brands.some((known) => brandSearchKey(known.name) === brandSearchKey(brand.name))
    ),
  ]
  for (const row of rows)
    if (
      row.brandName?.trim() &&
      !brandOptions.some((brand) => brandSearchKey(brand.name) === brandSearchKey(row.brandName!))
    )
      brandOptions.push({ id: `receipt:${fingerprint(row.brandName)}`, name: row.brandName, createdAt: 0 })
  const stale = snapshot !== receiptTripSnapshot(trip) || analyzedText !== text
  const currencyMismatch = currency !== (trip.currency ?? 'CHF')
  const appTotalMinor = Math.round(tripTotalSpent(trip) * 100)
  const selected = rows.filter((row) => row.apply).length
  const amountChanges = rows.filter((row) => row.applyAmount).length
  const additions = rows.filter((row) => row.add).length
  const brandChanges = rows.filter((row) => row.applyBrand).length
  const dateChange = applyDate && receiptDate !== timestampToDateKey(trip.completedAt)
  const pendingSummary = [
    selected ? `${selected} ${selected === 1 ? 'Preis' : 'Preise'}` : '',
    amountChanges ? `${amountChanges} ${amountChanges === 1 ? 'Menge' : 'Mengen'}` : '',
    additions ? `${additions} Artikel` : '',
    brandChanges ? `${brandChanges} Marken` : '',
    removeItemIds.length ? `${removeItemIds.length} entfernen` : '',
    dateChange ? 'Datum' : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const changingItems = receiptChangingItems(trip, comparison.rows, new Set(removeItemIds), dateChange)
  const invalid =
    comparison.rows.some(
      (row) =>
        row.invalidPrice ||
        row.duplicate ||
        (row.apply && !row.canApply) ||
        (row.applyAmount && !row.canApplyAmount) ||
        (row.applyBrand && !row.canApplyBrand) ||
        ((row.apply || row.applyAmount) && brandConflict(row)) ||
        (row.add && !row.canAdd)
    ) ||
    changingItems.some((item) =>
      findReceiptCommitConflict(
        { purchaseLog, priceProfiles, catalog, brands },
        item,
        comparison.rows.find((row) => row.targetId === item.id),
        currency
      )
    ) ||
    (applyDate && !validReceiptDate(receiptDate)) ||
    (totalMinor !== undefined && !Number.isSafeInteger(totalMinor))
  const visible = comparison.rows.filter(
    (row) =>
      !onlyDifferences ||
      !row.equal ||
      row.quantityMismatch ||
      row.brandMismatch ||
      row.duplicate ||
      row.applyAmount ||
      row.add ||
      row.apply ||
      row.applyBrand
  )
  function changeRow(id: string, patch: Partial<DraftRow>) {
    setRows((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    setConfirmed(false)
  }
  function addManualRow() {
    if (!trip || rows.length >= 200 || busy || refund) return
    const row: DraftRow = {
      id: `manual-${uid()}`,
      name: '',
      newName: '',
      amount: '',
      priceText: '',
      minor: NaN,
      occurrences: 1,
      targetId: '',
      apply: false,
      add: true,
      manual: true,
      remember: true,
      category: 'Sonstiges',
      brandName: '',
    }
    if (!document) {
      setRemoveItemIds([])
      setDocument({ lines: [], adjustments: [], warnings: [] })
      setSnapshot(receiptTripSnapshot(trip))
      setAnalyzedText(text)
      setTotalText('')
      setReceiptDate('')
      setSource('text')
    }
    setRows((current) => (document ? [...current, row] : [row]))
    setEditingId(row.id)
    setConfirmed(false)
  }
  function candidates(row: ReceiptCheckRow) {
    if (!trip || row.targetId || !row.name.trim()) return []
    return trip.items
      .filter((item) => !removeItemIds.includes(item.id) && !rows.some((other) => other.targetId === item.id))
      .map((item) => ({
        item,
        score: receiptNameScore(row.name, item.name, receiptRetailerKey(trip.store, trip.currency ?? 'CHF')),
      }))
      .filter((candidate) => candidate.score >= 0.45)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((candidate) => candidate.item)
  }
  function save() {
    const result = useStore.getState().saveReceiptCheck(tripId, snapshot, evidence, confirmed)
    if (!result.ok) setError(result.error ?? 'Abgleich konnte nicht gespeichert werden.')
    else {
      const changes = [
        result.updated ? `${result.updated} ${result.updated === 1 ? 'Preis' : 'Preise'} korrigiert` : '',
        result.amountUpdated
          ? `${result.amountUpdated} ${result.amountUpdated === 1 ? 'Menge' : 'Mengen'} korrigiert`
          : '',
        result.added ? `${result.added} Artikel ergänzt` : '',
        result.brandUpdated ? `${result.brandUpdated} Marken übernommen` : '',
        result.removed ? `${result.removed} App-Positionen entfernt` : '',
        result.dateUpdated ? 'Datum korrigiert' : '',
      ].filter(Boolean)
      onSaved(
        `Abgleich gespeichert${changes.length ? ` · ${changes.join(' · ')}` : ''}${result.unlinked ? ` · ${result.unlinked} Positionen nur im Bon korrigiert (Kaufverknüpfung fehlt)` : ''}`
      )
    }
  }
  return (
    <Sheet onClose={onClose} tall>
      <h2 className="mb-1 shrink-0 text-xl font-bold">Bon prüfen</h2>
      <p className="mb-3 shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
        {trip.store ?? trip.listName} · gespeicherte Warensumme{' '}
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
            Bild oder PDF auswählen
          </button>
        </div>
        <button
          className="btn-soft mb-3 min-h-11 w-full px-2 text-sm"
          disabled={busy || refund || rows.length >= 200}
          onClick={addManualRow}
        >
          Bonposition manuell erfassen
        </button>
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
            void readDocument(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <input
          ref={gallery}
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          aria-label="Bondatei auswählen"
          type="file"
          accept="image/*,application/pdf,.pdf"
          disabled={busy}
          onChange={(event) => {
            void readDocument(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <p className="mb-3 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Foto und PDF bleiben auf deinem Gerät. Digitale PDFs werden direkt gelesen; bei Scans und Fotos
          hilft die Texterkennung. Sie lädt beim ersten Mal Sprachdateien aus dem Internet. Maximal 25 MB und
          20 PDF-Seiten. Fotos bitte scharf, gerade und ohne Spiegelungen aufnehmen.
        </p>
        {pdfName && (
          <p className="card-surface mb-3 break-words p-3 text-sm" role="status">
            PDF: {pdfName}
          </p>
        )}
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
                setError('Erkennung abgebrochen. Du kannst eine andere Datei wählen oder Bon-Text einfügen.')
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
            {refund && (
              <p role="alert" className="mb-3 text-sm" style={{ color: 'var(--danger)' }}>
                Dieser Bon enthält eine Rückerstattung mit negativem Endbetrag. Er darf keinen normalen
                Einkauf überschreiben. Rückgaben bitte getrennt erfassen.
              </p>
            )}
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
            <section className="card-surface mb-3 p-3 text-sm">
              <label className="block text-xs font-semibold">
                Datum laut Bon
                <input
                  type="date"
                  className="input mt-1 w-full"
                  value={receiptDate}
                  onChange={(event) => {
                    setReceiptDate(event.target.value)
                    setApplyDate(false)
                    setConfirmed(false)
                  }}
                />
              </label>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Einkauf gespeichert am {formatDateKeyDe(timestampToDateKey(trip.completedAt))}.
                {!receiptDate && ' Kein Datum erkannt. Du kannst es am Bon ablesen und eintragen.'}
              </p>
              {receiptDate && receiptDate !== timestampToDateKey(trip.completedAt) && (
                <label className="mt-1 flex min-h-11 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={applyDate}
                    disabled={!validReceiptDate(receiptDate) || currencyMismatch}
                    onChange={(event) => {
                      setApplyDate(event.target.checked)
                      setConfirmed(false)
                    }}
                  />
                  Bon-Datum übernehmen
                </label>
              )}
              {dateChange && (
                <p className="text-xs" style={{ color: 'var(--accent)' }}>
                  Datum wird beim Speichern für diesen Einkauf und seine Preise korrigiert.
                </p>
              )}
            </section>
            {currencyMismatch && (
              <p role="alert" className="mb-3 text-sm" style={{ color: 'var(--danger)' }}>
                Der Einkauf ist in {trip.currency ?? 'CHF'} gespeichert, der Bon in {currency}. Bitte zuerst
                die Währungsangabe am Einkauf prüfen. Preise werden nicht umgerechnet.
              </p>
            )}
            {(currencyMismatch || additions > 0) && (
              <button
                className="btn-soft mb-3 min-h-11 w-full px-2 text-sm"
                onClick={() => setLocationOpen(true)}
              >
                Einkaufsort oder Währung ändern
              </button>
            )}
            <section className="card-surface mb-3 p-3 text-sm">
              <p className="font-bold">
                {
                  comparison.rows.filter(
                    (row) => row.equal && !row.quantityMismatch && !row.brandMismatch && !row.duplicate
                  ).length
                }{' '}
                von {rows.length} erkannten Positionen preisgleich
              </p>
              <p className="mt-1">
                Erkannte Zeilen inkl. Zu-/Abschläge: {formatMoney(comparison.lineSum / 100, currency)}
              </p>
              <p className="mt-1">
                Waren auf dem Bon: {formatMoney(comparison.productSum / 100, currency)} · Gutscheine, Pfand
                und Rundung: {formatMoney(comparison.adjustmentSum / 100, currency)}
              </p>
              {comparison.adjustmentSum !== 0 && (
                <p className="mt-1 text-xs">
                  Verglichen werden die Warenpreise. Der Zahlbetrag enthält zusätzlich die gesonderten
                  Zu-/Abschläge. Gutscheine werden nicht als Artikelpreise verteilt.
                </p>
              )}
              {!currencyMismatch && totalMinor !== undefined && Number.isSafeInteger(totalMinor) && (
                <p className="mt-1 font-semibold">
                  {totalMinor === appTotalMinor && !comparison.adjustmentSum
                    ? 'Bon-Endbetrag und App-Summe sind gleich.'
                    : comparison.adjustmentSum
                      ? comparison.productSum === appTotalMinor
                        ? 'Bon-Warensumme und App-Summe sind gleich. Gutscheine, Pfand und Rundung erklären den anderen Zahlbetrag.'
                        : `Bon-Warensumme ist ${formatMoney(Math.abs(comparison.productSum - appTotalMinor) / 100, currency)} ${comparison.productSum > appTotalMinor ? 'höher' : 'niedriger'} als die App-Summe. Den Zahlbetrag gesondert prüfen.`
                      : `Bon-Endbetrag ist ${formatMoney(Math.abs(totalMinor - appTotalMinor) / 100, currency)} ${totalMinor > appTotalMinor ? 'höher' : 'niedriger'} als die App-Summe.`}
                </p>
              )}
              <p className="mt-1 font-semibold">
                {totalMinor === undefined
                  ? 'Endbetrag fehlt – bitte am Bon prüfen.'
                  : comparison.totalMatches
                    ? 'Erkannte Zeilensumme entspricht dem Endbetrag.'
                    : 'Zeilensumme und Endbetrag weichen ab – Erkennung prüfen.'}
              </p>
              <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                Preisgleichheit gilt nur für den erkannten Text. Bon, Mengen und Produkte bitte gegenlesen.
              </p>
            </section>
            {(comparison.storeMismatch || (comparison.dateMismatch && !dateChange)) && (
              <p
                className="mb-3 text-sm"
                style={{ color: comparison.storeMismatch ? 'var(--danger)' : 'var(--accent)' }}
              >
                {comparison.storeMismatch
                  ? 'Erkanntes Geschäft weicht vom gespeicherten Einkauf ab. Bitte sicherstellen, dass dies der richtige Bon ist und den Einkaufsort prüfen.'
                  : 'Das Datum weicht vom gespeicherten Einkauf ab. Bitte oben prüfen und bei Bedarf „Bon-Datum übernehmen“ auswählen.'}
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
              <section
                key={row.id}
                className="card-surface mb-3 p-3"
                aria-label={`Bonposition ${row.name || 'Manueller Artikel'}`}
              >
                <p className="font-bold">
                  {row.name || 'Manueller Artikel'}
                  {row.occurrences > 1 ? ` · ${row.occurrences} zusammengefasst` : ''}
                </p>
                {row.brandName && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Marke: {row.brandName}
                    {row.brandOrigin ? ` · ${row.brandOrigin}` : ''}
                    {row.applyBrand ? ' · zur Übernahme vorgemerkt' : ''}
                  </p>
                )}
                {row.item && existingBrand(row.targetId) && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    App-Marke: {existingBrand(row.targetId)}
                  </p>
                )}
                {brandConflict(row) && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--accent)' }}>
                    Die Bon-Marke weicht ab. Bitte Zuordnung oder Marke bestätigen, bevor du Preis oder Menge
                    änderst.
                  </p>
                )}
                {row.cancelled && (
                  <p className="mt-1 text-xs">Stornierte Bonmengen sind bereits verrechnet.</p>
                )}
                {!row.targetId &&
                  (() => {
                    const rowCandidates = candidates(row)
                    if (!rowCandidates.length) return null
                    return (
                      <div className="my-2 text-xs">
                        <p>Vielleicht bereits im Einkauf enthalten? Bitte Produkt und Variante prüfen.</p>
                        {rowCandidates.map((item) => (
                          <button
                            key={item.id}
                            className="btn-soft my-1 min-h-11 w-full px-2 text-left"
                            onClick={() => {
                              changeRow(row.id, {
                                targetId: item.id,
                                add: false,
                                apply: false,
                                applyAmount: false,
                                applyBrand: !!row.brandName && !existingBrand(item.id),
                                remember: true,
                              })
                              setEditingId(row.id)
                            }}
                          >
                            Zuordnen: {item.name} · {item.amount}
                          </button>
                        ))}
                      </div>
                    )
                  })()}
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
                {row.equal && (
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Preis stimmt bereits überein. Keine Preisübernahme nötig.
                  </p>
                )}
                {row.discountMinor !== undefined && (
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Artikelrabatt {formatMoney(row.discountMinor / 100, currency)} bereits berücksichtigt.
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
                    {row.add && (
                      <button
                        className="btn-soft min-h-11 w-full px-2 text-xs"
                        onClick={() => changeRow(row.id, { add: false })}
                      >
                        Vorhandenen Artikel zuordnen
                      </button>
                    )}
                    {!row.add && (
                      <label className="block text-xs font-semibold">
                        App-Position
                        <select
                          className="input mt-1 w-full"
                          aria-label="App-Position"
                          value={row.targetId}
                          onChange={(event) => {
                            const chosen = trip.items.find((item) => item.id === event.target.value)
                            changeRow(row.id, {
                              targetId: event.target.value,
                              apply: false,
                              applyAmount: false,
                              add: false,
                              applyBrand: !!chosen && !!row.brandName && !existingBrand(chosen.id),
                              remember: true,
                              ...(row.manual && chosen
                                ? { name: row.name || chosen.name, amount: row.amount || chosen.amount }
                                : {}),
                            })
                          }}
                        >
                          <option value="">Nicht zugeordnet</option>
                          {trip.items
                            .filter((item) => !removeItemIds.includes(item.id))
                            .map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.name} · {item.amount}
                                {item.price === undefined
                                  ? ''
                                  : ` · ${formatMoney(item.price, trip.currency ?? 'CHF')}`}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <BrandSelect
                      label="Marke auf dem Bon"
                      brands={brandOptions}
                      value={
                        brandOptions.find(
                          (brand) => brandSearchKey(brand.name) === brandSearchKey(row.brandName ?? '')
                        )?.id ?? ''
                      }
                      context={brandContext}
                      onContextChange={setBrandContext}
                      lockCountry
                      onCreateBrand={(name) => {
                        const brand = { id: uid(), name: name.trim(), createdAt: Date.now() }
                        newBrandNames.current.set(brand.id, brand.name)
                        setDraftBrands((current) => [...current, brand])
                        return brand.id
                      }}
                      onChange={(id) => {
                        const name =
                          brandOptions.find((brand) => brand.id === id)?.name ??
                          newBrandNames.current.get(id) ??
                          ''
                        changeRow(row.id, {
                          brandName: name,
                          brandOrigin: 'Auswahl',
                          applyBrand: !!row.item && name !== (row.item.brandName ?? ''),
                        })
                      }}
                    />
                    <label className="block text-xs font-semibold">
                      Bon-Menge
                      <input
                        className="input mt-1 w-full"
                        value={row.amount}
                        placeholder="z. B. 532 g oder 2 Stück"
                        onChange={(event) =>
                          changeRow(row.id, {
                            amount: event.target.value,
                            applyAmount: false,
                            apply: false,
                            addAsWeight: baseQuantity(event.target.value)?.unit === 'g' && row.addAsWeight,
                          })
                        }
                      />
                    </label>
                    {row.add && (
                      <>
                        <label className="block text-xs font-semibold">
                          Produkt für Preisvergleich
                          <select
                            className="input mt-1 w-full"
                            aria-label="Produkt für Preisvergleich"
                            value={row.productId ?? ''}
                            onChange={(event) => {
                              const product = catalog.find((product) => product.id === event.target.value)
                              changeRow(row.id, {
                                productId: product?.id,
                                ...(product
                                  ? {
                                      newName: product.name,
                                      category: product.category,
                                      brandName: product.brand ?? row.brandName,
                                    }
                                  : {}),
                              })
                            }}
                          >
                            <option value="">Neues Produkt anlegen</option>
                            {catalog.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                                {product.brand ? ` · ${product.brand}` : ''}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block text-xs font-semibold">
                          Artikelname
                          <input
                            className="input mt-1 w-full"
                            maxLength={300}
                            value={row.newName ?? ''}
                            onChange={(event) =>
                              changeRow(row.id, {
                                newName: event.target.value,
                                ...(row.manual ? { name: event.target.value } : {}),
                              })
                            }
                          />
                        </label>
                        <label className="block text-xs font-semibold">
                          Kategorie
                          <select
                            className="input mt-1 w-full"
                            aria-label="Kategorie"
                            value={row.category ?? 'Sonstiges'}
                            onChange={(event) => changeRow(row.id, { category: event.target.value })}
                          >
                            {CATEGORIES.map((category) => (
                              <option key={category}>{category}</option>
                            ))}
                          </select>
                        </label>
                        {baseQuantity(row.amount)?.unit === 'g' && (
                          <label className="flex min-h-11 items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={!!row.addAsWeight}
                              onChange={(event) => changeRow(row.id, { addAsWeight: event.target.checked })}
                            />
                            Lose Ware: Kilopreis aus Gewicht berechnen
                          </label>
                        )}
                      </>
                    )}
                    <label className="block text-xs font-semibold">
                      {row.manual ? 'Bonpreis gesamt' : 'Erkannter Bonpreis'}
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
                    <label className="flex min-h-11 items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={!!row.remember}
                        onChange={(event) => changeRow(row.id, { remember: event.target.checked })}
                      />
                      Bestätigte Zuordnung für diesen Supermarkt merken
                    </label>
                    {row.manual && (
                      <button
                        className="btn-soft min-h-11 w-full text-xs"
                        onClick={() => {
                          setRows((current) => current.filter((entry) => entry.id !== row.id))
                          setConfirmed(false)
                        }}
                      >
                        Manuelle Position entfernen
                      </button>
                    )}
                  </div>
                )}
                {row.quantityMismatch && !row.applyAmount && (
                  <p className="mb-2 text-xs" style={{ color: 'var(--accent)' }}>
                    Menge weicht ab. Bon-Menge übernehmen oder unter „bearbeiten“ korrigieren.
                  </p>
                )}
                {(row.apply || row.applyAmount) &&
                  row.item &&
                  !purchaseLog.some((entry) => entry.id === row.item?.purchaseLogId) && (
                    <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      Bei dieser älteren Position kann nur der Bon korrigiert werden. Eine eindeutige
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
                {row.item && (row.canApplyAmount || row.applyAmount || row.quantityMismatch) && (
                  <>
                    <label className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!row.applyAmount}
                        disabled={!row.canApplyAmount || currencyMismatch || refund || brandConflict(row)}
                        onChange={(event) =>
                          changeRow(row.id, { applyAmount: event.target.checked, apply: false })
                        }
                      />
                      Bon-Menge für {row.name} übernehmen
                    </label>
                    {row.applyAmount && (
                      <p className="mb-2 text-xs" style={{ color: 'var(--accent)' }}>
                        Mengenänderung vorgemerkt: {row.item.amount} → {row.amount}. Wird erst beim Speichern
                        übernommen.
                      </p>
                    )}
                    {!row.canApplyAmount && !row.applyAmount && (
                      <p className="text-xs">Bitte eine gültige Menge in passender Einheit eintragen.</p>
                    )}
                  </>
                )}
                {!row.item && !row.targetId && (
                  <>
                    <button
                      className="btn-soft my-2 min-h-11 w-full px-2 text-sm"
                      disabled={currencyMismatch || row.invalidPrice || row.minor <= 0}
                      onClick={() => {
                        changeRow(row.id, {
                          add: !row.add,
                          amount: row.amount || `${row.occurrences} Stück`,
                          apply: false,
                          applyAmount: false,
                        })
                        setEditingId(row.id)
                      }}
                    >
                      {row.add ? 'Ergänzung zurücknehmen' : 'Zum Einkauf hinzufügen'}
                    </button>
                    {row.add && (
                      <p className="mb-2 text-xs" style={{ color: 'var(--accent)' }}>
                        Vorgemerkt: {row.newName} · {row.amount} · {row.category}. Wird diesem abgeschlossenen
                        Einkauf beim Speichern ergänzt.
                      </p>
                    )}
                    {row.add && !row.canAdd && (
                      <p className="mb-2 text-xs" style={{ color: 'var(--danger)' }}>
                        Name, Menge und Kategorie prüfen. Bereits enthaltene Artikel bitte zuordnen.
                      </p>
                    )}
                  </>
                )}
                {row.item && (
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={row.apply}
                      disabled={!row.canApply || currencyMismatch || refund || brandConflict(row)}
                      onChange={(event) => changeRow(row.id, { apply: event.target.checked })}
                    />
                    Preis für {row.name} übernehmen
                  </label>
                )}
                {row.item && (row.canApplyBrand || row.applyBrand) && (
                  <label className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!row.applyBrand}
                      disabled={!row.canApplyBrand || currencyMismatch || refund}
                      onChange={(event) => changeRow(row.id, { applyBrand: event.target.checked })}
                    />
                    Marke für {row.name} übernehmen
                  </label>
                )}
              </section>
            ))}
            {!!unassignedAppItems.length && (
              <details className="mb-3 text-xs" open={removeItemIds.length > 0 || undefined}>
                <summary className="min-h-11 cursor-pointer font-semibold">
                  {unassignedAppItems.length} App-Positionen im Bon nicht zugeordnet
                </summary>
                <p className="mb-2">
                  Möglicherweise anders benannt oder nicht gekauft. Bitte am Bon prüfen. Entfernen korrigiert
                  auch den verknüpften Preisverlauf; den aktuellen Vorrat bei Bedarf separat prüfen.
                </p>
                {unassignedAppItems.map((item) => (
                  <label key={item.id} className="my-1 flex min-h-11 items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={removeItemIds.includes(item.id)}
                      disabled={currencyMismatch || refund}
                      onChange={(event) => {
                        setRemoveItemIds((current) =>
                          event.target.checked
                            ? [...current, item.id]
                            : current.filter((id) => id !== item.id)
                        )
                        setConfirmed(false)
                      }}
                    />
                    {item.name} · {item.amount} · aus diesem Einkauf entfernen
                  </label>
                ))}
              </details>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="my-3 text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </div>
      {pendingSummary && (
        <p className="mt-2 shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
          Beim Speichern: {pendingSummary}
        </p>
      )}
      {document && (
        <label className="mt-1 flex min-h-11 shrink-0 items-center gap-2 text-sm font-semibold">
          <input
            aria-label="Dieser Bon gehört zu diesem Einkauf. Bon und Änderungen geprüft."
            type="checkbox"
            checked={confirmed}
            disabled={busy || refund}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Bon und Änderungen geprüft
        </label>
      )}
      <button
        className="btn-primary mt-3 min-h-12 shrink-0 px-2"
        disabled={busy || refund || !document || stale || !confirmed || currencyMismatch || invalid}
        onClick={save}
      >
        {amountChanges || additions || dateChange || brandChanges || removeItemIds.length
          ? 'Änderungen & Prüfung speichern'
          : selected
            ? `${selected} Preisänderung${selected === 1 ? '' : 'en'} & Prüfung speichern`
            : 'Prüfergebnis speichern'}
      </button>
      {locationOpen && <StoreLayoutSheet tripId={tripId} onClose={() => setLocationOpen(false)} />}
    </Sheet>
  )
}
