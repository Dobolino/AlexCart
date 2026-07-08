import { useStore } from '@/store/useStore'
import { buildRecurringSuggestions } from '@/utils/recurring'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'

interface RecurringSectionProps {
  onAdded?: (name: string) => void
}

export function RecurringSection({ onAdded }: RecurringSectionProps) {
  const list = useStore((s) => s.activeList())
  const purchaseLog = useStore((s) => s.purchaseLog)
  const customProducts = useStore((s) => s.customProducts)
  const addItemToActiveList = useStore((s) => s.addItemToActiveList)

  if (!list) return null

  const suggestions = buildRecurringSuggestions(purchaseLog, list, customProducts)
  if (!suggestions.length) return null

  function handleAdd(suggestion: (typeof suggestions)[number]) {
    addItemToActiveList({
      name: suggestion.name,
      category: suggestion.category,
      amount: suggestion.amount,
    })
    onAdded?.(suggestion.name)
  }

  return (
    <div className="mb-3.5">
      <div className="mb-2 px-1 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        Wiederkehrend
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.key}
            className="tap-scale flex max-w-[11rem] flex-none flex-col rounded-2xl px-3 py-2.5 text-left"
            style={{ background: 'var(--chip-bg)' }}
            onClick={() => handleAdd(suggestion)}
            aria-label={`${suggestion.name} wieder hinzufügen`}
          >
            <span className="truncate text-[13px] font-semibold">{suggestion.name}</span>
            <span className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
              ca. alle {suggestion.intervalDays} Tage · vor {suggestion.daysSince} Tagen
            </span>
            {suggestion.amount && (
              <span className="mt-1 flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--accent)' }}>
                <Icon path={ICON_PATHS.plus} size={12} />
                {suggestion.amount}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
