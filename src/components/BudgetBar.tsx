import { formatMoney } from '@/utils/currency'
import type { Currency } from '@/types'
import type { BudgetProgress } from '@/utils/budget'
import type { estimateOpenListCost } from '@/utils/priceProfiles'

interface BudgetBarProps {
  progress: BudgetProgress | null
  spent: number
  estimate: ReturnType<typeof estimateOpenListCost>
  currency: Currency
  calculatorTotal: number
}

/** Confirmed purchases and the open basket have separate, non-overlapping budget segments. */
export function BudgetBar({ progress, spent, estimate, currency, calculatorTotal }: BudgetBarProps) {
  const missing = estimate.openItemCount - estimate.pricedItemCount
  const plannedRemaining = progress ? Math.round((progress.remaining - estimate.total) * 100) / 100 : 0
  const spentPercent = progress ? Math.min(100, Math.max(0, progress.percent)) : 0
  const plannedPercent = progress ? Math.min(100 - spentPercent, (estimate.total / progress.budget) * 100) : 0
  return (
    <section aria-label="Kosten und Wochenbudget" className="card-surface cost-summary mb-3 p-3.5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="eyebrow">Geschätzter Einkauf</h2>
          <p className="mt-1 text-[28px] font-extrabold leading-tight tracking-tight tabular-nums">
            {estimate.pricedItemCount ? formatMoney(estimate.total, currency) : 'Noch kein Richtpreis'}
          </p>
        </div>
        <p className="shrink-0 text-right text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {estimate.openItemCount} Artikel offen
          <br />
          {missing} ohne Preisschätzung
        </p>
      </div>
      {!!estimate.referenceItemCount && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          {estimate.referenceItemCount} aus Bonpreisen
          {estimate.oldPriceItemCount ? ` · ${estimate.oldPriceItemCount} älter als 90 Tage` : ''}
        </p>
      )}
      <div className="my-2 border-t" style={{ borderColor: 'var(--border)' }} />
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <h3 className="font-semibold">Diese Woche ausgegeben</h3>
        <strong className="tabular-nums">{formatMoney(spent, currency)}</strong>
      </div>
      {progress && (
        <>
          <div
            className="budget-segments my-2"
            role="img"
            aria-label={`Ausgegeben ${formatMoney(spent, currency)}, offene Artikel geschätzt ${formatMoney(estimate.total, currency)}, Wochenbudget ${formatMoney(progress.budget, currency)}`}
          >
            <span style={{ width: `${spentPercent}%`, background: 'var(--text)' }} />
            <span style={{ width: `${plannedPercent}%`, background: 'var(--accent)' }} />
          </div>
          <div
            className="flex flex-wrap justify-between gap-2 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>
              ● ausgegeben <span style={{ color: 'var(--accent)' }}>● geplant</span>
            </span>
            <span>Budget {formatMoney(progress.budget, currency)}</span>
          </div>
          <p
            className="mt-1 text-[12px] font-semibold"
            style={{ color: progress.remaining < 0 ? 'var(--danger)' : 'var(--text-muted)' }}
          >
            {progress.remaining < 0
              ? `${formatMoney(-progress.remaining, currency)} über Wochenbudget`
              : `${formatMoney(progress.remaining, currency)} Wochenbudget übrig`}
          </p>
          <p
            className="mt-1 text-[12px] font-semibold"
            style={{ color: plannedRemaining < 0 ? 'var(--danger)' : 'var(--success)' }}
          >
            Nach diesem Einkauf ≈ {formatMoney(Math.abs(plannedRemaining), currency)}{' '}
            {plannedRemaining < 0 ? 'über Budget' : 'übrig'}
            {missing > 0 ? ' · unvollständig' : ''}
          </p>
        </>
      )}
      {calculatorTotal > 0 && (
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Rechnernotizen: {formatMoney(calculatorTotal, currency)} · nicht im Budget gezählt.
        </p>
      )}
    </section>
  )
}
