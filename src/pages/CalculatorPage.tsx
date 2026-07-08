import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { formatMoney, currencySymbol } from '@/utils/currency'

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '⌫']

export function CalculatorPage() {
  const entries = useStore((s) => s.calculatorEntries)
  const addCalculatorEntry = useStore((s) => s.addCalculatorEntry)
  const removeCalculatorEntry = useStore((s) => s.removeCalculatorEntry)
  const clearCalculator = useStore((s) => s.clearCalculator)
  const currency = useStore((s) => s.settings.currency)
  const [input, setInput] = useState('')

  const total = entries.reduce((sum, e) => sum + e.amount, 0)

  function pressKey(key: string) {
    if (key === '⌫') {
      setInput((s) => s.slice(0, -1))
      return
    }
    if (key === ',') {
      if (input.includes(',')) return
      setInput((s) => (s ? s + ',' : '0,'))
      return
    }
    setInput((s) => {
      const next = s + key
      const [, decimals] = next.split(',')
      if (decimals && decimals.length > 2) return s
      return next
    })
  }

  function handleAdd() {
    const value = parseFloat(input.replace(',', '.'))
    if (!Number.isFinite(value) || value <= 0) return
    addCalculatorEntry(value)
    setInput('')
  }

  return (
    <>
      <PageHeader title="Rechner" subtitle="Preise beim Einkaufen summieren" />
      <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-6">
        <div
          className="mb-3 flex items-center justify-between rounded-3xl px-5 py-5"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <span className="text-[14px] font-semibold opacity-80">Summe</span>
          <span className="text-[28px] font-extrabold">{formatMoney(total, currency)}</span>
        </div>

        <div
          className="card-surface mb-3 flex items-center justify-end gap-2 px-5 py-4 text-[26px] font-bold"
          style={{ color: 'var(--text)', minHeight: 64 }}
        >
          {input ? (
            <>
              <span>{input}</span>
              <span className="text-[16px] font-semibold opacity-60">{currencySymbol(currency)}</span>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }}>{formatMoney(0, currency)}</span>
          )}
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          {KEYS.map((key) => (
            <button
              key={key}
              data-testid="calc-key"
              className="card-surface tap-scale py-4 text-[22px] font-bold"
              style={{ color: 'var(--text)' }}
              onClick={() => pressKey(key)}
            >
              {key}
            </button>
          ))}
        </div>

        <button className="btn-primary tap-scale mb-4 w-full rounded-2xl py-4 text-[17px]" onClick={handleAdd}>
          <span className="inline-flex items-center gap-2">
            <Icon path={ICON_PATHS.plus} size={20} /> Hinzufügen
          </span>
        </button>

        {entries.length > 0 && (
          <>
            <div className="card-surface mb-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between border-b px-4 py-3"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="text-[15px] font-semibold">{formatMoney(entry.amount, currency)}</span>
                  <button style={{ color: 'var(--danger)' }} onClick={() => removeCalculatorEntry(entry.id)}>
                    <Icon path={ICON_PATHS.close} size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button
              className="w-full rounded-2xl py-3 text-[13px] font-bold"
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
              onClick={clearCalculator}
            >
              Alles löschen
            </button>
          </>
        )}
      </main>
    </>
  )
}
