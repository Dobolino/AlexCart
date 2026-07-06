import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Icon } from './Icon'
import { ProductIcon } from './product-icons/ProductIcon'
import { ItemActionSheet } from './ItemActionSheet'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey } from '@/utils/icon'
import { getCategoryColor } from '@/utils/categoryColor'
import { parseAmount } from '@/utils/amount'
import { hapticSuccess } from '@/utils/haptics'
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
  dragDeltaY?: number
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
  dragDeltaY = 0,
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

  // Wisch nach rechts zum Abhaken, mit Deadzone: erst wenn die Bewegung eindeutig
  // horizontal ist, reagieren wir überhaupt - sonst würde ein Tap oder vertikales
  // Scrollen (leichtes Zittern reicht) kurz sichtbar die Zeile verschieben.
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
    // Nach horizontalem Wisch feuert iOS/Safari oft noch ein click – das würde
    // den Artikel direkt wieder als offen markieren (Doppel-Toggle).
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
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -60, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
      className="relative overflow-hidden border-b"
      style={{
        borderColor: 'var(--border)',
        outline: isDragOver ? '2px solid var(--accent)' : 'none',
        zIndex: isDragging ? 40 : undefined,
      }}
    >
      {isDragging && (
        <div
          className="absolute inset-0"
          style={{ background: 'var(--surface)', opacity: 0.45 }}
          aria-hidden
        />
      )}
      <div
        className="relative flex min-h-[60px] items-center gap-3 px-3.5 py-3.5"
        style={{
          background: item.done ? 'var(--done-bg)' : 'var(--surface)',
          transform: isDragging
            ? `translateY(${dragDeltaY}px) scale(1.02)`
            : `translateX(${dragX}px)`,
          transition: dragging || isDragging ? 'none' : 'transform 0.18s var(--ease-spring), opacity 0.32s ease, background-color 0.2s ease',
          opacity: isDragging ? 0.98 : exiting ? 0 : 1,
          touchAction: isDragging ? 'none' : 'pan-y',
          boxShadow: isDragging ? '0 10px 28px rgba(0,0,0,0.16)' : undefined,
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
            className="tap-scale flex h-7 w-5 flex-none touch-none items-center justify-center opacity-40"
            style={{ color: 'var(--text-muted)' }}
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
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
          style={{ background: color.bg, color: color.fg }}
        >
          <ProductIcon iconKey={iconKey} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {item.favorite && (
              <span className="flex-none" style={{ color: 'var(--accent)' }}>
                <Icon path={ICON_PATHS.star} size={12} />
              </span>
            )}
            <div
              className="truncate text-[16px] font-semibold leading-tight"
              style={{
                color: item.done ? 'var(--text-muted)' : 'var(--text)',
                textDecoration: item.done ? 'line-through' : 'none',
                textDecorationThickness: '2px',
              }}
            >
              {item.name}
            </div>
          </div>
          {(item.amount || item.note) && (
            <div className="mt-1 flex items-center gap-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {showStepper ? (
                <span className="flex flex-none items-center gap-1.5" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
                  <button
                    className="tap-scale flex h-6 w-6 flex-none items-center justify-center rounded-full"
                    style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
                    onClick={() => onAdjustAmount(item, -1)}
                    aria-label={`${item.name} Menge verringern`}
                  >
                    <Icon path={ICON_PATHS.minus} size={13} />
                  </button>
                  <span className="min-w-[3.2rem] truncate text-center font-semibold" style={{ color: 'var(--text)' }}>
                    {item.amount}
                  </span>
                  <button
                    className="tap-scale flex h-6 w-6 flex-none items-center justify-center rounded-full"
                    style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
                    onClick={() => onAdjustAmount(item, 1)}
                    aria-label={`${item.name} Menge erhöhen`}
                  >
                    <Icon path={ICON_PATHS.plus} size={13} />
                  </button>
                </span>
              ) : (
                item.amount && <span className="truncate">{item.amount}</span>
              )}
              {item.note && <span className="truncate">{item.note}</span>}
            </div>
          )}
        </div>
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
