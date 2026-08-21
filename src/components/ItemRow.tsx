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
import { formatListItemDisplay } from '@/utils/listItemDisplay'
import { formatMoney } from '@/utils/currency'
import { hapticSuccess } from '@/utils/haptics'
import { useItemSwipe } from '@/hooks/useItemSwipe'
import type { DragFixedPosition } from '@/hooks/useDragReorder'
import type { Currency, ShoppingItem } from '@/types'

interface ItemRowProps {
  item: ShoppingItem
  estimatedPrice?: number | null
  currency: Currency
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
  estimatedPrice,
  currency,
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
  const display = formatListItemDisplay(item.amount)
  const hasPrice = estimatedPrice != null && estimatedPrice > 0

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
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: swipe.deleteExiting ? 0 : 1, scale: 1, height: swipe.deleteExiting ? 0 : 'auto' }}
      exit={{ opacity: 0, x: -60, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      className="relative mb-2 overflow-hidden rounded-[14px]"
      style={{
        zIndex: isDragging ? 50 : undefined,
        boxShadow: item.done ? 'none' : 'var(--shadow-card)',
      }}
    >
      {isDragOver && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[3px] rounded-t-[14px]"
          style={{ background: 'var(--accent)' }}
          aria-hidden
        />
      )}
      {isDragging && (
        <div
          className="absolute inset-0 rounded-[14px] border-2 border-dashed"
          style={{ borderColor: 'var(--accent)', opacity: 0.35, background: 'var(--surface)' }}
          aria-hidden
        />
      )}

      {!isDragging && showDeleteAction && <SwipeDeleteAction onDelete={swipe.confirmDelete} />}

      <div
        className="relative flex min-h-[76px] items-center gap-3 px-3.5 py-3.5"
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
                borderRadius: '14px',
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
            className="tap-scale flex h-8 w-5 flex-none touch-none select-none items-center justify-center opacity-35"
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
          size={26}
          wrapClassName="flex h-12 w-12 flex-none items-center justify-center rounded-xl"
          wrapStyle={{ background: color.bg, color: color.fg }}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            {item.favorite && (
              <span className="flex-none self-center" style={{ color: 'var(--accent)' }}>
                <Icon path={ICON_PATHS.star} size={12} />
              </span>
            )}
            {display.countPrefix ? (
              <span
                className="flex-none text-[16px] font-extrabold tabular-nums"
                style={{ color: item.done ? 'var(--text-muted)' : 'var(--text)' }}
              >
                {display.countPrefix}
              </span>
            ) : null}
            <div
              className="truncate text-[16px] font-bold leading-snug"
              style={{
                color: item.done ? 'var(--text-muted)' : 'var(--text)',
                textDecoration: item.done ? 'line-through' : 'none',
                textDecorationThickness: '2px',
              }}
            >
              {item.name}
            </div>
          </div>

          {(display.detailLine || hasPrice || item.note) && (
            <div
              className="mt-0.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[13px] tabular-nums"
              style={{ color: 'var(--text-muted)' }}
            >
              {showStepper || showProduceWeight ? (
                <ItemAmountColumn
                  item={item}
                  showStepper={!!showStepper}
                  onAdjustAmount={onAdjustAmount}
                  onProduceWeightChange={onProduceWeightChange}
                  variant="row"
                />
              ) : display.detailLine ? (
                <span className="font-medium">{display.detailLine}</span>
              ) : null}
              {hasPrice ? (
                <span className="font-bold" style={{ color: item.done ? 'var(--text-muted)' : 'var(--text)' }}>
                  {formatMoney(estimatedPrice!, currency)}
                </span>
              ) : null}
              {item.note ? <span className="truncate font-medium">{item.note}</span> : null}
            </div>
          )}
        </div>

        <button
          type="button"
          className="tap-scale flex h-11 w-11 flex-none items-center justify-center"
          onClick={(e) => {
            e.stopPropagation()
            handleToggle()
          }}
          aria-label={item.done ? `${item.name} wieder öffnen` : `${item.name} abhaken`}
        >
          <span
            className="flex h-7 w-7 items-center justify-center rounded-full border-2"
            style={{
              borderColor: item.done ? 'var(--accent)' : 'color-mix(in srgb, var(--text) 22%, transparent)',
              background: item.done ? 'var(--accent)' : 'transparent',
              color: item.done ? 'var(--accent-fg)' : 'transparent',
            }}
          >
            {item.done ? <Icon path={ICON_PATHS.check} size={14} /> : null}
          </span>
        </button>

        <button
          className="tap-scale flex h-8 w-8 flex-none items-center justify-center rounded-full"
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
