import { formatMoney } from '@/utils/currency'
import { formatShoppingProgress } from '@/utils/shoppingProgress'
import type { Currency } from '@/types'
import type { BudgetProgress } from '@/utils/budget'

interface ShoppingProgressBarProps {
  doneCount: number
  totalCount: number
  budget?: BudgetProgress | null
  currency: Currency
}

export function ShoppingProgressBar({ doneCount, totalCount, budget, currency }: ShoppingProgressBarProps) {
  if (totalCount <= 0) return null

  const fillColor = budget
    ? budget.status === 'over'
      ? 'var(--danger)'
      : budget.status === 'warn'
        ? '#e8a317'
        : 'var(--accent)'
    : 'var(--accent)'

  const budgetDetail = budget
    ? budget.status === 'over'
      ? `${formatMoney(Math.abs(budget.remaining), currency)} über Budget`
      : `Budget ${formatMoney(budget.spent, currency)} / ${formatMoney(budget.budget, currency)}`
    : null

  return (
    <div className="px-4 py-2">
      {budget && budget.budget > 0 && (
        <div className="progress-track mb-2 h-2 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, budget.percent)}%`,
              background: fillColor,
            }}
          />
        </div>
      )}
      <p className="text-[12px] font-bold tabular-nums" style={{ color: 'var(--text)' }}>
        {formatShoppingProgress(doneCount, totalCount)}
      </p>
      {budgetDetail && (
        <p className="mt-0.5 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          {budgetDetail}
        </p>
      )}
    </div>
  )
}
