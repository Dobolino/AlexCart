import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './Icon'
import { ProductIconSlot } from './ProductIconSlot'
import { ItemAmountColumn } from './ItemAmountColumn'
import { ItemActionSheet } from './ItemActionSheet'
import { SwipeDeleteAction } from './SwipeDeleteAction'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey } from '@/utils/icon'
import { getCategoryColor } from '@/utils/categoryColor'
import { parseAmount } from '@/utils/amount'
import { shouldUseExactProduceWeight } from '@/utils/producePrice'
import { productDisplayName } from '@/utils/listItemDisplay'
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
  onProduceWeightChange?: (item: ShoppingItem, amount: string) => void
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

export function ItemTile({
  item,
  category,
  onToggle,
  onDelete,
  onEdit,
  onAddToPantry,
  onToggleFavorite,
  onAdjustAmount,
  onProduceWeightChange,
  dragHandleProps,
  isDragging = false,
  dragFixedPos = null,
  anyDragging = false,
  isDragOver,
}: ItemTileProps) {
  const lastToggle = useRef(0)
  const [menuOpen, setMenuOpen] = useState(false)

  const iconKey = getIconKey(item.name, item.category)
  const colors = getCategoryColor(category, item.done)
  const parsedAmount = parseAmount(item.amount)
  const showProduceWeight = !item.done && shouldUseExactProduceWeight(item.category, item.amount)
  const showStepper = parsedAmount && !item.done && !showProduceWeight

  function handleToggle() {
    if (Date.now() - lastToggle.current < 300) return
    lastToggle.current = Date.now()
    if (!item.done) hapticSuccess()
    // The parent may open a price dialog. Only a committed store change removes this tile.
    onToggle(item.id)
  }

  const swipe = useItemSwipe({
    onCheck: handleToggle,
    onDelete: () => onDelete(item.id),
    blocked: anyDragging || isDragging,
  })

  const showDeleteAction = swipe.deleteOpen || swipe.dragX < -4

  return (
    <motion.div
      layout={!anyDragging}
      data-item-id={item.id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: swipe.deleteExiting ? 0 : 1, scale: 1, height: swipe.deleteExiting ? 0 : 'auto' }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.12 } }}
      className="item-tile relative overflow-hidden rounded-[18px] border"
      style={{ zIndex: isDragging ? 50 : undefined, borderColor: 'var(--border)' }}
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
        className="relative flex min-h-[80px] items-start gap-2 px-2 py-2.5"
        style={{
          background: item.done ? 'var(--done-bg)' : 'var(--surface)',
          borderLeft: `3px solid ${colors.fg}`,
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
                transform: `translateX(${swipe.dragX}px)`,
                transition:
                  swipe.dragging || swipe.deleteExiting
                    ? 'none'
                    : 'transform 0.22s var(--ease-spring), opacity 0.32s ease',
                opacity: swipe.deleteExiting ? 0 : 1,
                touchAction: 'pan-y',
              }),
        }}
        onPointerDown={swipe.handlePointerDown}
        onPointerMove={swipe.handlePointerMove}
        onPointerUp={swipe.handlePointerUp}
        onPointerCancel={swipe.handlePointerCancel}
        onClick={swipe.handleClick}
      >
        <button
          type="button"
          className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center"
          aria-label={item.done ? `${item.name} wieder öffnen` : `${item.name} abhaken`}
          onClick={(e) => {
            e.stopPropagation()
            swipe.handleClick()
          }}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full border-2"
            style={{
              borderColor: item.done ? 'var(--accent)' : colors.fg,
              background: item.done ? 'var(--accent)' : colors.bg,
              color: 'var(--accent-fg)',
            }}
          >
            {item.done && <Icon path={ICON_PATHS.check} size={16} />}
          </span>
        </button>
        <ProductIconSlot
          iconKey={iconKey}
          size={22}
          wrapClassName="flex h-11 w-11 flex-none items-center justify-center"
          wrapStyle={{ color: colors.fg }}
        />
        <div className="min-w-0 flex-1">
          <button
            type="button"
            data-swipe-target
            className="flex min-h-11 w-full items-center gap-1 text-left"
            onClick={(e) => {
              e.stopPropagation()
              swipe.handleClick()
            }}
          >
            {item.favorite && (
              <span className="flex-none" style={{ color: colors.fg, opacity: 0.9 }}>
                <Icon path={ICON_PATHS.star} size={11} />
              </span>
            )}
            <div
              className="line-clamp-2 break-words text-[16px] font-bold leading-snug"
              style={{
                color: item.done ? 'var(--text-muted)' : 'var(--text)',
                textDecoration: item.done ? 'line-through' : 'none',
                opacity: item.done ? 0.65 : 1,
              }}
            >
              {productDisplayName(item.name)}
            </div>
          </button>
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            <ItemAmountColumn
              item={item}
              showStepper={!!showStepper}
              onAdjustAmount={onAdjustAmount}
              onProduceWeightChange={onProduceWeightChange}
              variant="row"
            />
            {dragHandleProps && (
              <button
                type="button"
                className="tap-scale ml-auto flex h-11 w-11 shrink-0 touch-none select-none items-center justify-center"
                style={{ color: 'var(--text-muted)' }}
                aria-label={`${item.name} verschieben`}
                onPointerDown={(e) => dragHandleProps.onPointerDown(e, item.id)}
                onPointerUp={dragHandleProps.onPointerUp}
                onPointerCancel={dragHandleProps.onPointerUp}
                onClick={(e) => e.stopPropagation()}
              >
                <Icon path={ICON_PATHS.drag} size={16} />
              </button>
            )}
          </div>
          {item.note && (
            <div className="mt-0.5 truncate text-[12px]" style={{ color: colors.fg, opacity: 0.75 }}>
              {item.note}
            </div>
          )}
        </div>
        <button
          className="tap-scale flex h-11 w-11 flex-none items-center justify-center rounded-full"
          style={{ color: 'var(--text-muted)' }}
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
