import { ProductIconSlot } from '@/components/ProductIconSlot'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey } from '@/utils/icon'
import { getCategoryColor } from '@/utils/categoryColor'
import type { QuickPick } from '@/utils/quickAdd'

interface QuickAddRowProps {
  picks: QuickPick[]
  onAdd: (pick: QuickPick) => void
}

export function QuickAddRow({ picks, onAdd }: QuickAddRowProps) {
  if (!picks.length) return null

  return (
    <div className="mb-3.5">
      <div className="mb-2 px-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Schnell hinzufügen
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {picks.map((pick) => {
          const iconKey = getIconKey(pick.name, pick.category)
          const color = getCategoryColor(pick.category)
          return (
            <button
              key={pick.key}
              className="tap-scale flex max-w-[9.5rem] flex-none items-center gap-2 rounded-2xl px-3 py-2.5 text-left"
              style={{ background: 'var(--chip-bg)' }}
              onClick={() => onAdd(pick)}
              aria-label={`${pick.name} hinzufügen`}
            >
              <ProductIconSlot
                iconKey={iconKey}
                size={18}
                wrapClassName="flex h-8 w-8 flex-none items-center justify-center rounded-full"
                wrapStyle={{ background: color.bg, color: color.fg }}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{pick.name}</span>
                {pick.amount && (
                  <span className="block truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {pick.amount}
                  </span>
                )}
              </span>
              <Icon path={ICON_PATHS.plus} size={14} />
            </button>
          )
        })}
      </div>
    </div>
  )
}
