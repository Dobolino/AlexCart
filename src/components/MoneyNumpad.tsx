import { formatMoney } from '@/utils/currency'
import { applyFixedDecimalKey, centsToAmount, NUMPAD_KEYS } from '@/utils/numpadInput'
import type { Currency } from '@/types'

interface MoneyNumpadProps {
  cents: number
  onChange: (cents: number) => void
  currency: Currency
  compact?: boolean
  /** Noch kompakter für Preis-Sheet ohne Scrollen. */
  dense?: boolean
  label?: string
  /** Zusatz neben dem Betrag (z. B. Preis-Delta-Badge). */
  trailing?: React.ReactNode
  /** Wie die orangene Summen-Karte: Label links, Betrag rechts */
  display?: 'card' | 'summary'
}

export function MoneyNumpad({
  cents,
  onChange,
  currency,
  compact = false,
  dense = false,
  label = 'Eingabe',
  trailing,
  display = 'card',
}: MoneyNumpadProps) {
  const amount = centsToAmount(cents) ?? 0
  const padY = dense ? 'py-2' : compact ? 'py-3' : 'py-4'
  const keySize = dense ? 'text-[17px]' : compact ? 'text-[20px]' : 'text-[22px]'
  const displaySize = dense ? 22 : compact ? 24 : 26
  const displayMinH = dense ? 48 : compact ? 56 : 64
  const gridGap = dense ? 'gap-1.5' : 'gap-2'
  const gridMb = dense ? 'mb-0' : compact ? 'mb-1' : 'mb-3'
  const labelMb = dense ? 'mb-1' : 'mb-1.5'
  const displayMb = dense ? 'mb-2' : 'mb-3'

  function pressKey(key: string) {
    onChange(applyFixedDecimalKey(cents, key))
  }

  function keyAriaLabel(key: string): string {
    if (key === 'C') return 'Eingabe löschen'
    if (key === '⌫') return 'Letzte Ziffer entfernen'
    return `Ziffer ${key}`
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
            <div className={`${labelMb} px-1 text-[13px] font-bold`} style={{ color: 'var(--text-muted)' }}>
              {label}
            </div>
          )}
          <div
            className={`card-surface ${displayMb} flex items-center justify-between gap-2 px-4 font-bold tabular-nums`}
            style={{ color: 'var(--text)', minHeight: displayMinH, fontSize: displaySize }}
          >
            <span className="min-w-0 truncate">{formatMoney(amount, currency)}</span>
            {trailing}
          </div>
        </>
      )}

      <div className={`grid grid-cols-3 ${gridGap} ${gridMb}`}>
        {NUMPAD_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            data-testid="money-numpad-key"
            className={`card-surface tap-scale font-bold ${padY} ${keySize}`}
            style={{
              color: key === 'C' ? 'var(--danger)' : 'var(--text)',
              fontSize: key === 'C' ? (dense ? 14 : compact ? 16 : 18) : undefined,
            }}
            onClick={() => pressKey(key)}
            aria-label={keyAriaLabel(key)}
          >
            {key}
          </button>
        ))}
      </div>
    </>
  )
}
