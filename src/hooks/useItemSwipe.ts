import { useCallback, useRef, useState } from 'react'
import { hapticLight } from '@/utils/haptics'

const SWIPE_CHECK_TRIGGER = 64
const SWIPE_CHECK_MAX = 88
const DELETE_ACTION_WIDTH = 76
const DELETE_SNAP_THRESHOLD = 52
const DELETE_FULL_THRESHOLD = 128
const DEADZONE = 14
const DELETE_EXIT_MS = 280

export const ITEM_DELETE_ACTION_WIDTH = DELETE_ACTION_WIDTH

interface UseItemSwipeOptions {
  onCheck: () => void
  onDelete: () => void
  /** Rechts-Swipe zum Abhaken (Standard: an). */
  canCheckOnSwipe?: boolean
  blocked?: boolean
}

export function useItemSwipe({
  onCheck,
  onDelete,
  canCheckOnSwipe = true,
  blocked = false,
}: UseItemSwipeOptions) {
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteExiting, setDeleteExiting] = useState(false)
  const start = useRef({ x: 0, y: 0 })
  const direction = useRef<'none' | 'left' | 'right'>('none')
  const suppressClickRef = useRef(false)

  const closeDelete = useCallback(() => {
    setDeleteOpen(false)
    setDragX(0)
  }, [])

  const confirmDelete = useCallback(() => {
    if (deleteExiting) return
    hapticLight()
    setDeleteExiting(true)
    setDeleteOpen(false)
    setDragX(-420)
    window.setTimeout(() => onDelete(), DELETE_EXIT_MS)
  }, [deleteExiting, onDelete])

  function handlePointerDown(e: React.PointerEvent) {
    if (blocked || deleteExiting) return
    start.current = { x: e.clientX, y: e.clientY }
    direction.current = 'none'
    setDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging || blocked || deleteExiting) return
    const dx = e.clientX - start.current.x
    const dy = e.clientY - start.current.y

    if (direction.current === 'none') {
      if (Math.abs(dx) < DEADZONE && Math.abs(dy) < DEADZONE) return
      if (Math.abs(dy) > Math.abs(dx)) return
      direction.current = dx > 0 ? 'right' : 'left'
      if (direction.current === 'left') setDeleteOpen(false)
    }

    if (direction.current === 'right') {
      if (!canCheckOnSwipe) return
      setDragX(Math.max(0, Math.min(SWIPE_CHECK_MAX, dx)))
      return
    }

    setDragX(Math.min(0, Math.max(-DELETE_FULL_THRESHOLD - 24, dx)))
  }

  function handlePointerUp() {
    if (!dragging || blocked) return
    setDragging(false)
    const wasHorizontal = direction.current !== 'none'
    if (wasHorizontal) suppressClickRef.current = true

    if (direction.current === 'right' && canCheckOnSwipe) {
      const shouldCheck = dragX > SWIPE_CHECK_TRIGGER
      setDragX(0)
      if (shouldCheck) onCheck()
    } else if (direction.current === 'left') {
      if (dragX <= -DELETE_FULL_THRESHOLD) {
        confirmDelete()
      } else if (dragX <= -DELETE_SNAP_THRESHOLD) {
        setDeleteOpen(true)
        setDragX(-DELETE_ACTION_WIDTH)
      } else {
        closeDelete()
      }
    } else if (!deleteOpen) {
      setDragX(0)
    }

    direction.current = 'none'
  }

  function handleClick() {
    if (suppressClickRef.current) {
      suppressClickRef.current = false
      return
    }
    if (deleteOpen) {
      closeDelete()
      return
    }
    onCheck()
  }

  const displayX = deleteOpen && !dragging ? -DELETE_ACTION_WIDTH : dragX

  return {
    dragX: displayX,
    dragging,
    deleteOpen,
    deleteExiting,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleClick,
    confirmDelete,
    closeDelete,
  }
}
