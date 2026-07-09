import { useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './Icon'
import { ProductIconSlot } from './ProductIconSlot'
import { ItemAmountColumn } from './ItemAmountColumn'
import { ItemActionSheet } from './ItemActionSheet'
import { SwipeDeleteAction } from './SwipeDeleteAction'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey } from '@/utils/icon'
import { getCategoryTileColor } from '@/utils/categoryColor'
import { parseAmount } from '@/utils/amount'
import { hapticSuccess } from '@/utils/haptics'
import { useItemSwipe } from '@/hooks/useItemSwipe'
import type { DragFixedPosition } from '@/hooks/useDragReorder'
import type { ShoppingItem } from '@/types'

interface ItemTileProps {
  item: ShoppingItem
  category: string
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (item: ShoppingItem) => void
  onAddToPantry: (item: ShoppingItem) => void
  onToggleFavorite: (id: string) => void
  onAdjustAmount: (item: ShoppingItem, direction: 1 | -1) => void
  dragHandleProps?: {
    onPointerDown: (e: React.PointerEvent, id: string) => void
    onPointerMove: (e: React.PointerEvent) => void
    onPointerUp: (e: React.PointerEvent) => void
  }
  isDragging?: boolean
  dragFixedPos?: DragFixedPosition | null
  anyDragging?: boolean
  isDragOver?: boolean
}

const EXIT_ANIMATION_MS = 320

export function ItemTile({
  item,
  category,
  onToggle,
  onDelete,
  onEdit,
  onAddToPantry,
  onToggleFavorite,
  onAdjustAmount,
  dragHandleProps,
  isDragging = false,
  dragFixedPos = null,
  anyDragging = false,
  isDragOver,
}: ItemTileProps) {
  const [exiting, setExiting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const iconKey = getIconKey(item.name, item.category)
  const colors = getCategoryTileColor(category, item.done)
  const parsedAmount = parseAmount(item.amount)
  const showStepper = parsedAmount && !item.done

  function handleToggle() {
    if (item.done) {
      onToggle(item.id)
      return
    }
    hapticSuccess()
    setExiting(true)
    setTimeout(() => onToggle(item.id), EXIT_ANIMATION_MS)
  }

  const swipe = useItemSwipe({
    onCheck: handleToggle,
    onDelete: () => onDelete(item.id),
    blocked: !!dragHandleProps || anyDragging || isDragging,
  })

  const showDeleteAction = swipe.deleteOpen || swipe.dragX < -4

  return (
    <motion.div
      layout={!anyDragging}
      data-item-id={item.id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: swipe.deleteExiting ? 0 : 1, scale: 1, height: swipe.deleteExiting ? 0 : 'auto' }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.12 } }}
      className="item-tile relative overflow-hidden rounded-[12px]"
      style={{ zIndex: isDragging ? 50 : undefined }}
    >
      {isDragOver && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[3px] rounded-full"
          style={{ background: 'var(--accent)' }}
          aria-hidden
        />
      )}
      {isDragging && (
        <div
          className="absolute inset-0 rounded-[12px] border-2 border-dashed"
          style={{ borderColor: colors.fg, opacity: 0.4, background: colors.bg }}
          aria-hidden
        />
      )}

      {!isDragging && showDeleteAction && <SwipeDeleteAction onDelete={swipe.confirmDelete} rounded />}

      <div
        className="relative flex min-h-[64px] items-center gap-2.5 px-3.5 py-3.5"
        style={{
          background: colors.bg,
          ...(isDragging && dragFixedPos
            ? {
                position: 'fixed',
                top: dragFixedPos.top,
                left: dragFixedPos.left,
                width: dragFixedPos.width,
                zIndex: 1000,
                transform: 'scale(1.05)',
                boxShadow: '0 14px 32px rgba(0,0,0,0.28)',
                borderRadius: '12px',
                opacity: 0.98,
                touchAction: 'none',
                pointerEvents: 'none',
              }
            : {
                transform: exiting ? 'translateX(96px)' : `translateX(${swipe.dragX}px)`,
                transition: swipe.dragging || swipe.deleteExiting || exiting
                  ? exiting
                    ? 'transform 0.28s var(--ease-spring), opacity 0.28s ease'
                    : 'none'
                  : 'transform 0.22s var(--ease-spring), opacity 0.32s ease',
                opacity: exiting || swipe.deleteExiting ? 0 : 1,
                touchAction: 'pan-y',
                borderRadius: '12px',
              }),
        }}
        onPointerDown={swipe.handlePointerDown}
        onPointerMove={swipe.handlePointerMove}
        onPointerUp={swipe.handlePointerUp}
        onPointerCancel={swipe.handlePointerUp}
        onClick={swipe.handleClick}
      >
        {dragHandleProps && (
          <button
            className="tap-scale flex h-7 w-5 flex-none touch-none select-none items-center justify-center opacity-60"
            style={{ color: colors.fg, WebkitUserSelect: 'none', userSelect: 'none' }}
            aria-label="Verschieben"
            onPointerDown={(e) => dragHandleProps.onPointerDown(e, item.id)}
            onPointerUp={dragHandleProps.onPointerUp}
            onPointerCancel={dragHandleProps.onPointerUp}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon path={ICON_PATHS.drag} size={16} />
          </button>
        )}
        <ProductIconSlot
          iconKey={iconKey}
          size={22}
          wrapClassName="flex h-8 w-8 flex-none items-center justify-center"
          wrapStyle={{ color: colors.fg }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            {item.favorite && (
              <span className="flex-none" style={{ color: colors.fg, opacity: 0.9 }}>
                <Icon path={ICON_PATHS.star} size={11} />
              </span>
            )}
            <div
              className="truncate text-[16px] font-bold leading-snug"
              style={{
                color: colors.fg,
                textDecoration: item.done ? 'line-through' : 'none',
                opacity: item.done ? 0.65 : 1,
              }}
            >
              {item.name}
            </div>
          </div>
          {item.note && (
            <div className="mt-0.5 truncate text-[12px]" style={{ color: colors.fg, opacity: 0.75 }}>
              {item.note}
            </div>
          )}
        </div>
        <ItemAmountColumn
          item={item}
          showStepper={!!showStepper}
          onAdjustAmount={onAdjustAmount}
          variant="tile"
          accentColor={colors.fg}
        />
        <button
          className="tap-scale flex h-7 w-7 flex-none items-center justify-center rounded-full"
          style={{ color: colors.fg, opacity: 0.75 }}
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen(true)
          }}
          aria-label={`Aktionen für ${item.name}`}
        >
          <Icon path={ICON_PATHS.more} size={18} />
        </button>
      </div>

      {menuOpen && (
        <ItemActionSheet
          item={item}
          onClose={() => setMenuOpen(false)}
          onEdit={() => {
            setMenuOpen(false)
            onEdit(item)
          }}
          onAddToPantry={() => {
            setMenuOpen(false)
            onAddToPantry(item)
          }}
          onToggleFavorite={() => {
            setMenuOpen(false)
            onToggleFavorite(item.id)
          }}
          onDelete={() => {
            setMenuOpen(false)
            onDelete(item.id)
          }}
        />
      )}
    </motion.div>
  )
}
