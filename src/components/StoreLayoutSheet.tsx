import { useState } from 'react'
import { Sheet } from './Sheet'
import { useStore } from '@/store/useStore'
import { CATEGORIES } from '@/data/products'
import { storePresetsForCurrency } from '@/constants/stores'

export function StoreLayoutSheet({ onClose }: { onClose: () => void }) {
  const session = useStore((s) => s.shoppingSession)
  const currency = useStore((s) => s.settings.currency)
  const layouts = useStore((s) => s.storeLayouts)
  const [country, setCountry] = useState<'CH' | 'DE'>(session?.currency === 'EUR' ? 'DE' : 'CH')
  const [error, setError] = useState('')
  const [store, setStore] = useState(session?.store ?? '')
  const key = `${country === 'CH' ? 'CHF' : 'EUR'}:${store.trim()}`
  const saved = layouts[key] ?? []
  const [order, setOrder] = useState<string[]>([...saved, ...CATEGORIES.filter((c) => !saved.includes(c))])
  function selectStore(value: string) {
    setStore(value)
    const existing = layouts[`${session?.currency ?? currency}:${value.trim()}`] ?? []
    setOrder([...existing, ...CATEGORIES.filter((c) => !existing.includes(c))])
  }
  return (
    <Sheet onClose={onClose} tall>
      <h2 className="mb-3 text-xl font-bold">Geschäft & Laufweg</h2>
      <label className="text-sm font-semibold">
        Einkaufsland
        <select
          className="input my-2 w-full"
          value={country}
          onChange={(e) => setCountry(e.target.value as 'CH' | 'DE')}
        >
          <option value="CH">Schweiz · CHF</option>
          <option value="DE">Deutschland · EUR</option>
        </select>
      </label>
      <label className="text-sm font-semibold">
        Geschäft oder Filiale
        <input
          className="input my-2 w-full"
          list="shopping-stores"
          placeholder="z. B. Coop Bahnhof"
          value={store}
          onChange={(e) => selectStore(e.target.value)}
        />
      </label>
      <datalist id="shopping-stores">
        {storePresetsForCurrency(session?.currency ?? currency).map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <p className="mb-3 text-sm">
        Ordne die Abteilungen einmal passend zum Laden. Die Reihenfolge bleibt für diese Filiale gespeichert.
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {order.map((category, index) => (
          <div
            key={category}
            className="flex items-center gap-2 border-b py-1"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="min-w-0 flex-1 text-sm">{category}</span>
            <button
              className="btn-soft h-11 w-11"
              disabled={index === 0}
              aria-label={`${category} nach oben`}
              onClick={() =>
                setOrder((items) => {
                  const next = [...items]
                  ;[next[index - 1], next[index]] = [next[index]!, next[index - 1]!]
                  return next
                })
              }
            >
              ↑
            </button>
            <button
              className="btn-soft h-11 w-11"
              disabled={index === order.length - 1}
              aria-label={`${category} nach unten`}
              onClick={() =>
                setOrder((items) => {
                  const next = [...items]
                  ;[next[index + 1], next[index]] = [next[index]!, next[index + 1]!]
                  return next
                })
              }
            >
              ↓
            </button>
          </div>
        ))}
      </div>
      {error && (
        <p role="alert" className="my-2 text-sm">
          {error}
        </p>
      )}
      <button
        className="btn-primary mt-3 min-h-12"
        disabled={!store.trim()}
        onClick={() => {
          if (session?.checkedItemIds.length && (country === 'CH' ? 'CHF' : 'EUR') !== session.currency) {
            setError('Bitte den aktuellen Einkauf abschließen, bevor du die Währung wechselst.')
            return
          }
          useStore.getState().setShoppingStore(store.trim(), country)
          useStore.getState().setStoreLayout(key, order)
          onClose()
        }}
      >
        Laufweg speichern
      </button>
    </Sheet>
  )
}
