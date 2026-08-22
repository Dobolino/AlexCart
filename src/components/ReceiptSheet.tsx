import { useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { formatMoney, parseMoneyInput } from '@/utils/currency'
import { timestampToDateKey } from '@/utils/date'
import { tripTotalSpent } from '@/utils/stats'
import { shareReceiptImage } from '@/utils/receiptExport'
import type { CompletedTrip, Currency } from '@/types'

interface ReceiptSheetProps {
  trip: CompletedTrip
  currency: Currency
  onClose: () => void
  onUpdatePrice: (itemId: string, price: number | undefined) => void
  onUpdateStore: (store: string | undefined) => void
  onUpdateDate: (dateKey: string) => void
  onRemoveItem: (itemId: string) => void
  onDeleteTrip: () => void
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
export function ReceiptSheet({ trip, currency, onClose, onUpdatePrice, onUpdateStore, onUpdateDate, onRemoveItem, onDeleteTrip }: ReceiptSheetProps) {
  const total = tripTotalSpent(trip)
  const [editingStore, setEditingStore] = useState(false)
  const [storeDraft, setStoreDraft] = useState('')
  const purchaseDate = timestampToDateKey(trip.completedAt)

  function startEditStore() {
    setStoreDraft(trip.store ?? '')
    setEditingStore(true)
  }

  function saveStore() {
    onUpdateStore(storeDraft.trim() || undefined)
    setEditingStore(false)
  }

  return (
    <Sheet onClose={onClose} tall>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0">
          <h2 className="mb-0.5 text-lg font-bold leading-tight">{trip.listName}</h2>
          <p className="mb-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {formatTripDate(trip.completedAt)} · {trip.items.length} Artikel
          </p>
          <label className="mb-2 block text-[12px] font-bold" style={{ color: 'var(--text-muted)' }}>
            Einkaufsdatum
          </label>
          <input
            type="date"
            className="input mb-3 w-full py-3 text-[15px] font-semibold"
            value={purchaseDate}
            max={new Date().toLocaleDateString('sv-SE')}
            onChange={(e) => {
              const next = e.target.value
              if (next) onUpdateDate(next)
            }}
          />
          <button
            type="button"
            className="tap-scale mb-3 flex w-full items-center justify-between rounded-full border px-4 py-2.5 text-left text-[14px]"
            style={{ borderColor: 'var(--border)' }}
            onClick={startEditStore}
          >
            <span
              className="truncate"
              style={{ color: trip.store ? 'var(--text)' : 'var(--text-muted)', fontWeight: trip.store ? 600 : 400 }}
            >
              {trip.store || 'Einkaufszentrum hinzufügen'}
            </span>
            <span className="shrink-0" style={{ color: 'var(--text-muted)' }}>
              <Icon path={ICON_PATHS.edit} size={15} />
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {trip.items.map((item) => (
            <ReceiptRow
              key={item.id}
              item={item}
              currency={currency}
              onUpdatePrice={onUpdatePrice}
              onRemove={() => onRemoveItem(item.id)}
            />
          ))}
          {trip.items.length === 0 && (
            <p className="py-6 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Keine Artikel mehr in dieser Quittung.
            </p>
          )}
        </div>

        <div className="shrink-0 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[14px] font-bold">Summe</span>
            <span className="text-[20px] font-extrabold tabular-nums">{formatMoney(total, currency)}</span>
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              className="btn-soft flex flex-1 items-center justify-center gap-2 py-3 text-[14px] font-bold"
              onClick={() => {
                void shareReceiptImage(trip, currency)
              }}
            >
              <Icon path={ICON_PATHS.share} size={16} />
              Als Kassenbon teilen
            </button>
            <button
              type="button"
              className="tap-scale flex h-11 w-11 flex-none items-center justify-center rounded-xl"
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
              onClick={() => {
                if (window.confirm('Diesen Einkauf aus dem Verlauf löschen?')) onDeleteTrip()
              }}
              aria-label="Einkauf löschen"
            >
              <Icon path={ICON_PATHS.trash} size={17} />
            </button>
          </div>
        </div>
      </div>

      {editingStore && (
        <Sheet onClose={() => setEditingStore(false)}>
          <h2 className="mb-3 text-lg font-bold">Einkaufszentrum</h2>
          <input
            type="text"
            className="input w-full py-3 text-[15px]"
            placeholder="z. B. Migros Zürich HB"
            value={storeDraft}
            onChange={(e) => setStoreDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveStore()
            }}
            autoFocus
          />
          <div className="mt-4 flex gap-2.5">
            <button className="btn-soft flex-1 py-3.5 text-[15px]" onClick={() => setEditingStore(false)}>
              Abbrechen
            </button>
            <button className="btn-primary flex-1 py-3.5 text-[15px]" onClick={saveStore}>
              Speichern
            </button>
          </div>
        </Sheet>
      )}
    </Sheet>
  )
}

function ReceiptRow({
  item,
  currency,
  onUpdatePrice,
  onRemove,
}: {
  item: { id: string; name: string; amount: string; price?: number }
  currency: Currency
  onUpdatePrice: (itemId: string, price: number | undefined) => void
  onRemove: () => void
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
        <button
          type="button"
          className="tap-scale ml-1 flex h-8 w-8 flex-none items-center justify-center rounded-full"
          style={{ color: 'var(--text-muted)' }}
          onClick={onRemove}
          aria-label={`${item.name} aus Quittung entfernen`}
        >
          <Icon path={ICON_PATHS.trash} size={15} />
        </button>
      </div>
    </div>
  )
}
