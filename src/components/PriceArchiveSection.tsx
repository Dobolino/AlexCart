import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES } from '@/data/products'
import { useStore } from '@/store/useStore'
import { formatMoney } from '@/utils/currency'
import { quantityText } from '@/utils/quantity'
import { normalize } from '@/utils/text'
import { parsePriceArchive, PRICE_ARCHIVE_MAX_BYTES, type PriceArchive } from '@/utils/priceArchive'
import type { CatalogProduct, PriceObservation } from '@/types/catalog'

const PAGE_SIZE = 20
const dateLabel = (value: string) => value.slice(0, 10).split('-').reverse().join('.')
const basisLabel = (basis: PriceObservation['basis']) =>
  basis === 'kg' ? ' / kg' : basis === 'l' ? ' / l' : basis === 'piece' ? ' / Stück' : ' / Packung'

export function PriceArchiveSection() {
  const importPrices = useStore((state) => state.importPriceArchive)
  const lists = useStore((state) => state.lists)
  const [archive, setArchive] = useState<PriceArchive | null>(null)
  const [originalNames, setOriginalNames] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [country, setCountry] = useState<'ALL' | 'CH' | 'DE'>('ALL')
  const [page, setPage] = useState(0)
  const [confirmed, setConfirmed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)
  const request = useRef(0)
  useEffect(
    () => () => {
      request.current++
    },
    []
  )

  const summary = useMemo(() => {
    const stores = new Map(archive?.retailStores.map((store) => [store.id, store]) ?? [])
    const byProduct = new Map<string, PriceObservation[]>()
    const countries = new Map<string, Set<string>>()
    let ch = 0,
      de = 0
    const dates: string[] = []
    for (const observation of archive?.priceObservations ?? []) {
      const rows = byProduct.get(observation.productId) ?? []
      rows.push(observation)
      byProduct.set(observation.productId, rows)
      const productCountries = countries.get(observation.productId) ?? new Set<string>()
      const storeCountry = stores.get(observation.storeId)?.country
      if (storeCountry) productCountries.add(storeCountry)
      countries.set(observation.productId, productCountries)
      if (storeCountry === 'CH') ch++
      else if (storeCountry === 'DE') de++
      dates.push(observation.observedAt)
    }
    for (const rows of byProduct.values()) rows.sort((a, b) => b.observedAt.localeCompare(a.observedAt))
    dates.sort()
    return { stores, byProduct, countries, ch, de, first: dates[0], last: dates[dates.length - 1] }
  }, [archive])
  const filtered = useMemo(() => {
    const search = normalize(query)
    return (archive?.catalog ?? []).filter(
      (product) =>
        (country === 'ALL' || summary.countries.get(product.id)?.has(country)) &&
        (!search ||
          normalize(`${product.name} ${product.brand ?? ''} ${originalNames[product.id] ?? ''}`).includes(
            search
          ))
    )
  }, [archive, query, country, summary.countries, originalNames])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount - 1)
  const visible = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
  const selectedPriceCount =
    archive?.priceObservations.filter((row) => selected.has(row.productId)).length ?? 0
  const listNames = [...new Set(lists.flatMap((list) => list.items.map((item) => item.name)))].sort()

  async function readFile(file?: File) {
    const current = ++request.current
    setArchive(null)
    setSelected(new Set())
    setConfirmed(false)
    setMessage('')
    setError('')
    setBusy(false)
    if (!file) return
    if (!/\.json$/i.test(file.name)) {
      setError('Bitte die vorbereitete Bonpreis-Datei im JSON-Format wählen.')
      return
    }
    if (file.size > PRICE_ARCHIVE_MAX_BYTES) {
      setError('Die Bonpreis-Datei ist zu groß (maximal 8 MB).')
      return
    }
    setBusy(true)
    try {
      const parsed = parsePriceArchive(await file.text())
      if (current !== request.current) return
      setArchive(parsed)
      setOriginalNames(Object.fromEntries(parsed.catalog.map((product) => [product.id, product.name])))
      setSelected(new Set(parsed.catalog.map((product) => product.id)))
      setQuery('')
      setCountry('ALL')
      setPage(0)
    } catch (cause) {
      if (current === request.current)
        setError(cause instanceof Error ? cause.message : 'Die Bonpreis-Datei konnte nicht gelesen werden.')
    } finally {
      if (current === request.current) setBusy(false)
    }
  }
  function editProduct(id: string, patch: Partial<CatalogProduct>) {
    setArchive(
      (current) =>
        current && {
          ...current,
          catalog: current.catalog.map((product) => (product.id === id ? { ...product, ...patch } : product)),
        }
    )
    setConfirmed(false)
    setError('')
  }
  function selectProducts(ids: string[], value: boolean) {
    setSelected((current) => {
      const next = new Set(current)
      for (const id of ids) {
        if (value) next.add(id)
        else next.delete(id)
      }
      return next
    })
    setConfirmed(false)
  }
  function save() {
    if (!archive || !confirmed || !selected.size || busy) return
    setError('')
    const result = importPrices(archive, [...selected])
    if (!result.ok) {
      setError(result.error ?? 'Die Bonpreise konnten nicht übernommen werden.')
      return
    }
    const count = result.addedObservations ?? 0
    const products = result.addedProducts ?? 0
    setMessage(
      `${count} ${count === 1 ? 'Bonpreis' : 'Bonpreise'} übernommen · ${products} ${products === 1 ? 'neues Produkt' : 'neue Produkte'}${result.skippedObservations ? ` · ${result.skippedObservations} bereits vorhanden` : ''}. Deine Listen, Käufe und dein Vorrat bleiben erhalten.`
    )
    setArchive(null)
    setSelected(new Set())
    setConfirmed(false)
  }

  return (
    <section className="glass-card mb-4 p-3" aria-label="Bonpreise für Kostenschätzung">
      <h2 className="text-lg font-bold">Bonpreise für Kostenschätzung</h2>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        Übernimm historische Preise aus einer vorbereiteten Bonpreis-Datei. Die Schätzung berücksichtigt
        Supermarkt, Währung und Menge. Es entstehen keine zusätzlichen Einkäufe oder Vorräte.
      </p>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-label="Bonpreis-Datei auswählen"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          void readFile(file)
        }}
      />
      <button
        type="button"
        className="btn-soft mt-3 min-h-12 w-full px-3 text-sm"
        disabled={busy}
        onClick={() => fileInput.current?.click()}
      >
        {busy ? 'Bonpreis-Datei wird gelesen …' : 'Bonpreis-Datei wählen'}
      </button>
      {archive && (
        <div className="mt-4">
          <h3 className="font-bold">Vorschau vor dem Import</h3>
          <p className="mt-1 text-sm">
            {archive.catalog.length} Produkte · {archive.priceObservations.length} Bonpreise
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            Schweiz / CHF: {summary.ch} · Deutschland / EUR: {summary.de}
            {summary.first && summary.last ? ` · ${dateLabel(summary.first)}–${dateLabel(summary.last)}` : ''}
          </p>
          <p className="mt-3 text-sm leading-relaxed">
            Prüfe Namen, Marken und Packungen. Für vorhandene Listenartikel müssen Name und Kategorie passen.
            Du kannst importierte Produkte auch direkt in der Artikelsuche auswählen. Ähnliche Namen werden
            nicht automatisch gleichgesetzt.
          </p>
          <label className="mt-3 block text-sm font-semibold">
            Produkte in der Datei suchen
            <input
              className="input mt-1 w-full"
              type="search"
              value={query}
              placeholder="Artikel oder Marke"
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(0)
              }}
            />
          </label>
          <label className="mt-2 block text-sm font-semibold">
            Land in der Vorschau
            <select
              className="input mt-1 w-full"
              value={country}
              onChange={(event) => {
                setCountry(event.target.value as typeof country)
                setPage(0)
              }}
            >
              <option value="ALL">Schweiz & Deutschland</option>
              <option value="CH">Schweiz / CHF</option>
              <option value="DE">Deutschland / EUR</option>
            </select>
          </label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              className="btn-soft min-h-11 px-2 text-xs"
              disabled={!filtered.length}
              onClick={() =>
                selectProducts(
                  filtered.map((product) => product.id),
                  true
                )
              }
            >
              Alle Treffer auswählen
            </button>
            <button
              className="btn-soft min-h-11 px-2 text-xs"
              disabled={!filtered.length}
              onClick={() =>
                selectProducts(
                  filtered.map((product) => product.id),
                  false
                )
              }
            >
              Alle Treffer abwählen
            </button>
          </div>
          <p className="my-3 text-sm font-semibold">
            {selected.size} {selected.size === 1 ? 'Produkt' : 'Produkte'} · {selectedPriceCount}{' '}
            {selectedPriceCount === 1 ? 'Preis' : 'Preise'} ausgewählt
          </p>
          <datalist id="price-archive-list-names">
            {listNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <div className="space-y-2">
            {visible.map((product) => {
              const observations = summary.byProduct.get(product.id) ?? []
              return (
                <article
                  key={product.id}
                  aria-label={`Preisvorschlag ${originalNames[product.id]}`}
                  className="rounded-xl border p-3"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <label className="flex min-h-11 items-center gap-3 font-semibold">
                    <input
                      type="checkbox"
                      checked={selected.has(product.id)}
                      onChange={(event) => selectProducts([product.id], event.target.checked)}
                    />
                    <span className="min-w-0 break-words">{originalNames[product.id]}</span>
                  </label>
                  <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {product.netQuantity ? `${quantityText(product.netQuantity)} · ` : ''}
                    {observations.length} Bonpreise
                  </p>
                  <details>
                    <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
                      Zuordnung & Preise prüfen
                    </summary>
                    <label className="mt-2 block text-xs font-semibold">
                      Artikelname für die Liste
                      <input
                        className="input mt-1 w-full"
                        value={product.name}
                        maxLength={300}
                        list="price-archive-list-names"
                        autoComplete="off"
                        onChange={(event) => editProduct(product.id, { name: event.target.value })}
                      />
                    </label>
                    <label className="mt-2 block text-xs font-semibold">
                      Marke (optional)
                      <input
                        className="input mt-1 w-full"
                        value={product.brand ?? ''}
                        maxLength={300}
                        autoComplete="off"
                        onChange={(event) =>
                          editProduct(product.id, { brand: event.target.value || undefined })
                        }
                      />
                    </label>
                    <label className="mt-2 block text-xs font-semibold">
                      Kategorie
                      <select
                        className="input mt-1 w-full"
                        value={product.category}
                        onChange={(event) => editProduct(product.id, { category: event.target.value })}
                      >
                        {CATEGORIES.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                    <ul className="mt-3 space-y-2 text-xs">
                      {observations.slice(0, 5).map((observation) => (
                        <li key={observation.id} className="leading-relaxed">
                          <span className="font-semibold">
                            {summary.stores.get(observation.storeId)?.name} ·{' '}
                            {formatMoney(observation.price.minor / 100, observation.price.currency)}
                            {basisLabel(observation.basis)}
                          </span>
                          <span className="block" style={{ color: 'var(--text-muted)' }}>
                            {dateLabel(observation.observedAt)}
                            {observation.discounted ? ' · Aktion' : ''}
                            {observation.loyaltyRequired ? ' · Kundenkarte erforderlich' : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {observations.length > 5 && (
                      <p className="mt-2 text-xs">
                        Weitere {observations.length - 5} ältere Preise enthalten.
                      </p>
                    )}
                  </details>
                </article>
              )
            })}
          </div>
          {!filtered.length && <p className="my-3 text-sm">Keine passenden Produkte in dieser Datei.</p>}
          {pageCount > 1 && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                className="btn-soft min-h-11 px-3 text-sm"
                disabled={!currentPage}
                onClick={() => setPage(currentPage - 1)}
              >
                Zurück
              </button>
              <span className="text-xs">
                {currentPage + 1} / {pageCount}
              </span>
              <button
                className="btn-soft min-h-11 px-3 text-sm"
                disabled={currentPage + 1 >= pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Weiter
              </button>
            </div>
          )}
          <label className="mt-4 flex min-h-11 items-start gap-3 py-2 text-sm leading-relaxed">
            <input
              type="checkbox"
              className="mt-1"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            Ich habe die ausgewählten Produkte und Preisangaben geprüft.
          </label>
          <button
            className="btn-primary mt-2 min-h-12 w-full px-3 text-sm"
            disabled={!confirmed || !selected.size || busy}
            onClick={save}
          >
            {selectedPriceCount} {selectedPriceCount === 1 ? 'Bonpreis' : 'Bonpreise'} übernehmen
          </button>
          <button
            className="btn-soft mt-2 min-h-11 w-full px-3 text-sm"
            onClick={() => {
              request.current++
              setArchive(null)
              setSelected(new Set())
              setConfirmed(false)
              setError('')
            }}
          >
            Vorschau verwerfen
          </button>
        </div>
      )}
      {error && (
        <p role="alert" className="mt-3 break-words text-sm" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-3 break-words text-sm">
          {message}
        </p>
      )}
    </section>
  )
}
