import { todayKey } from '@/utils/date'
import { useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { isLowStock, canDecrementPantryAmount } from '@/utils/pantry'
import type { PantryItem } from '@/types'

interface PantryItemRowProps {
  item: PantryItem
  flash?: boolean
  onEdit: () => void
  onRemove: () => void
  onDecrement: () => void
}

export function PantryItemRow({ item, flash = false, onEdit, onRemove, onDecrement }: PantryItemRowProps) {
  const low = isLowStock(item)
  const canDecrement = canDecrementPantryAmount(item.amount)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div
      className={`flex items-center justify-between gap-2 border-b px-3.5 py-3.5 last:border-b-0 transition-opacity duration-300 ${
        flash ? 'opacity-40' : 'opacity-100'
      }`}
      style={{ borderColor: 'var(--border)' }}
    >
      <button
        type="button"
        className="tap-scale min-h-11 min-w-0 flex-1 text-left"
        aria-label={`${item.name} bearbeiten`}
        onClick={onEdit}
      >
        <span className="block truncate text-[15px] font-semibold">{item.name}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {item.amount ? `Bestand: ${item.amount}` : 'Kein Bestand erfasst'}
          {item.minAmount ? ` · min ${item.minAmount}` : ''}
        </span>
        {item.expiresOn && (
          <span
            className="mt-1 block text-xs font-semibold"
            style={{ color: item.expiresOn <= todayKey() ? 'var(--danger)' : 'var(--text-muted)' }}
          >
            MHD {item.expiresOn}
            {item.expiresOn <= todayKey() ? ' · vor Verwendung prüfen' : ''}
          </span>
        )}
        {low && (
          <span
            className="mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
          >
            Nachkauf
          </span>
        )}
      </button>

      <button
        type="button"
        className="tap-scale flex h-11 w-11 flex-none items-center justify-center rounded-full disabled:opacity-35"
        style={{
          background: 'var(--chip-bg)',
          color: canDecrement ? 'var(--accent)' : 'var(--text-muted)',
        }}
        onClick={(e) => {
          e.stopPropagation()
          if (canDecrement) onDecrement()
        }}
        disabled={!canDecrement}
        aria-label={`${item.name}: Bestand verringern`}
      >
        <Icon path={ICON_PATHS.minus} size={18} />
      </button>

      <button
        type="button"
        className="tap-scale flex h-11 w-11 flex-none items-center justify-center rounded-full"
        style={{ color: 'var(--text-muted)' }}
        onClick={() => setMenuOpen(true)}
        aria-label={`Aktionen für ${item.name}`}
      >
        <Icon path={ICON_PATHS.more} size={18} />
      </button>
      {menuOpen && (
        <Sheet onClose={() => setMenuOpen(false)}>
          <h2 className="mb-3 text-lg font-bold">{item.name}</h2>
          <button
            className="btn-soft mb-2 min-h-12"
            onClick={() => {
              setMenuOpen(false)
              onEdit()
            }}
          >
            Bearbeiten
          </button>
          <button
            className="min-h-12 rounded-2xl font-semibold"
            style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}
            onClick={() => {
              setMenuOpen(false)
              onRemove()
            }}
          >
            Aus Vorrat entfernen
          </button>
        </Sheet>
      )}
    </div>
  )
}
