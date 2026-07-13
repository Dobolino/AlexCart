import { formatMoney } from '@/utils/currency'
import { currentCalendarYear } from '@/utils/storeStats'
import type { Currency } from '@/types'

interface PromoSavingsHighlightProps {
  amount: number
  currency: Currency
  year?: number
}

export function PromoSavingsHighlight({ amount, currency, year = currentCalendarYear() }: PromoSavingsHighlightProps) {
  if (amount <= 0) return null

  return (
    <div
      className="mb-4.5 flex items-center gap-3 rounded-2xl px-4 py-4 shadow-sm"
      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
    >
      <span className="text-[28px] leading-none" aria-hidden>
        🐷
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-extrabold leading-tight">
          Dieses Jahr bereits {formatMoney(amount, currency)} gespart!
        </div>
        <div className="mt-0.5 text-[12px] font-semibold opacity-90">
          Aus erfassten Aktionspreisen {year} · gegenüber Normalpreis
        </div>
      </div>
    </div>
  )
}
