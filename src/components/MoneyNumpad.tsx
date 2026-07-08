import { formatMoney, currencySymbol } from '@/utils/currency'
import { applyMoneyNumpadKey, NUMPAD_KEYS } from '@/utils/numpadInput'
import type { Currency } from '@/types'

interface MoneyNumpadProps {
  value: string
  onChange: (value: string) => void
  currency: Currency
  compact?: boolean
}

export function MoneyNumpad({ value, onChange, currency, compact = false }: MoneyNumpadProps) {
  function pressKey(key: string) {
    onChange(applyMoneyNumpadKey(value, key))
  }

  return (
    <>
      <div
        className="card-surface mb-3 flex items-center justify-end gap-2 px-5 py-4 font-bold"
        style={{ color: 'var(--text)', minHeight: compact ? 56 : 64, fontSize: compact ? 24 : 26 }}
      >
        {value ? (
          <>
            <span>{value}</span>
            <span className="text-[16px] font-semibold opacity-60">{currencySymbol(currency)}</span>
          </>
        ) : (
          <span style={{ color: 'var(--text-muted)', fontSize: compact ? 20 : 26 }}>
            {formatMoney(0, currency)}
          </span>
        )}
      </div>

      <div className={`grid grid-cols-3 gap-2 ${compact ? 'mb-1' : 'mb-3'}`}>
        {NUMPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            data-testid="money-numpad-key"
            className={`card-surface tap-scale font-bold ${compact ? 'py-3 text-[20px]' : 'py-4 text-[22px]'}`}
            style={{ color: 'var(--text)' }}
            onClick={() => pressKey(key)}
          >
            {key}
          </button>
        ))}
      </div>
    </>
  )
}
