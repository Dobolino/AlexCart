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

  return (
    <div
      className={`flex items-center justify-between gap-2 border-b px-3.5 py-3.5 last:border-b-0 transition-opacity duration-300 ${
        flash ? 'opacity-40' : 'opacity-100'
      }`}
      style={{ borderColor: 'var(--border)' }}
    >
      <button
        type="button"
        className="tap-scale min-w-0 flex-1 text-left"
        onClick={onEdit}
      >
        <span className="block truncate text-[15px] font-semibold">{item.name}</span>
        <span className="block truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
          {item.amount ? `Bestand: ${item.amount}` : 'Kein Bestand erfasst'}
          {item.minAmount ? ` · min ${item.minAmount}` : ''}
        </span>
      </button>

      {low && (
        <span
          className="flex-none rounded-full px-2 py-0.5 text-[11px] font-bold"
          style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
        >
          Nachkauf
        </span>
      )}

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
        onClick={onEdit}
        aria-label={`${item.name} bearbeiten`}
      >
        <Icon path={ICON_PATHS.edit} size={18} />
      </button>

      <button
        type="button"
        className="tap-scale flex h-11 w-11 flex-none items-center justify-center rounded-full"
        style={{ color: 'var(--danger)' }}
        onClick={onRemove}
        aria-label={`${item.name} entfernen`}
      >
        <Icon path={ICON_PATHS.close} size={18} />
      </button>
    </div>
  )
}
