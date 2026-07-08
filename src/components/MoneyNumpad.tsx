import { formatMoney } from '@/utils/currency'
import { applyFixedDecimalKey, centsToAmount, NUMPAD_KEYS } from '@/utils/numpadInput'
import type { Currency } from '@/types'

interface MoneyNumpadProps {
  cents: number
  onChange: (cents: number) => void
  currency: Currency
  compact?: boolean
  label?: string
  /** Wie die orangene Summen-Karte: Label links, Betrag rechts */
  display?: 'card' | 'summary'
}

export function MoneyNumpad({
  cents,
  onChange,
  currency,
  compact = false,
  label = 'Eingabe',
  display = 'card',
}: MoneyNumpadProps) {
  const amount = centsToAmount(cents) ?? 0

  function pressKey(key: string) {
    onChange(applyFixedDecimalKey(cents, key))
  }

  return (
    <>
      {display === 'summary' ? (
        <div
          className="mb-3 flex items-center justify-between rounded-3xl px-5 py-4"
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          <span className="text-[14px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            {label}
          </span>
          <span className="text-[28px] font-extrabold tabular-nums">{formatMoney(amount, currency)}</span>
        </div>
      ) : (
        <>
          {label && (
            <div className="mb-1.5 px-1 text-[13px] font-bold" style={{ color: 'var(--text-muted)' }}>
              {label}
            </div>
          )}
          <div
            className="card-surface mb-3 flex items-center justify-end gap-2 px-5 py-4 font-bold tabular-nums"
            style={{ color: 'var(--text)', minHeight: compact ? 56 : 64, fontSize: compact ? 24 : 26 }}
          >
            <span>{formatMoney(amount, currency)}</span>
          </div>
        </>
      )}

      <div className={`grid grid-cols-3 gap-2 ${compact ? 'mb-1' : 'mb-3'}`}>
        {NUMPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            data-testid="money-numpad-key"
            className={`card-surface tap-scale font-bold ${compact ? 'py-3 text-[20px]' : 'py-4 text-[22px]'}`}
            style={{
              color: key === 'C' ? 'var(--danger)' : 'var(--text)',
              fontSize: key === 'C' ? (compact ? 16 : 18) : undefined,
            }}
            onClick={() => pressKey(key)}
          >
            {key}
          </button>
        ))}
      </div>
    </>
  )
}
