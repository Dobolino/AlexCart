import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import type { ShoppingItem } from '@/types'

interface ItemActionSheetProps {
  item: ShoppingItem
  onClose: () => void
  onEdit: () => void
  onAddToPantry: () => void
  onToggleFavorite: () => void
  onUnavailable?: () => void
  onDelete: () => void
}

function ActionRow({
  icon,
  label,
  danger,
  onClick,
}: {
  icon: string
  label: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      className="tap-scale flex w-full items-center gap-3.5 border-b px-1 py-3.5 text-left last:border-b-0"
      style={{ borderColor: 'var(--border)', color: danger ? 'var(--danger)' : 'var(--text)' }}
      onClick={onClick}
    >
      <Icon path={icon} size={20} />
      <span className="text-[16px] font-semibold">{label}</span>
    </button>
  )
}

export function ItemActionSheet({
  item,
  onClose,
  onEdit,
  onAddToPantry,
  onToggleFavorite,
  onDelete,
  onUnavailable,
}: ItemActionSheetProps) {
  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-3 truncate text-lg font-bold">{item.name}</h2>
      <div className="card-surface">
        {onUnavailable && (
          <ActionRow
            icon={ICON_PATHS.close}
            label={item.unavailable ? 'Wieder anzeigen' : 'Nicht gefunden · für später'}
            onClick={onUnavailable}
          />
        )}
        <ActionRow icon={ICON_PATHS.edit} label="Bearbeiten" onClick={onEdit} />
        <ActionRow icon={ICON_PATHS.pantry} label="In Vorrat übernehmen" onClick={onAddToPantry} />
        <ActionRow
          icon={ICON_PATHS.star}
          label={item.favorite ? 'Favorit entfernen' : 'Favorisieren'}
          onClick={onToggleFavorite}
        />
        <ActionRow icon={ICON_PATHS.trash} label="Löschen" danger onClick={onDelete} />
      </div>
    </Sheet>
  )
}
