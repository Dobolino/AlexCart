import { useState } from 'react'
import { Sheet } from './Sheet'
import { MarketSelector } from './MarketSelector'
import { useStore } from '@/store/useStore'
import { CATEGORIES } from '@/data/products'
import { RETAILERS, retailSelection, retailCurrency, type RetailSelection } from '@/data/retailCatalog'

export function StoreLayoutSheet({ onClose }: { onClose: () => void }) {
  const session = useStore((s) => s.shoppingSession)
  const settings = useStore((s) => s.settings)
  const layouts = useStore((s) => s.storeLayouts)
  const [choice, setChoice] = useState(() => retailSelection(settings, session?.store))
  const retailer = RETAILERS.find((r) => r.id === choice.retailerId)!
  const [branch, setBranch] = useState(
    session?.store?.startsWith(retailer.name) ? session.store.slice(retailer.name.length).trim() : ''
  )
  const store = `${retailer.name}${branch.trim() ? ` ${branch.trim()}` : ''}`
  const layoutKey = `${retailCurrency(choice.country)}:${store}`
  const initial = layouts[layoutKey] ?? []
  const [order, setOrder] = useState([...initial, ...CATEGORIES.filter((c) => !initial.includes(c))])
  const locked = !!session?.checkedItemIds.length
  function choose(next: RetailSelection) {
    setChoice(next)
    setBranch('')
    const name = RETAILERS.find((r) => r.id === next.retailerId)!.name
    const saved = layouts[`${retailCurrency(next.country)}:${name}`] ?? []
    setOrder([...saved, ...CATEGORIES.filter((c) => !saved.includes(c))])
  }
  function changeBranch(value: string) {
    setBranch(value)
    const key = `${retailCurrency(choice.country)}:${retailer.name}${value.trim() ? ` ${value.trim()}` : ''}`
    const saved = layouts[key] ?? []
    setOrder([...saved, ...CATEGORIES.filter((c) => !saved.includes(c))])
  }
  return (
    <Sheet onClose={onClose} tall>
      <h2 className="mb-3 text-xl font-bold">Dein Supermarkt</h2>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <MarketSelector value={choice} onChange={choose} lockCountry={locked} />
        {locked && (
          <p className="my-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Geschäft und Land bleiben für diesen begonnenen Einkauf erhalten. Für einen Wechsel zuerst den
            Einkauf abschließen.
          </p>
        )}
        <label className="my-3 block text-sm font-semibold">
          Filiale (optional)
          <input
            className="input mt-1 w-full"
            value={branch}
            onChange={(e) => changeBranch(e.target.value)}
            placeholder="z. B. Bahnhof"
          />
        </label>
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
      </div>
      <button
        className="btn-primary mt-3 min-h-12 shrink-0"
        onClick={() => {
          useStore.getState().setRetailSelection(choice)
          useStore.getState().setShoppingStore(store, choice.country)
          useStore.getState().setStoreLayout(layoutKey, order)
          onClose()
        }}
      >
        Geschäft übernehmen
      </button>
    </Sheet>
  )
}
