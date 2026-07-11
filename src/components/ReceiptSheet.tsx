import { useState } from 'react'
import { Sheet } from './Sheet'
import { formatMoney, parseMoneyInput } from '@/utils/currency'
import { tripTotalSpent } from '@/utils/stats'
import type { CompletedTrip, Currency } from '@/types'

interface ReceiptSheetProps {
  trip: CompletedTrip
  currency: Currency
  onClose: () => void
  onUpdatePrice: (itemId: string, price: number | undefined) => void
  onUpdateStore: (store: string | undefined) => void
}

function formatTripDate(completedAt: number): string {
  const d = new Date(completedAt)
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${d.toLocaleTimeString(
    'de-DE',
    { hour: '2-digit', minute: '2-digit' }
  )}`
}

/** Quittung eines abgeschlossenen Einkaufs - Preise pro Artikel und das Einkaufszentrum lassen
 *  sich hier nachträglich korrigieren, z. B. wenn beim Abhaken etwas falsch eingegeben wurde. */
export function ReceiptSheet({ trip, currency, onClose, onUpdatePrice, onUpdateStore }: ReceiptSheetProps) {
  const total = tripTotalSpent(trip)
  const [storeInput, setStoreInput] = useState(trip.store ?? '')
  const [storeId, setStoreId] = useState(trip.id)

  if (storeId !== trip.id) {
    setStoreId(trip.id)
    setStoreInput(trip.store ?? '')
  }

  function saveStore() {
    const trimmed = storeInput.trim()
    if (trimmed !== (trip.store ?? '')) onUpdateStore(trimmed || undefined)
  }

  return (
    <Sheet onClose={onClose} tall>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0">
          <h2 className="mb-0.5 text-lg font-bold leading-tight">{trip.listName}</h2>
          <p className="mb-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {formatTripDate(trip.completedAt)} · {trip.items.length} Artikel
          </p>
          <input
            type="text"
            className="input mb-3 w-full py-2 text-[14px]"
            placeholder="Einkaufszentrum (optional)"
            value={storeInput}
            onChange={(e) => setStoreInput(e.target.value)}
            onBlur={saveStore}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveStore()
                ;(e.target as HTMLInputElement).blur()
              }
            }}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {trip.items.map((item) => (
            <ReceiptRow key={item.id} item={item} currency={currency} onUpdatePrice={onUpdatePrice} />
          ))}
        </div>

        <div className="shrink-0 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold">Summe</span>
            <span className="text-[20px] font-extrabold tabular-nums">{formatMoney(total, currency)}</span>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

function ReceiptRow({
  item,
  currency,
  onUpdatePrice,
}: {
  item: { id: string; name: string; amount: string; price?: number }
  currency: Currency
  onUpdatePrice: (itemId: string, price: number | undefined) => void
}) {
  const [priceInput, setPriceInput] = useState(item.price !== undefined ? String(item.price) : '')

  function save() {
    const parsed = priceInput.trim() ? parseMoneyInput(priceInput) : null
    onUpdatePrice(item.id, parsed !== null && parsed > 0 ? parsed : undefined)
  }

  return (
    <div className="mb-2.5 flex items-center gap-2.5 border-b pb-2.5 last:mb-0 last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold">{item.name}</div>
        {item.amount && (
          <div className="truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {item.amount}
          </div>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <input
          type="text"
          inputMode="decimal"
          className="input w-20 py-1.5 text-right text-[14px] tabular-nums"
          placeholder="–"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              save()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
        />
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          {currency}
        </span>
      </div>
    </div>
  )
}
