import { forwardRef } from 'react'
import { Icon } from './Icon'
import { ItemAmountColumn } from './ItemAmountColumn'
import { AmountBadge } from './AmountBadge'
import { ICON_PATHS } from '@/constants/icons'
import { isProduceCategory } from '@/utils/producePrice'
import type { ShoppingItem } from '@/types'

interface ShoppingCategoryBlockProps {
  category: string
  items: ShoppingItem[]
  expanded: boolean
  onToggle: () => void
  onCheck: (item: ShoppingItem) => void
  onDelete: (item: ShoppingItem) => void
  onAdjustAmount: (item: ShoppingItem, direction: 1 | -1) => void
}

export const ShoppingCategoryBlock = forwardRef<HTMLDivElement, ShoppingCategoryBlockProps>(
  function ShoppingCategoryBlock(
    { category, items, expanded, onToggle, onCheck, onDelete, onAdjustAmount },
    ref
  ) {
    const openLabel = items.length === 1 ? '1 offen' : `${items.length} offen`

    return (
      <div ref={ref} className="mb-3 scroll-mt-24">
        <button
          type="button"
          className="tap-scale mb-2 flex min-h-[44px] w-full items-center gap-2 rounded-xl px-2 py-2 text-left"
          style={{
            background: expanded ? 'var(--accent-soft)' : 'transparent',
          }}
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <span
            className="flex h-7 w-7 flex-none items-center justify-center transition-transform duration-200"
            style={{
              color: expanded ? 'var(--accent)' : 'var(--text-muted)',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
          >
            <Icon path={ICON_PATHS.chevron} size={18} />
          </span>
          <span
            className="min-w-0 flex-1 truncate text-[14px] font-bold"
            style={{ color: expanded ? 'var(--accent)' : 'var(--text)' }}
          >
            {category}
          </span>
          <span className="flex-none text-[12px] font-semibold tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {openLabel}
          </span>
        </button>

        <div
          className="grid transition-[grid-template-rows,opacity] duration-300 ease-out"
          style={{
            gridTemplateRows: expanded ? '1fr' : '0fr',
            opacity: expanded ? 1 : 0,
          }}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-2 pb-1">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex min-h-[72px] items-center gap-2 rounded-2xl px-3 py-3 shadow-sm"
                  style={{ background: 'var(--surface)' }}
                >
                  <button
                    type="button"
                    className="tap-scale flex h-11 w-11 flex-none items-center justify-center rounded-full border-2"
                    style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                    onClick={() => onCheck(item)}
                    aria-label={`${item.name} abhaken`}
                  >
                    <Icon path={ICON_PATHS.check} size={22} />
                  </button>
                  <button
                    type="button"
                    className="tap-scale min-w-0 flex-1 text-left"
                    onClick={() => onCheck(item)}
                  >
                    <span className="block truncate text-[18px] font-bold leading-tight">{item.name}</span>
                    {item.note && (
                      <span className="mt-0.5 block truncate text-[13px]" style={{ color: 'var(--text-muted)' }}>
                        {item.note}
                      </span>
                    )}
                  </button>
                  {isProduceCategory(item.category) ? (
                    item.amount ? <AmountBadge amount={item.amount} prominent /> : null
                  ) : (
                    <ItemAmountColumn item={item} showStepper onAdjustAmount={onAdjustAmount} />
                  )}
                  <button
                    type="button"
                    className="tap-scale flex h-9 w-9 flex-none items-center justify-center rounded-full"
                    style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}
                    onClick={() => onDelete(item)}
                    aria-label={`${item.name} löschen`}
                  >
                    <Icon path={ICON_PATHS.trash} size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }
)
