import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './Icon'
import { ProductIconSlot } from './ProductIconSlot'
import { ItemAmountColumn } from './ItemAmountColumn'
import { ItemActionSheet } from './ItemActionSheet'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey } from '@/utils/icon'
import { getCategoryColor } from '@/utils/categoryColor'
import { parseAmount } from '@/utils/amount'
import { hapticSuccess } from '@/utils/haptics'
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

const SWIPE_TRIGGER = 64
const SWIPE_MAX = 88
const DEADZONE = 10
const EXIT_ANIMATION_MS = 320

export function ItemRow({
  item,
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
}: ItemRowProps) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const start = useRef({ x: 0, y: 0 })
  const horizontalConfirmed = useRef(false)
  const suppressClickRef = useRef(false)

  const iconKey = getIconKey(item.name, item.category)
  const color = getCategoryColor(item.category, item.done)
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

  function handlePointerDown(e: React.PointerEvent) {
    if (dragHandleProps || anyDragging) return
    start.current = { x: e.clientX, y: e.clientY }
    horizontalConfirmed.current = false
    setDragging(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || dragHandleProps) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y
    if (!horizontalConfirmed.current) {
      if (Math.abs(dx) < DEADZONE || Math.abs(dy) > Math.abs(dx)) return
      horizontalConfirmed.current = true
    }
    setDragX(Math.max(0, Math.min(SWIPE_MAX, dx)))
  }
  function handlePointerUp() {
    if (!dragging || dragHandleProps) return
    setDragging(false)
    const wasHorizontal = horizontalConfirmed.current
    const shouldToggle = wasHorizontal && dragX > SWIPE_TRIGGER
    setDragX(0)
    if (wasHorizontal) suppressClickRef.current = true
    if (shouldToggle) handleToggle()
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    handleToggle()
  }

  return (
    <motion.div
      layout={!anyDragging}
      data-item-id={item.id}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
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
                transform: `translateX(${dragX}px)`,
                transition: dragging ? 'none' : 'transform 0.18s var(--ease-spring), opacity 0.32s ease, background-color 0.2s ease',
                opacity: exiting ? 0 : isDragging ? 0 : 1,
                touchAction: 'pan-y',
              }),
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
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
        {/* Reserviert für zukünftige Produkt-Icons (KI / Custom) */}
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
