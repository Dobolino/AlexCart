import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { ITEM_DELETE_ACTION_WIDTH } from '@/hooks/useItemSwipe'

interface SwipeDeleteActionProps {
  onDelete: () => void
  rounded?: boolean
}

/** Hintergrund-Aktion beim Links-Swipe (Papierkorb). */
export function SwipeDeleteAction({ onDelete, rounded = false }: SwipeDeleteActionProps) {
  return (
    <div className={`absolute inset-0 flex items-stretch justify-end ${rounded ? 'rounded-[12px]' : ''}`}>
      <button
        type="button"
        className="tap-scale flex h-full flex-none items-center justify-center"
        style={{
          width: ITEM_DELETE_ACTION_WIDTH,
          background: 'var(--danger)',
          color: '#fff',
          borderRadius: rounded ? '0 12px 12px 0' : 0,
        }}
        onClick={(e) => {
          e.stopPropagation()
          onDelete()
        }}
        aria-label="Löschen"
      >
        <Icon path={ICON_PATHS.trash} size={22} />
      </button>
    </div>
  )
}
