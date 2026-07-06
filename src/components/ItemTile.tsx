import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './Icon'
import { ProductIcon } from './product-icons/ProductIcon'
import { ItemActionSheet } from './ItemActionSheet'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey } from '@/utils/icon'
import { getCategoryTileColor } from '@/utils/categoryColor'
import { parseAmount } from '@/utils/amount'
import { hapticSuccess } from '@/utils/haptics'
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
  dragDeltaY?: number
  isDragOver?: boolean
}

const SWIPE_TRIGGER = 64
const SWIPE_MAX = 88
const DEADZONE = 10
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
  dragDeltaY = 0,
  isDragOver,
}: ItemTileProps) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const start = useRef({ x: 0, y: 0 })
  const horizontalConfirmed = useRef(false)
  const suppressClickRef = useRef(false)

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

  function handlePointerDown(e: React.PointerEvent) {
    if (dragHandleProps) return
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
      layout={!isDragging}
      data-item-id={item.id}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -40, transition: { duration: 0.12 } }}
      className="item-tile relative overflow-hidden rounded-[10px]"
      style={{
        outline: isDragOver ? '2px solid var(--accent)' : 'none',
        zIndex: isDragging ? 40 : undefined,
      }}
    >
      {isDragging && (
        <div
          className="absolute inset-0 rounded-[10px]"
          style={{ background: colors.bg, opacity: 0.28 }}
          aria-hidden
        />
      )}
      <div
        className="relative flex min-h-[52px] items-center gap-2.5 px-3 py-3"
        style={{
          background: colors.bg,
          transform: isDragging
            ? `translateY(${dragDeltaY}px) scale(1.03)`
            : `translateX(${dragX}px)`,
          transition: dragging || isDragging ? 'none' : 'transform 0.18s var(--ease-spring), opacity 0.32s ease',
          opacity: isDragging ? 0.98 : exiting ? 0 : 1,
          touchAction: isDragging ? 'none' : 'pan-y',
          boxShadow: isDragging ? '0 10px 28px rgba(0,0,0,0.22)' : undefined,
          borderRadius: '10px',
          pointerEvents: isDragging ? 'none' : undefined,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
      >
        {dragHandleProps && (
          <button
            className="tap-scale flex h-7 w-5 flex-none touch-none items-center justify-center opacity-60"
            style={{ color: colors.fg }}
            aria-label="Verschieben"
            onPointerDown={(e) => dragHandleProps.onPointerDown(e, item.id)}
            onPointerMove={dragHandleProps.onPointerMove}
            onPointerUp={dragHandleProps.onPointerUp}
            onPointerCancel={dragHandleProps.onPointerUp}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon path={ICON_PATHS.drag} size={16} />
          </button>
        )}
        <div className="flex h-8 w-8 flex-none items-center justify-center" style={{ color: colors.fg }}>
          <ProductIcon iconKey={iconKey} size={22} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1">
            {item.favorite && (
              <span className="flex-none" style={{ color: colors.fg, opacity: 0.9 }}>
                <Icon path={ICON_PATHS.star} size={11} />
              </span>
            )}
            <div
              className="truncate text-[15px] font-semibold leading-tight"
              style={{
                color: colors.fg,
                textDecoration: item.done ? 'line-through' : 'none',
                opacity: item.done ? 0.65 : 1,
              }}
            >
              {item.name}
            </div>
          </div>
          {(item.amount || item.note) && (
            <div className="mt-0.5 flex items-center gap-2 text-[12px]" style={{ color: colors.fg, opacity: 0.8 }}>
              {showStepper ? (
                <span className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="tap-scale flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                    onClick={() => onAdjustAmount(item, -1)}
                  >
                    <Icon path={ICON_PATHS.minus} size={11} />
                  </button>
                  <span className="min-w-[2.8rem] text-center font-semibold">{item.amount}</span>
                  <button
                    className="tap-scale flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                    onClick={() => onAdjustAmount(item, 1)}
                  >
                    <Icon path={ICON_PATHS.plus} size={11} />
                  </button>
                </span>
              ) : (
                item.amount && <span className="truncate">{item.amount}</span>
              )}
              {item.note && <span className="truncate opacity-80">{item.note}</span>}
            </div>
          )}
        </div>
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
