import { useState } from 'react'
import { Sheet } from './Sheet'
import { MarketSelector } from './MarketSelector'
import { useStore } from '@/store/useStore'
import { CATEGORIES } from '@/data/products'
import { RETAILERS, retailSelection, retailCurrency, type RetailSelection } from '@/data/retailCatalog'
import {
  locationForList,
  sessionPurchaseIds,
  hasRecordedPrices,
  correctedShoppingCurrency,
} from '@/store/shoppingLocation'

export function StoreLayoutSheet({ onClose, tripId }: { onClose: () => void; tripId?: string }) {
  const session = useStore((s) => s.shoppingSession)
  const list = useStore((s) => s.activeList())
  const settings = useStore((s) => s.settings)
  const stores = useStore((s) => s.retailStores)
  const trips = useStore((s) => s.completedTrips)
  const log = useStore((s) => s.purchaseLog)
  const layouts = useStore((s) => s.storeLayouts)
  const trip = trips.find((trip) => trip.id === tripId)
  const activeSession = !tripId && session?.listId === list?.id ? session : null
  const fallback = list ? locationForList(settings, stores, list) : undefined
  const existingStore = trip ? trip.store : (activeSession?.store ?? fallback?.name)
  const known = stores.find(
    (store) => store.id === (trip ? trip.storeId : (activeSession?.storeId ?? fallback?.id))
  )
  const originalCurrency = trip
    ? (trip.currency ?? 'CHF')
    : (activeSession?.currency ?? fallback?.currency ?? settings.currency)
  const initialCountry = known?.country ?? trip?.country
  const [choice, setChoice] = useState(() =>
    retailSelection(
      { currency: initialCountry ? retailCurrency(initialCountry) : originalCurrency },
      existingStore
    )
  )
  const retailer = RETAILERS.find((r) => r.id === choice.retailerId)!
  const [branch, setBranch] = useState(
    existingStore?.startsWith(retailer.name) ? existingStore.slice(retailer.name.length).trim() : ''
  )
  const [correctCurrency, setCorrectCurrency] = useState(false)
  const store = `${retailer.name}${branch.trim() ? ` ${branch.trim()}` : ''}`
  const targetCurrency = retailCurrency(choice.country)
  const ids = trip
    ? new Set(trip.items.flatMap((item) => (item.purchaseLogId ? [item.purchaseLogId] : [])))
    : sessionPurchaseIds(activeSession, list ?? undefined, log, trips)
  const linked = log.filter((entry) => entry.id && ids.has(entry.id))
  const hasPrices = hasRecordedPrices(linked) || !!trip?.items.some((item) => item.price !== undefined)
  const savedCurrency = correctedShoppingCurrency(
    originalCurrency,
    targetCurrency,
    hasPrices,
    correctCurrency
  )
  const layoutKey = `${targetCurrency}:${store}`
  const initial = layouts[layoutKey] ?? []
  const [order, setOrder] = useState([...initial, ...CATEGORIES.filter((c) => !initial.includes(c))])
  function choose(next: RetailSelection) {
    setChoice(next)
    setBranch('')
    setCorrectCurrency(false)
    const name = RETAILERS.find((r) => r.id === next.retailerId)!.name
    const saved = layouts[`${retailCurrency(next.country)}:${name}`] ?? []
    setOrder([...saved, ...CATEGORIES.filter((c) => !saved.includes(c))])
  }
  function changeBranch(value: string) {
    setBranch(value)
    const key = `${targetCurrency}:${retailer.name}${value.trim() ? ` ${value.trim()}` : ''}`
    const saved = layouts[key] ?? []
    setOrder([...saved, ...CATEGORIES.filter((c) => !saved.includes(c))])
  }
  return (
    <Sheet onClose={onClose} tall>
      <h2 className="mb-2 shrink-0 text-xl font-bold">Einkaufsort ändern</h2>
      <p className="mb-3 shrink-0 text-xs" style={{ color: 'var(--text-muted)' }}>
        {trip
          ? 'Für diesen abgeschlossenen Einkauf und seine verknüpften Preise.'
          : 'Für diese Liste merken – auch nach dem Abhaken änderbar.'}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            className="btn-soft min-h-11 px-2 text-sm"
            onClick={() => choose({ country: 'CH', retailerId: 'migros' })}
          >
            Migros · Schweiz
          </button>
          <button
            className="btn-soft min-h-11 px-2 text-sm"
            onClick={() => choose({ country: 'DE', retailerId: 'edeka' })}
          >
            EDEKA · Deutschland
          </button>
        </div>
        <MarketSelector value={choice} onChange={choose} />
        <label className="my-3 block text-sm font-semibold">
          Filiale (optional)
          <input
            className="input mt-1 w-full"
            value={branch}
            onChange={(e) => changeBranch(e.target.value)}
            placeholder="z. B. Bahnhof"
          />
        </label>
        <div className="card-surface my-3 p-3 text-sm">
          <p className="font-semibold">
            {store} · {choice.country === 'CH' ? 'Schweiz' : 'Deutschland'}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            {trip
              ? `${trip.items.length} Bonpositionen`
              : activeSession
                ? `${activeSession.checkedItemIds.length} abgehakte Artikel`
                : 'Nächste Käufe auf dieser Liste'}{' '}
            · Preise in {savedCurrency}
          </p>
          {hasPrices && originalCurrency !== targetCurrency && (
            <div className="mt-3 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              <p className="mb-2 text-xs">
                Vorhandene Beträge bleiben in {originalCurrency}. Falls nur die Währungsangabe falsch war,
                kannst du sie ausdrücklich korrigieren.
              </p>
              <label className="flex min-h-11 items-start gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={correctCurrency}
                  onChange={(e) => setCorrectCurrency(e.target.checked)}
                />
                Währungsangabe korrigieren: {targetCurrency} statt {originalCurrency}
              </label>
              {correctCurrency && (
                <p className="mt-1 text-xs">
                  Die Zahlen bleiben gleich. Nur bestätigen, wenn die Beträge tatsächlich in {targetCurrency}{' '}
                  erfasst wurden. Es findet keine Umrechnung statt.
                </p>
              )}
            </div>
          )}
        </div>
        {!tripId && (
          <details className="card-surface my-3 p-3">
            <summary className="min-h-11 cursor-pointer text-sm font-bold">Laufweg bearbeiten</summary>
            <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Reihenfolge der Abteilungen für {store}.
            </p>
            {order.map((category, index) => (
              <div
                key={category}
                className="flex items-center gap-2 border-b py-1"
                style={{ borderColor: 'var(--border)' }}
              >
                <span className="min-w-0 flex-1 text-sm">{category}</span>
                {[-1, 1].map((delta) => (
                  <button
                    key={delta}
                    className="btn-soft h-11 w-11 shrink-0"
                    disabled={index + delta < 0 || index + delta >= order.length}
                    aria-label={`${category} nach ${delta < 0 ? 'oben' : 'unten'}`}
                    onClick={() =>
                      setOrder((items) => {
                        const next = [...items]
                        ;[next[index], next[index + delta]] = [next[index + delta]!, next[index]!]
                        return next
                      })
                    }
                  >
                    {delta < 0 ? '↑' : '↓'}
                  </button>
                ))}
              </div>
            ))}
          </details>
        )}
      </div>
      <button
        className="btn-primary mt-3 min-h-12 shrink-0"
        onClick={() => {
          const state = useStore.getState()
          if (tripId) state.updateCompletedTripLocation(tripId, store, choice.country, correctCurrency)
          else if (list) {
            state.setListShoppingStore(list.id, store, choice.country, correctCurrency)
            state.setStoreLayout(layoutKey, order)
          }
          onClose()
        }}
      >
        Geschäft übernehmen
      </button>
    </Sheet>
  )
}
