import { useState } from 'react'
import { Sheet } from './Sheet'
import { StoreLayoutSheet } from './StoreLayoutSheet'
import { ShoppingLocationButton } from './ShoppingLocationButton'
import { useStore } from '@/store/useStore'
import { sessionPurchaseIds } from '@/store/shoppingLocation'
import { formatMoney } from '@/utils/currency'

export function FinishShoppingSheet({
  listId,
  initialName,
  onClose,
  onFinished,
}: {
  listId: string
  initialName?: string
  onClose: () => void
  onFinished: (newList: boolean) => void
}) {
  const list = useStore((state) => state.lists.find((list) => list.id === listId))
  const session = useStore((state) => state.shoppingSession)
  const log = useStore((state) => state.purchaseLog)
  const trips = useStore((state) => state.completedTrips)
  const [name, setName] = useState(initialName ?? list?.name ?? 'Neue Liste')
  const [carryOpen, setCarryOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [error, setError] = useState('')
  const [startedAt] = useState(session?.startedAt)
  if (!list) return null
  const current = session?.listId === listId ? session : null
  const checked = new Set(current?.checkedItemIds ?? [])
  const count = list.items.filter((item) => item.done && checked.has(item.id)).length
  const openCount = list.items.filter((item) => !item.done).length
  const ids = sessionPurchaseIds(current, list, log, trips)
  const priced = log.filter((entry) => entry.id && ids.has(entry.id) && entry.price !== undefined)
  const currency = current?.currency ?? 'CHF'
  const total = priced
    .filter((entry) => (entry.currency ?? 'CHF') === currency)
    .reduce((sum, entry) => sum + entry.price!, 0)
  function finish(createNewList: boolean) {
    const result = useStore
      .getState()
      .finishShopping(listId, { createNewList, carryOpen, name, expectedStartedAt: startedAt })
    if (!result.ok) setError(result.error ?? 'Der Einkauf konnte nicht abgeschlossen werden.')
    else onFinished(createNewList)
  }
  return (
    <Sheet onClose={onClose} tall>
      <h2 className="mb-2 shrink-0 text-xl font-bold">Einkauf abschließen?</h2>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <section className="card-surface mb-3 p-3">
          <p className="font-bold">
            {count} gekauft · {openCount} noch offen
          </p>
          <p className="mt-1 text-sm">
            {formatMoney(total, currency)} erfasst · {priced.length} von {count} mit Preis
          </p>
        </section>
        <ShoppingLocationButton onClick={() => setLocationOpen(true)} />
        <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {count
            ? 'Der Einkauf bleibt als Bon im Verlauf.'
            : 'Ohne gekaufte Artikel wird die Sitzung ohne Bon beendet.'}{' '}
          Erledigte Artikel werden aus der Arbeitsliste entfernt; deine Preise und dein Vorrat bleiben
          erhalten.
        </p>
        <label className="mb-3 block text-sm font-semibold">
          Name der neuen Liste
          <input
            className="input mt-1 w-full"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="z. B. Migros"
          />
        </label>
        {!!openCount && (
          <label className="card-surface mb-3 flex min-h-12 items-center gap-3 p-3 text-sm">
            <input
              type="checkbox"
              checked={carryOpen}
              onChange={(event) => setCarryOpen(event.target.checked)}
            />
            {openCount} offene Artikel in die neue Liste übernehmen
          </label>
        )}
        <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Die neue Liste startet {carryOpen && openCount ? `mit ${openCount} offenen Artikeln` : 'leer'}. Ohne
          Übernahme bleiben offene Artikel auf der bisherigen Liste.
        </p>
        {error && (
          <p role="alert" className="my-2 text-sm" style={{ color: 'var(--danger)' }}>
            {error}
          </p>
        )}
      </div>
      <button className="btn-primary mt-3 min-h-12 shrink-0" onClick={() => finish(true)}>
        Abschließen & neue Liste
      </button>
      <button className="btn-soft mt-2 min-h-11 shrink-0" onClick={() => finish(false)}>
        Nur Einkauf abschließen
      </button>
      {locationOpen && <StoreLayoutSheet onClose={() => setLocationOpen(false)} />}
    </Sheet>
  )
}
