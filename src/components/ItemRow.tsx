import { useRef, useState } from 'react'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey, getIconSvgPath } from '@/utils/icon'
import type { ShoppingItem } from '@/types'

interface ItemRowProps {
  item: ShoppingItem
  onToggle: (id: string) => void
  onDelete: (id: string) => void
}

const DELETE_WIDTH = 84
const EXIT_ANIMATION_MS = 320

export function ItemRow({ item, onToggle, onDelete }: ItemRowProps) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [exiting, setExiting] = useState(false)
  const dragState = useRef<{ startX: number; opened: boolean }>({ startX: 0, opened: false })

  const iconKey = getIconKey(item.name, item.category)
  const svgPath = getIconSvgPath(iconKey)

  function handlePointerDown(e: React.PointerEvent) {
    dragState.current.startX = e.clientX
    setDragging(true)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return
    let delta = e.clientX - dragState.current.startX
    if (dragState.current.opened) delta -= DELETE_WIDTH
    delta = Math.max(-DELETE_WIDTH, Math.min(0, delta))
    setDragX(delta)
  }
  function handlePointerUp() {
    if (!dragging) return
    setDragging(false)
    if (dragX < -40) {
      dragState.current.opened = true
      setDragX(-DELETE_WIDTH)
    } else {
      dragState.current.opened = false
      setDragX(0)
    }
  }

  function handleToggle() {
    if (item.done) {
      onToggle(item.id)
      return
    }
    setExiting(true)
    setTimeout(() => onToggle(item.id), EXIT_ANIMATION_MS)
  }

  return (
    <div className="relative overflow-hidden border-b" style={{ borderColor: 'var(--border)' }}>
      <button
        className="absolute inset-y-0 right-0 flex items-center justify-center text-white"
        style={{ width: DELETE_WIDTH, background: 'var(--danger)' }}
        onClick={() => onDelete(item.id)}
        aria-label={`${item.name} löschen`}
      >
        <Icon path={ICON_PATHS.trash} size={20} />
      </button>
      <div
        className="relative flex min-h-[60px] items-center gap-3 px-3.5 py-3.5"
        style={{
          background: item.done ? 'var(--done-bg)' : 'var(--surface)',
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.18s ease, opacity 0.32s ease',
          opacity: exiting ? 0 : 1,
          touchAction: 'pan-y',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="flex h-8 w-8 flex-none items-center justify-center"
          style={{ color: 'var(--category-fg)' }}
        >
          <Icon path={svgPath} size={26} />
        </div>
        <div className="min-w-0 flex-1" onClick={handleToggle}>
          <div
            className="text-[16px] font-semibold leading-tight"
            style={{
              color: item.done ? 'var(--text-muted)' : 'var(--text)',
              textDecoration: item.done ? 'line-through' : 'none',
              textDecorationThickness: '2px',
            }}
          >
            {item.name}
          </div>
          {item.amount && (
            <div className="mt-0.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {item.amount}
            </div>
          )}
        </div>
        <button
          className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-full border-2 text-white"
          style={{
            borderColor: item.done ? 'var(--success)' : 'var(--border)',
            background: item.done ? 'var(--success)' : 'transparent',
          }}
          onClick={handleToggle}
          aria-label={item.done ? 'Als offen markieren' : 'Als erledigt markieren'}
        >
          {item.done && <Icon path={ICON_PATHS.check} size={14} />}
        </button>
      </div>
    </div>
  )
}
