import { useStore } from '@/store/useStore'
import { buildLowStockSuggestions } from '@/utils/pantry'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'

interface LowStockSectionProps {
  onAdded?: (name: string) => void
}

export function LowStockSection({ onAdded }: LowStockSectionProps) {
  const list = useStore((s) => s.activeList())
  const pantry = useStore((s) => s.pantry)
  const addItemToActiveList = useStore((s) => s.addItemToActiveList)

  if (!list) return null

  const suggestions = buildLowStockSuggestions(pantry, list)
  if (!suggestions.length) return null

  function handleAddAll() {
    for (const suggestion of suggestions) {
      addItemToActiveList({
        name: suggestion.name,
        category: suggestion.category,
        amount: suggestion.amount,
      })
    }
    onAdded?.(`${suggestions.length} Vorrat-Artikel`)
  }

  function handleAddOne(suggestion: (typeof suggestions)[number]) {
    addItemToActiveList({
      name: suggestion.name,
      category: suggestion.category,
      amount: suggestion.amount,
    })
    onAdded?.(suggestion.name)
  }

  return (
    <div className="mb-3.5">
      <div className="mb-2 flex items-center justify-between gap-2 px-1">
        <div className="text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          Unter Mindestbestand
        </div>
        {suggestions.length > 1 && (
          <button
            className="tap-scale text-[12px] font-bold"
            style={{ color: 'var(--accent)' }}
            onClick={handleAddAll}
          >
            Alle hinzufügen
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.pantryId}
            className="tap-scale flex max-w-[11rem] flex-none flex-col rounded-2xl px-3 py-2.5 text-left"
            style={{ background: 'var(--danger-soft)' }}
            onClick={() => handleAddOne(suggestion)}
            aria-label={`${suggestion.name} zur Liste hinzufügen`}
          >
            <span className="truncate text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
              {suggestion.name}
            </span>
            <span className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {suggestion.currentAmount} · min {suggestion.minAmount}
            </span>
            <span className="mt-1 flex items-center gap-1 text-[11px] font-bold" style={{ color: 'var(--accent)' }}>
              <Icon path={ICON_PATHS.plus} size={12} />
              {suggestion.amount}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
