import { formatMoney } from '@/utils/currency'
import type { Currency } from '@/types'
import type { StoreBasketStat } from '@/utils/storeStats'

interface StoreComparisonSectionProps {
  stores: StoreBasketStat[]
  currency: Currency
}

export function StoreComparisonSection({ stores, currency }: StoreComparisonSectionProps) {
  if (!stores.length) return null

  return (
    <div className="mb-4.5">
      <div
        className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
        style={{ color: 'var(--category-fg)' }}
      >
        Filial-Vergleich
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ WebkitOverflowScrolling: 'touch' }}>
        {stores.map((store) => (
          <div
            key={store.store}
            className="card-surface flex min-w-[9.5rem] flex-none flex-col rounded-2xl px-3.5 py-3"
          >
            <span className="truncate text-[14px] font-bold">{store.store}</span>
            <span className="mt-1 text-[18px] font-extrabold tabular-nums" style={{ color: 'var(--accent)' }}>
              Ø {formatMoney(store.avgSpent, currency)}
            </span>
            <span className="mt-0.5 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              {store.tripCount === 1 ? '1 Einkauf' : `${store.tripCount} Einkäufe`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
