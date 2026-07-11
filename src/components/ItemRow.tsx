import { useState } from 'react'
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
import { hapticSuccess } from '@/utils/haptics'
import { useItemSwipe } from '@/hooks/useItemSwipe'
import type { DragFixedPosition } from '@/hooks/useDragReorder'
import type { ShoppingItem } from '@/types'

interface ItemRowProps {
  item: ShoppingItem
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

const EXIT_ANIMATION_MS = 320

export function ItemRow({
  item,
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
}: ItemRowProps) {
  const [exiting, setExiting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const iconKey = getIconKey(item.name, item.category)
  const color = getCategoryColor(item.category, item.done)
  const parsedAmount = parseAmount(item.amount)
  const showProduceWeight = !item.done && shouldUseExactProduceWeight(item.category, item.amount)
  const showStepper = parsedAmount && !item.done && !showProduceWeight

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
    blocked: anyDragging || isDragging,
  })

  const showDeleteAction = swipe.deleteOpen || swipe.dragX < -4

  return (
    <motion.div
      layout={!anyDragging}
      data-item-id={item.id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: swipe.deleteExiting ? 0 : 1, scale: 1, height: swipe.deleteExiting ? 0 : 'auto' }}
      exit={{ opacity: 0, x: -60, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      className="relative overflow-hidden border-b"
      style={{
        borderColor: 'var(--border)',
        zIndex: isDragging ? 50 : undefined,
      }}
    >
      {isDragOver && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[3px]"
          style={{ background: 'var(--accent)' }}
          aria-hidden
        />
      )}
      {isDragging && (
        <div
          className="absolute inset-0 rounded-sm border-2 border-dashed"
          style={{ borderColor: 'var(--accent)', opacity: 0.35, background: 'var(--surface)' }}
          aria-hidden
        />
      )}

      {!isDragging && showDeleteAction && <SwipeDeleteAction onDelete={swipe.confirmDelete} />}

      <div
        className="relative flex min-h-[68px] items-center gap-3 px-4 py-4"
        style={{
          background: item.done ? 'var(--done-bg)' : 'var(--surface)',
          ...(isDragging && dragFixedPos
            ? {
                position: 'fixed',
                top: dragFixedPos.top,
                left: dragFixedPos.left,
                width: dragFixedPos.width,
                zIndex: 1000,
                transform: 'scale(1.04)',
                boxShadow: '0 14px 32px rgba(0,0,0,0.22)',
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
                  : 'transform 0.22s var(--ease-spring), opacity 0.32s ease, background-color 0.2s ease',
                opacity: exiting || swipe.deleteExiting ? 0 : 1,
                touchAction: 'pan-y',
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
            className="tap-scale flex h-7 w-5 flex-none touch-none select-none items-center justify-center opacity-40"
            style={{ color: 'var(--text-muted)', WebkitUserSelect: 'none', userSelect: 'none' }}
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
          size={20}
          wrapClassName="flex h-9 w-9 flex-none items-center justify-center rounded-full"
          wrapStyle={{ background: color.bg, color: color.fg }}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {item.favorite && (
              <span className="flex-none" style={{ color: 'var(--accent)' }}>
                <Icon path={ICON_PATHS.star} size={12} />
              </span>
            )}
            <div
              className="truncate text-[17px] font-bold leading-snug"
              style={{
                color: item.done ? 'var(--text-muted)' : 'var(--text)',
                textDecoration: item.done ? 'line-through' : 'none',
                textDecorationThickness: '2px',
              }}
            >
              {item.name}
            </div>
          </div>
          {item.note && (
            <div className="mt-0.5 truncate text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {item.note}
            </div>
          )}
        </div>
        <ItemAmountColumn
          item={item}
          showStepper={!!showStepper}
          onAdjustAmount={onAdjustAmount}
          onProduceWeightChange={onProduceWeightChange}
          variant="row"
        />
        <button
          className="tap-scale flex h-8 w-8 flex-none items-center justify-center rounded-full"
          style={{ color: 'var(--text-muted)' }}
          onClick={(e) => {
            e.stopPropagation()
            setMenuOpen(true)
          }}
          aria-label={`Aktionen für ${item.name}`}
        >
          <Icon path={ICON_PATHS.more} size={20} />
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
