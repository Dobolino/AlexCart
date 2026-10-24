import { lazy, Suspense, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { compareProductPrices, compareBasket, minorMoney } from '@/utils/priceComparison'
import { baseQuantity, quantityText } from '@/utils/quantity'
import { formatMoney, parseMoneyInput } from '@/utils/currency'
import { todayKey } from '@/utils/date'
import { uid } from '@/utils/id'
import { fetchFx, fetchOpenPrices } from '@/services/products'
import type { CatalogProduct } from '@/types/catalog'
import type { Currency } from '@/types'

const Scanner = lazy(() =>
  import('@/components/BarcodeScannerSheet').then((m) => ({ default: m.BarcodeScannerSheet }))
)
export function PricesPage() {
  const products = useStore((s) => s.catalog)
  const observations = useStore((s) => s.priceObservations)
  const stores = useStore((s) => s.retailStores)
  const currency = useStore((s) => s.settings.currency)
  const configured = useStore((s) => s.settings.apiUrl ?? '')
  const fx = useStore((s) => s.fxSnapshot)
  const list = useStore((s) => s.activeList())
  const [selected, setSelected] = useState(products[0]?.id ?? '')
  const [scan, setScan] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [pack, setPack] = useState(products[0]?.netQuantity ? quantityText(products[0].netQuantity) : '1 l')
  const [shop, setShop] = useState('Coop')
  const [country, setCountry] = useState<'CH' | 'DE'>('CH')
  const [inputCurrency, setInputCurrency] = useState<Currency>('CHF')
  const [price, setPrice] = useState('')
  const [date, setDate] = useState(todayKey)
  const [loyalty, setLoyalty] = useState(false)
  const [message, setMessage] = useState('')
  const [rate, setRate] = useState(fx?.quotePerBase ?? '')
  const [busy, setBusy] = useState(false)
  const product = products.find((p) => p.id === selected) ?? products[0]
  const rows = useMemo(
    () => (product ? compareProductPrices(product, observations, currency, fx) : []),
    [product, observations, currency, fx]
  )
  const baskets = useMemo(
    () => compareBasket(list?.items ?? [], products, observations, currency, fx),
    [list, products, observations, currency, fx]
  )
  async function run(action: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    try {
      await action()
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'Daten nicht verfügbar. Vorhandene Preise bleiben erhalten.'
      )
    } finally {
      setBusy(false)
    }
  }
  function savePrice() {
    const parsed = parseMoneyInput(price)
    if (!product || !parsed || !shop.trim() || !date) {
      setMessage('Bitte Produkt, Geschäft, Datum und einen gültigen Preis angeben.')
      return
    }
    const storeId = `${country}:${shop.trim().toLocaleLowerCase('de')}`
    const state = useStore.getState()
    state.upsertRetailStore({
      id: storeId,
      retailerId: `${country}:${shop.trim().split(' ')[0]!.toLowerCase()}`,
      name: shop.trim(),
      country,
      currency: inputCurrency,
    })
    state.addPriceObservation({
      id: uid(),
      productId: product.id,
      storeId,
      price: minorMoney(parsed, inputCurrency),
      basis: 'package',
      observedAt: new Date(`${date}T12:00:00`).toISOString(),
      source: 'manual',
      loyaltyRequired: loyalty,
    })
    setPrice('')
    setMessage('Preis gespeichert. Originalwährung und Datum bleiben erhalten.')
  }
  return (
    <>
      <PageHeader title="Preisvergleich" subtitle="Deine Produkte · Schweiz & Deutschland" />
      <main className="scroll-behind-nav min-h-0 flex-1 overflow-y-auto px-3 pt-3">
        <div className="mb-3 flex gap-2">
          <button className="btn-primary min-h-12 flex-1" onClick={() => setCreating(true)}>
            Produkt erfassen
          </button>
          <button className="btn-soft min-h-12 flex-1" onClick={() => setScan(true)}>
            Barcode scannen
          </button>
        </div>
        <p className="mb-3 px-1 text-sm">
          Verglichen werden dieselben Produkte und Packungsinhalte. Preise sind Beobachtungen; Verfügbarkeit
          und Bedingungen können sich ändern.
        </p>
        {!!baskets.length && (
          <section className="card-surface mb-4 p-4">
            <h2 className="mb-2 font-bold">Deine offene Einkaufsliste</h2>
            <p className="mb-2 text-xs">
              Nur aktuelle Normalpreise ohne Kundenkarte. Fehlende Positionen werden nicht als kostenlos
              gewertet. Bei Packungsware werden ganze Packungen gerechnet.
            </p>
            {baskets.map((basket) => (
              <div key={basket.storeId} className="my-2 text-sm">
                <strong>{stores.find((s) => s.id === basket.storeId)?.name}</strong> · {basket.covered}/
                {basket.requested} Positionen ·{' '}
                {basket.complete
                  ? formatMoney(basket.total, currency)
                  : `${formatMoney(basket.total, currency)} für bekannte Positionen, kein Gesamtpreis`}
              </div>
            ))}
          </section>
        )}
        {product && (
          <>
            <label className="block text-sm font-bold">
              Produkt
              <select
                className="input my-2 w-full"
                value={product.id}
                onChange={(e) => {
                  setSelected(e.target.value)
                  const p = products.find((p) => p.id === e.target.value)
                  setPack(p?.netQuantity ? quantityText(p.netQuantity) : '')
                }}
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.brand ? ` · ${p.brand}` : ''}
                  </option>
                ))}
              </select>
            </label>
            {!product.netQuantity && (
              <p className="my-2 text-sm">Für Grundpreise fehlt der Packungsinhalt. Ergänze ihn:</p>
            )}
            <div className="mb-3 flex gap-2">
              <input
                aria-label="Packungsinhalt"
                className="input min-w-0 flex-1"
                value={pack}
                onChange={(e) => setPack(e.target.value)}
                placeholder="z. B. 500 g"
              />
              <button
                className="btn-soft min-h-11 px-3"
                onClick={() => {
                  const quantity = baseQuantity(pack)
                  if (!quantity || quantity.value <= 0) {
                    setMessage('Bitte Inhalt in g, kg, ml, l oder Stück angeben.')
                    return
                  }
                  useStore
                    .getState()
                    .upsertProduct({ ...product, netQuantity: quantity, updatedAt: new Date().toISOString() })
                  setMessage('Packungsinhalt aktualisiert.')
                }}
              >
                Inhalt speichern
              </button>
            </div>
            <div className="card-surface mb-4 p-4">
              <h2 className="mb-2 font-bold">Preise in {currency}</h2>
              {!rows.length && (
                <p className="text-sm">
                  Noch keine Preise für dieses Produkt. Erfasse deinen ersten Preis oder suche nach
                  öffentlichen Beobachtungen.
                </p>
              )}
              {rows.map(({ observation: p, normalized, stale }) => (
                <article key={p.id} className="border-b py-3" style={{ borderColor: 'var(--border)' }}>
                  <div className="flex justify-between gap-2">
                    <strong className="min-w-0">
                      {stores.find((s) => s.id === p.storeId)?.name ?? 'Geschäft unbekannt'}
                    </strong>
                    <strong>{formatMoney(p.price.minor / 100, p.price.currency)}</strong>
                  </div>
                  <p className="my-1 text-sm">
                    {normalized
                      ? `${formatMoney(normalized.amount, currency)} / ${normalized.unit === 'piece' ? 'Stück' : normalized.unit}`
                      : 'Grundpreis unbekannt · Inhalt oder Wechselkurs ergänzen'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {p.observedAt.slice(0, 10)} ·{' '}
                    {p.source === 'manual'
                      ? 'Eigene Eingabe'
                      : p.source === 'receipt'
                        ? 'Eigener Kassenbon'
                        : 'Open Prices'}
                    {stale ? ' · älter als 14 Tage' : ''}
                    {p.loyaltyRequired ? ' · Kundenkarte erforderlich' : ''}
                    {p.discounted ? ' · Aktionspreis, Bedingungen prüfen' : ''}
                  </p>
                  {p.sourceUrl && (
                    <a
                      href={p.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-11 items-center text-sm underline"
                    >
                      Quelle ansehen
                    </a>
                  )}
                </article>
              ))}
              <button
                disabled={busy || !product.gtins.length}
                className="btn-soft mt-3 min-h-11 w-full"
                onClick={() =>
                  void run(async () => {
                    const result = await fetchOpenPrices(product, configured)
                    result.stores.forEach(useStore.getState().upsertRetailStore)
                    result.observations.forEach(useStore.getState().addPriceObservation)
                    setMessage(
                      `${result.observations.length} Preisbeobachtungen aus CH/DE übernommen. Die Abdeckung kann lückenhaft sein.`
                    )
                  })
                }
              >
                Open Prices abfragen
              </button>
            </div>
            <details className="card-surface mb-4 p-4" open={!rows.length}>
              <summary className="min-h-11 font-bold">Eigenen Packungspreis erfassen</summary>
              <label className="my-2 block text-sm">
                Geschäft / Filiale
                <input className="input mt-1 w-full" value={shop} onChange={(e) => setShop(e.target.value)} />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-sm">
                  Land
                  <select
                    className="input mt-1 w-full"
                    value={country}
                    onChange={(e) => {
                      const c = e.target.value as 'CH' | 'DE'
                      setCountry(c)
                      setInputCurrency(c === 'CH' ? 'CHF' : 'EUR')
                    }}
                  >
                    <option value="CH">Schweiz</option>
                    <option value="DE">Deutschland</option>
                  </select>
                </label>
                <label className="text-sm">
                  Originalwährung
                  <select
                    className="input mt-1 w-full"
                    value={inputCurrency}
                    onChange={(e) => setInputCurrency(e.target.value as Currency)}
                  >
                    <option>CHF</option>
                    <option>EUR</option>
                  </select>
                </label>
              </div>
              <label className="my-2 block text-sm">
                Preis pro Packung
                <input
                  className="input mt-1 w-full"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                />
              </label>
              <label className="my-2 block text-sm">
                Beobachtet am
                <input
                  className="input mt-1 w-full"
                  type="date"
                  max={todayKey()}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </label>
              <label className="my-3 flex min-h-11 items-center gap-2 text-sm">
                <input type="checkbox" checked={loyalty} onChange={(e) => setLoyalty(e.target.checked)} />
                Kundenkarte erforderlich
              </label>
              <button className="btn-primary min-h-12 w-full" onClick={savePrice}>
                Preis speichern
              </button>
            </details>
          </>
        )}
        <details className="card-surface mb-4 p-4">
          <summary className="min-h-11 font-bold">Wechselkurs EUR → CHF</summary>
          <p className="my-2 text-sm">
            {fx
              ? `1 ${fx.base} = ${fx.quotePerBase} ${fx.quote} · Stand ${fx.rateDate} · ${fx.source}`
              : 'Noch kein Kurs gespeichert. Verschiedene Währungen werden bis dahin getrennt angezeigt.'}
          </p>
          <p className="my-2 text-xs">
            Referenzkurs, kein garantierter Bankkurs. Bei fehlender Verbindung bleibt der gespeicherte Kurs
            erhalten.
          </p>
          <button
            disabled={busy}
            className="btn-soft my-2 min-h-11 w-full"
            onClick={() =>
              void run(async () => {
                const next = await fetchFx(configured)
                useStore.getState().setFxSnapshot(next)
                setRate(next.quotePerBase)
                setMessage('Referenzkurs aktualisiert.')
              })
            }
          >
            Referenzkurs aktualisieren
          </button>
          <label className="block text-sm">
            Oder eigenen Kurs festlegen: 1 EUR in CHF
            <input
              className="input my-2 w-full"
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
            />
          </label>
          <button
            className="btn-soft min-h-11 px-3"
            onClick={() => {
              const value = Number(rate.replace(',', '.'))
              if (!(value > 0 && value < 1000)) {
                setMessage('Ungültiger Wechselkurs.')
                return
              }
              useStore
                .getState()
                .setFxSnapshot({
                  id: uid(),
                  base: 'EUR',
                  quote: 'CHF',
                  quotePerBase: String(value),
                  rateDate: todayKey(),
                  fetchedAt: new Date().toISOString(),
                  source: 'Eigener Kurs',
                })
              setMessage('Eigener Kurs gespeichert.')
            }}
          >
            Eigenen Kurs speichern
          </button>
        </details>
        {message && (
          <p role="status" className="mb-4 px-1 text-sm">
            {message}
          </p>
        )}
        <p className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Open Food Facts / Open Prices: offene Community-Daten, ODbL. Keine vollständige Händlerabdeckung.
          Produktinformationen und Preisbeobachtungen werden getrennt gespeichert.
        </p>
      </main>
      {creating && (
        <Sheet onClose={() => setCreating(false)}>
          <h2 className="text-xl font-bold">Produkt erfassen</h2>
          <label className="my-3 text-sm">
            Name, Marke und Variante
            <input
              className="input mt-2 w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Vollmilch 3,5 %"
            />
          </label>
          <label className="mb-3 text-sm">
            Packungsinhalt
            <input className="input mt-2 w-full" value={pack} onChange={(e) => setPack(e.target.value)} />
          </label>
          <button
            className="btn-primary min-h-12"
            disabled={!name.trim()}
            onClick={() => {
              const quantity = baseQuantity(pack)
              if (!quantity || quantity.value <= 0) return
              const p: CatalogProduct = {
                id: uid(),
                name: name.trim(),
                category: 'Sonstiges',
                gtins: [],
                netQuantity: quantity,
                source: 'manual',
                updatedAt: new Date().toISOString(),
              }
              useStore.getState().upsertProduct(p)
              setSelected(p.id)
              setCreating(false)
              setName('')
            }}
          >
            Produkt speichern
          </button>
        </Sheet>
      )}
      {scan && (
        <Suspense fallback={null}>
          <Scanner
            onClose={() => setScan(false)}
            onAdded={() => setMessage('Produkt im Katalog und auf der Liste gespeichert.')}
          />
        </Suspense>
      )}
    </>
  )
}
