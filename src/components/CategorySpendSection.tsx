import { formatMoney } from '@/utils/currency'
import type { Currency } from '@/types'
import type { CategorySpendEntry } from '@/utils/stats'

interface CategorySpendSectionProps {
  categories: CategorySpendEntry[]
  currency: Currency
}

export function CategorySpendSection({ categories, currency }: CategorySpendSectionProps) {
  if (!categories.length) return null

  const maxTotal = categories[0]?.total ?? 1

  return (
    <div className="mb-4.5">
      <div
        className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
        style={{ color: 'var(--category-fg)' }}
      >
        Ausgaben nach Kategorie
      </div>
      <div className="card-surface px-4 py-3.5">
        {categories.map((entry) => (
          <div key={entry.label} className="mb-2.5 last:mb-0">
            <div className="mb-1 flex justify-between gap-2 text-[13px] font-semibold">
              <span className="min-w-0 truncate">{entry.label}</span>
              <span className="shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {formatMoney(entry.total, currency)} · {entry.percent.toLocaleString('de-CH')} %
              </span>
            </div>
            <div className="progress-track h-1.5">
              <div className="progress-fill" style={{ width: `${(entry.total / maxTotal) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
