import { useState, useCallback, useRef, useEffect, type RefObject } from 'react'

export interface DragFixedPosition {
  top: number
  left: number
  width: number
}

/** Touch-freundliches Umsortieren – schwebendes Element, Umsortierung erst beim Loslassen. */
export function useDragReorder(
  itemIds: string[],
  onReorder: (ids: string[]) => void,
  containerRef: RefObject<HTMLDivElement | null>
) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [dragFixedPos, setDragFixedPos] = useState<DragFixedPosition | null>(null)

  const grabOffsetYRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)
  const dragIdRef = useRef<string | null>(null)
  const overIdRef = useRef<string | null>(null)
  const onReorderRef = useRef(onReorder)
  const endedRef = useRef(false)

  useEffect(() => {
    onReorderRef.current = onReorder
    return () => document.body.classList.remove('is-dragging')
  }, [onReorder])

  const reorder = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return
    const ids = [...itemIds]
    const fromIdx = ids.indexOf(fromId)
    const toIdx = ids.indexOf(toId)
    if (fromIdx < 0 || toIdx < 0) return
    ids.splice(fromIdx, 1)
    ids.splice(toIdx, 0, fromId)
    onReorderRef.current(ids)
  }, [itemIds])

  const finishDrag = useCallback(() => {
    if (endedRef.current) return
    endedRef.current = true

    const id = dragIdRef.current
    const target = overIdRef.current
    if (id && target && target !== id) reorder(id, target)

    dragIdRef.current = null
    overIdRef.current = null
    pointerIdRef.current = null
    setDragId(null)
    setOverId(null)
    setDragFixedPos(null)
    document.body.classList.remove('is-dragging')
  }, [reorder])

  useEffect(() => {
    if (!dragId) return

    function findDropTarget(clientX: number, clientY: number, excludeId: string): string | null {
      const elements = document.elementsFromPoint(clientX, clientY)
      for (const el of elements) {
        const row = el.closest('[data-item-id]') as HTMLElement | null
        if (
          row?.dataset.itemId &&
          row.dataset.itemId !== excludeId &&
          containerRef.current?.contains(row)
        ) {
          return row.dataset.itemId
        }
      }
      return null
    }

    function onMove(e: PointerEvent) {
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return
      const id = dragIdRef.current
      if (!id) return

      setDragFixedPos((prev) =>
        prev ? { ...prev, top: e.clientY - grabOffsetYRef.current } : prev
      )

      const target = findDropTarget(e.clientX, e.clientY, id)
      if (target) {
        overIdRef.current = target
        setOverId(target)
      }
    }

    function onEnd(e: PointerEvent) {
      if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return
      finishDrag()
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onEnd)
    window.addEventListener('pointercancel', onEnd)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  }, [dragId, finishDrag, containerRef])

  function onHandlePointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation()
    e.preventDefault()

    const row = (e.currentTarget as Element).closest('[data-item-id]') as HTMLElement | null
    if (!row) return
    const rect = row.getBoundingClientRect()

    endedRef.current = false
    grabOffsetYRef.current = e.clientY - rect.top
    pointerIdRef.current = e.pointerId
    dragIdRef.current = id
    overIdRef.current = id

    setDragId(id)
    setOverId(id)
    setDragFixedPos({ top: rect.top, left: rect.left, width: rect.width })
    document.body.classList.add('is-dragging')

    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  function onHandlePointerUp(e: React.PointerEvent) {
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return
    try {
      ;(e.currentTarget as Element).releasePointerCapture(e.pointerId)
    } catch {
      /* already released */
    }
    finishDrag()
  }

  return {
    dragId,
    overId,
    dragFixedPos,
    onHandlePointerDown,
    onHandlePointerMove: () => {},
    onHandlePointerUp: onHandlePointerUp,
  }
}
