import { formatMoney } from '@/utils/currency'
import type { Currency } from '@/types'
import type { BudgetProgress } from '@/utils/budget'

interface BudgetBarProps {
  progress: BudgetProgress
  currency: Currency
}

export function BudgetBar({ progress, currency }: BudgetBarProps) {
  if (progress.budget <= 0) return null

  const fillColor =
    progress.status === 'over'
      ? 'var(--danger)'
      : progress.status === 'warn'
        ? '#e8a317'
        : 'var(--accent)'

  const detail =
    progress.status === 'over'
      ? `${formatMoney(Math.abs(progress.remaining), currency)} über Budget`
      : `Noch ${formatMoney(progress.remaining, currency)} · ${progress.percent}%`

  return (
    <div className="px-4 pb-2">
      <div className="progress-track h-1.5 overflow-hidden rounded-full">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, progress.percent)}%`,
            background: fillColor,
          }}
        />
      </div>
      <p
        className="mt-1.5 text-[12px] font-semibold"
        style={{
          color: progress.status === 'over' ? 'var(--danger)' : 'var(--text-muted)',
        }}
      >
        {detail}
      </p>
    </div>
  )
}
