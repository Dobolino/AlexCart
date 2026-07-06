import { useState, useCallback, useRef, useEffect, type RefObject } from 'react'

/** Touch-freundliches Umsortieren per Drag-Handle – Element klebt am Finger. */
export function useDragReorder(
  itemIds: string[],
  onReorder: (ids: string[]) => void,
  containerRef: RefObject<HTMLDivElement | null>
) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [dragDeltaY, setDragDeltaY] = useState(0)

  const startYRef = useRef(0)
  const pointerIdRef = useRef<number | null>(null)
  const dragIdRef = useRef<string | null>(null)
  const overIdRef = useRef<string | null>(null)
  const onReorderRef = useRef(onReorder)
  const endedRef = useRef(false)

  useEffect(() => {
    onReorderRef.current = onReorder
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

  function finishDrag() {
    if (endedRef.current) return
    endedRef.current = true

    dragIdRef.current = null
    overIdRef.current = null
    pointerIdRef.current = null
    setDragId(null)
    setOverId(null)
    setDragDeltaY(0)
  }

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

      setDragDeltaY(e.clientY - startYRef.current)

      const target = findDropTarget(e.clientX, e.clientY, id)
      if (target && target !== overIdRef.current) {
        reorder(id, target)
        overIdRef.current = target
        setOverId(target)
        startYRef.current = e.clientY
        setDragDeltaY(0)
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
  }, [dragId, reorder, containerRef])

  function onHandlePointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation()
    e.preventDefault()
    endedRef.current = false
    startYRef.current = e.clientY
    pointerIdRef.current = e.pointerId
    dragIdRef.current = id
    overIdRef.current = id
    setDragId(id)
    setOverId(id)
    setDragDeltaY(0)
    ;(e.currentTarget as Element).setPointerCapture(e.pointerId)
  }

  function onHandlePointerMove(e: React.PointerEvent) {
    if (!dragIdRef.current) return
    if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return
    setDragDeltaY(e.clientY - startYRef.current)
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
    dragDeltaY,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
  }
}
