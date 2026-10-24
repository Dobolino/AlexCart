import { useRef, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { ItemRow } from './ItemRow'
import { ItemTile } from './ItemTile'
import { useDragReorder } from '@/hooks/useDragReorder'
import { estimateItemPrice } from '@/utils/priceProfiles'
import type { Currency, ListViewMode, ProductPriceProfile, ShoppingItem } from '@/types'

interface CategorySectionProps {
  category: string
  items: ShoppingItem[]
  viewMode: ListViewMode
  priceProfiles: ProductPriceProfile[]
  currency: Currency
  onReorder: (orderedIds: string[]) => void
  onToggle: (id: string) => void
  onDelete: (id: string) => void
  onEdit: (item: ShoppingItem) => void
  onAddToPantry: (item: ShoppingItem) => void
  onToggleFavorite: (id: string) => void
  onAdjustAmount: (item: ShoppingItem, direction: 1 | -1) => void
  onProduceWeightChange?: (item: ShoppingItem, amount: string) => void
}

export function CategorySection({
  category,
  items,
  viewMode,
  priceProfiles,
  currency,
  onReorder,
  onToggle,
  onDelete,
  onEdit,
  onAddToPantry,
  onToggleFavorite,
  onAdjustAmount,
  onProduceWeightChange,
}: CategorySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [sorting, setSorting] = useState(false)
  const itemIds = items.map((i) => i.id)
  const drag = useDragReorder(itemIds, onReorder, containerRef)
  const anyDragging = !!drag.dragId

  const dragProps = {
    onPointerDown: drag.onHandlePointerDown,
    onPointerMove: drag.onHandlePointerMove,
    onPointerUp: drag.onHandlePointerUp,
  }

  if (viewMode === 'tiles') {
    return (
      <div className="mb-5">
        <div
          className="category-heading flex items-center justify-between gap-2 px-1.5 pb-2 text-[17px] font-extrabold"
          style={{ color: 'var(--text)' }}
        >
          <span>{category}</span>
          {sorting && (
            <button
              className="min-h-11 text-[13px] font-bold"
              style={{ color: 'var(--accent)' }}
              onClick={() => setSorting(false)}
              aria-label={`${category}: Sortieren beenden`}
            >
              Fertig
            </button>
          )}
        </div>
        <div
          ref={containerRef}
          className={`item-tiles flex flex-col gap-1.5${anyDragging ? ' select-none' : ''}`}
          style={anyDragging ? { WebkitUserSelect: 'none', userSelect: 'none' } : undefined}
        >
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <ItemTile
                key={item.id}
                item={item}
                category={category}
                onToggle={onToggle}
                onDelete={onDelete}
                onEdit={onEdit}
                onAddToPantry={onAddToPantry}
                onToggleFavorite={onToggleFavorite}
                onAdjustAmount={onAdjustAmount}
                onProduceWeightChange={onProduceWeightChange}
                dragHandleProps={sorting ? dragProps : undefined}
                onStartReorder={() => setSorting(true)}
                isDragging={drag.dragId === item.id}
                dragFixedPos={drag.dragId === item.id ? drag.dragFixedPos : null}
                anyDragging={anyDragging}
                isDragOver={drag.overId === item.id && drag.dragId !== item.id}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4">
      <div className="px-1 pb-2 pt-1 text-[17px] font-extrabold" style={{ color: 'var(--text)' }}>
        {category}
      </div>
      <div
        ref={containerRef}
        className={anyDragging ? 'select-none' : undefined}
        style={anyDragging ? { WebkitUserSelect: 'none', userSelect: 'none' } : undefined}
      >
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              estimatedPrice={estimateItemPrice(priceProfiles, item, currency)}
              currency={currency}
              onToggle={onToggle}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddToPantry={onAddToPantry}
              onToggleFavorite={onToggleFavorite}
              onAdjustAmount={onAdjustAmount}
              onProduceWeightChange={onProduceWeightChange}
              dragHandleProps={dragProps}
              isDragging={drag.dragId === item.id}
              dragFixedPos={drag.dragId === item.id ? drag.dragFixedPos : null}
              anyDragging={anyDragging}
              isDragOver={drag.overId === item.id && drag.dragId !== item.id}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
