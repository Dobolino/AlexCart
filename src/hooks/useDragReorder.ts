import { useState, useCallback, type RefObject } from 'react'

/** Touch-freundliches Umsortieren per Drag-Handle (Pointer Events). */
export function useDragReorder(
  itemIds: string[],
  onReorder: (ids: string[]) => void,
  containerRef: RefObject<HTMLDivElement | null>
) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const reorder = useCallback(
    (fromId: string, toId: string) => {
      if (fromId === toId) return
      const ids = [...itemIds]
      const fromIdx = ids.indexOf(fromId)
      const toIdx = ids.indexOf(toId)
      if (fromIdx < 0 || toIdx < 0) return
      ids.splice(fromIdx, 1)
      ids.splice(toIdx, 0, fromId)
      onReorder(ids)
    },
    [itemIds, onReorder]
  )

  function onHandlePointerDown(e: React.PointerEvent, id: string) {
    e.stopPropagation()
    setDragId(id)
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }

  function onHandlePointerMove(e: React.PointerEvent) {
    if (!dragId) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const row = el?.closest('[data-item-id]') as HTMLElement | null
    if (row?.dataset.itemId && containerRef.current?.contains(row)) {
      setOverId(row.dataset.itemId)
    }
  }

  function onHandlePointerUp() {
    if (dragId && overId) reorder(dragId, overId)
    setDragId(null)
    setOverId(null)
  }

  return {
    dragId,
    overId,
    onHandlePointerDown,
    onHandlePointerMove,
    onHandlePointerUp,
  }
}
