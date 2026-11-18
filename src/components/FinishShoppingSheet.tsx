import { useState } from 'react'
import { Sheet } from './Sheet'
import { StoreLayoutSheet } from './StoreLayoutSheet'
import { ShoppingLocationButton } from './ShoppingLocationButton'
import { useStore } from '@/store/useStore'
import { sessionPurchaseIds } from '@/store/shoppingLocation'
import { formatMoney } from '@/utils/currency'
import { CheckoffPriceSheet } from './CheckoffPriceSheet'
import { findPriceProfile } from '@/utils/priceProfiles'
import type { ShoppingItem } from '@/types'

export function FinishShoppingSheet({
  listId,
  initialName,
  onClose,
  onFinished,
}: {
  listId: string
  initialName?: string
  onClose: () => void
  onFinished: (newList: boolean, tripId?: string) => void
}) {
  const list = useStore((state) => state.lists.find((list) => list.id === listId))
  const session = useStore((state) => state.shoppingSession)
  const log = useStore((state) => state.purchaseLog)
  const trips = useStore((state) => state.completedTrips)
  const [name, setName] = useState(initialName ?? list?.name ?? 'Neue Liste')
  const [carryOpen, setCarryOpen] = useState(false)
  const [carryIds, setCarryIds] = useState<string[]>([])
  const [editing, setEditing] = useState<ShoppingItem | null>(null)
  const brands = useStore((state) => state.brands)
  const profiles = useStore((state) => state.priceProfiles)
  const [locationOpen, setLocationOpen] = useState(false)
  const [error, setError] = useState('')
  const [startedAt] = useState(session?.startedAt)
  if (!list) return null
  const current = session?.listId === listId ? session : null
  const checked = new Set(current?.checkedItemIds ?? [])
  const count = list.items.filter((item) => item.done && checked.has(item.id)).length
  const openCount = list.items.filter((item) => !item.done).length
  const openItems = list.items.filter((item) => !item.done)
  const ids = sessionPurchaseIds(current, list, log, trips)
  const priced = log.filter((entry) => entry.id && ids.has(entry.id) && entry.price !== undefined)
  const currency = current?.currency ?? 'CHF'
  const missing = list.items.filter(
    (item) => item.done && checked.has(item.id) && !priced.some((entry) => entry.id === item.purchaseLogId)
  )
  const total = priced
    .filter((entry) => (entry.currency ?? 'CHF') === currency)
    .reduce((sum, entry) => sum + entry.price!, 0)
  function finish(createNewList: boolean) {
    const result = useStore.getState().finishShopping(listId, {
      createNewList,
      name,
      expectedStartedAt: startedAt,
      carryOpenIds: carryIds,
      discardOpenIds: openItems.filter((item) => !carryIds.includes(item.id)).map((item) => item.id),
    })
    if (!result.ok) setError(result.error ?? 'Der Einkauf konnte nicht abgeschlossen werden.')
    else onFinished(createNewList, result.tripId)
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
            {formatMoney(total, currency)} bestätigt · {priced.length} von {count} mit Preis
          </p>
        </section>
        {missing.length > 0 && (
          <section className="mb-4" aria-label="Fehlende Preise">
            <h3 className="eyebrow mb-2">{missing.length} Preise fehlen</h3>
            <div className="card-surface">
              {missing.map((item) => (
                <div key={item.id} className="cart-row">
                  <span className="min-w-0 flex-1 break-words">
                    {item.name}
                    <small>{item.amount}</small>
                  </span>
                  <button
                    className="btn-soft min-h-11 px-3 text-sm"
                    onClick={() => setEditing(item)}
                    aria-label={`Preis für ${item.name} nachtragen`}
                  >
                    Preis nachtragen
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
              Ohne bestätigten Preis zählt der Artikel nicht zu den Ausgaben. Du kannst ihn später am Bon
              ergänzen.
            </p>
          </section>
        )}
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
              onChange={(event) => {
                setCarryOpen(event.target.checked)
                setCarryIds(event.target.checked ? openItems.map((item) => item.id) : [])
              }}
            />
            {openCount} offene Artikel in die neue Liste übernehmen
          </label>
        )}
        {openCount > 0 && (
          <div className="card-surface mb-3">
            {openItems.map((item) => (
              <label key={item.id} className="cart-row text-sm">
                <input
                  type="checkbox"
                  aria-label={`${item.name} auf nächste Liste`}
                  checked={carryIds.includes(item.id)}
                  onChange={(event) => {
                    const next = event.target.checked
                      ? [...carryIds, item.id]
                      : carryIds.filter((id) => id !== item.id)
                    setCarryIds(next)
                    setCarryOpen(next.length === openCount)
                  }}
                />
                <span className="min-w-0 flex-1 break-words">
                  {item.name}
                  <small>{item.amount}</small>
                </span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {carryIds.includes(item.id) ? 'auf nächste Liste' : 'entfernen'}
                </span>
              </label>
            ))}
          </div>
        )}
        <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Ausgewählte offene Artikel werden übernommen; nicht ausgewählte werden entfernt. Die neue Liste
          startet {carryIds.length ? `mit ${carryIds.length} offenen Artikeln` : 'leer'}.
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
      {editing && (
        <CheckoffPriceSheet
          item={editing}
          profile={findPriceProfile(profiles, editing.name, editing.category) ?? null}
          brands={brands}
          currency={currency}
          onClose={() => setEditing(null)}
          onSkip={() => setEditing(null)}
          skipLabel="Ohne Änderung zurück"
          onAmountChange={(amount) => setEditing((item) => (item ? { ...item, amount } : null))}
          onSave={(data) => {
            const state = useStore.getState()
            state.updateItemInActiveList(editing.id, { amount: editing.amount })
            state.updatePurchaseLogPrice(editing, data)
            setEditing(null)
          }}
        />
      )}
    </Sheet>
  )
}
