import { useEffect, useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { MoneyNumpad } from '@/components/MoneyNumpad'
import { formatMoney } from '@/utils/currency'
import { todayKey } from '@/utils/date'
import { centsToAmount } from '@/utils/numpadInput'
import { todayPricedEntries } from '@/utils/purchaseLog'

export function CalculatorPage() {
  const entries = useStore((s) => s.calculatorEntries)
  const purchaseLog = useStore((s) => s.purchaseLog)
  const addCalculatorEntry = useStore((s) => s.addCalculatorEntry)
  const removeCalculatorEntry = useStore((s) => s.removeCalculatorEntry)
  const clearCalculator = useStore((s) => s.clearCalculator)
  const clearTodayCheckoffs = useStore((s) => s.clearTodayCheckoffs)
  const resetCalculatorSession = useStore((s) => s.resetCalculatorSession)
  const ensureCalculatorDay = useStore((s) => s.ensureCalculatorDay)
  const currency = useStore((s) => s.settings.currency)
  const [cents, setCents] = useState(0)

  useEffect(() => {
    ensureCalculatorDay()
  }, [ensureCalculatorDay])

  const checkoffEntries = useMemo(
    () => todayPricedEntries(purchaseLog, todayKey()),
    [purchaseLog]
  )

  const manualTotal = entries.reduce((sum, e) => sum + e.amount, 0)
  const checkoffTotal = checkoffEntries.reduce((sum, e) => sum + (e.price ?? 0), 0)
  const total = Math.round((manualTotal + checkoffTotal) * 100) / 100
  const hasAnything = checkoffEntries.length > 0 || entries.length > 0

  function handleAdd() {
    const value = centsToAmount(cents)
    if (value === null) return
    addCalculatorEntry(value)
    setCents(0)
  }

  function handleResetAll() {
    if (!window.confirm('Heutige Einkaufssumme zurücksetzen? Abgehakte Preise und manuelle Einträge werden gelöscht.')) return
    resetCalculatorSession()
    setCents(0)
  }

  return (
    <>
      <PageHeader
        title="Rechner"
        subtitle="Laufende Einkaufssumme – nach dem Einkauf zurücksetzen"
        right={
          hasAnything ? (
            <button
              className="tap-scale rounded-full px-3 py-2 text-[12px] font-bold"
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
              onClick={handleResetAll}
            >
              Zurücksetzen
            </button>
          ) : undefined
        }
      />
      <main className="scroll-behind-nav min-h-0 flex-1 overflow-y-auto px-3 pt-3">
        <div
          className="mb-3 flex items-center justify-between rounded-3xl px-5 py-5"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <span className="text-[14px] font-semibold opacity-80">Summe heute</span>
          <span className="text-[28px] font-extrabold">{formatMoney(total, currency)}</span>
        </div>

        <MoneyNumpad cents={cents} onChange={setCents} currency={currency} display="summary" />

        <button className="btn-primary tap-scale mb-2 w-full rounded-2xl py-4 text-[17px]" onClick={handleAdd}>
          <span className="inline-flex items-center gap-2">
            <Icon path={ICON_PATHS.plus} size={20} /> Manuell hinzufügen
          </span>
        </button>
        <p className="mb-4 px-1.5 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Preise beim Abhaken landen unter „Aus Liste abgehakt“. Nach dem Einkauf oben auf Zurücksetzen tippen.
        </p>

        {checkoffEntries.length > 0 && (
          <>
            <div className="mb-2 flex items-center justify-between px-1.5">
              <div className="text-[13px] font-extrabold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
                Aus Liste abgehakt
              </div>
              <button
                className="tap-scale text-[12px] font-bold"
                style={{ color: 'var(--danger)' }}
                onClick={() => {
                  if (window.confirm('Alle heutigen Abhak-Preise löschen?')) clearTodayCheckoffs()
                }}
              >
                Leeren
              </button>
            </div>
            <div className="card-surface mb-4">
              {checkoffEntries.map((entry, index) => (
                <div
                  key={`${entry.name}-${entry.category}-${index}`}
                  className="flex items-center justify-between border-b px-4 py-3 last:border-b-0"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="min-w-0 truncate pr-3 text-[15px] font-semibold">{entry.name}</span>
                  <span className="flex-none text-[15px] font-semibold tabular-nums">
                    {formatMoney(entry.price!, currency)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {entries.length > 0 && (
          <>
            <div
              className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
              style={{ color: 'var(--category-fg)' }}
            >
              Manuell hinzugefügt
            </div>
            <div className="card-surface mb-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between border-b px-4 py-3 last:border-b-0"
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
              className="mb-3 w-full rounded-2xl py-3 text-[13px] font-bold"
              style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
              onClick={clearCalculator}
            >
              Nur manuelle Einträge löschen
            </button>
          </>
        )}

        {!hasAnything && (
          <p className="px-1.5 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Preise beim Abhaken der Liste erscheinen hier automatisch.
          </p>
        )}
      </main>
    </>
  )
}
