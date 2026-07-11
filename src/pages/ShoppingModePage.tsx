import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { groupByCategory } from '@/utils/group'
import { formatMoney } from '@/utils/currency'
import { budgetProgress, currentWeekSpend, totalBudgetSpend } from '@/utils/budget'
import { hapticSuccess } from '@/utils/haptics'
import { useWakeLock } from '@/hooks/useWakeLock'
import { todayPricedTotalForList } from '@/utils/purchaseLog'
import { todayKey } from '@/utils/date'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { FloatingPortal } from '@/components/FloatingPortal'
import { CheckoffPriceSheet } from '@/components/CheckoffPriceSheet'
import { ShoppingQuickAddSheet } from '@/components/ShoppingQuickAddSheet'
import { AmountBadge } from '@/components/AmountBadge'
import { findPriceProfile, estimateOpenListCost } from '@/utils/priceProfiles'
import type { CheckoffPriceData, ShoppingItem } from '@/types'

export function ShoppingModePage() {
  const navigate = useNavigate()
  const list = useStore((s) => s.activeList())
  const toggleItemDone = useStore((s) => s.toggleItemDone)
  const purchaseLog = useStore((s) => s.purchaseLog)
  const priceProfiles = useStore((s) => s.priceProfiles)
  const excludedIds = useStore((s) => s.calculatorExcludedPurchaseIds)
  const calculatorEntries = useStore((s) => s.calculatorEntries)
  const clearTodayCheckoffsForActiveList = useStore((s) => s.clearTodayCheckoffsForActiveList)
  const resetCalculatorSession = useStore((s) => s.resetCalculatorSession)
  const weeklyBudget = useStore((s) => s.settings.weeklyBudget)
  const askPriceOnCheckoff = useStore((s) => s.settings.askPriceOnCheckoff)
  const currency = useStore((s) => s.settings.currency)
  const [lastChecked, setLastChecked] = useState<{ id: string; price?: number } | null>(null)
  const [priceSheetItem, setPriceSheetItem] = useState<ShoppingItem | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const wakeLockActive = useWakeLock(true)

  const tripTotal = useMemo(() => {
    if (!list) return 0
    return todayPricedTotalForList(purchaseLog, list.items, todayKey(), new Set(excludedIds))
  }, [purchaseLog, list, excludedIds])

  const openItems = useMemo(() => list?.items.filter((i) => !i.done) ?? [], [list])

  const openEstimate = useMemo(
    () => estimateOpenListCost(openItems, priceProfiles),
    [openItems, priceProfiles]
  )

  const projectedTotal = useMemo(
    () => Math.round((tripTotal + openEstimate.total) * 100) / 100,
    [tripTotal, openEstimate.total]
  )

  if (!list) return null

  const doneCount = list.items.filter((i) => i.done).length
  const totalCount = openItems.length + doneCount
  const groups = groupByCategory(openItems)

  const calculatorTotal = calculatorEntries.reduce((sum, e) => sum + e.amount, 0)
  const budgetSpend = totalBudgetSpend(currentWeekSpend(purchaseLog), calculatorTotal)
  const budget = weeklyBudget > 0 ? budgetProgress(budgetSpend, weeklyBudget) : null
  const showTripTotal = tripTotal > 0
  const showProjectedTotal = projectedTotal > 0 && (tripTotal > 0 || openEstimate.pricedItemCount > 0)

  function armUndo(next: { id: string; price?: number }) {
    setLastChecked(next)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setLastChecked(null), 4000)
  }

  function handleCheck(item: ShoppingItem) {
    if (askPriceOnCheckoff) {
      setPriceSheetItem(item)
      return
    }
    hapticSuccess()
    toggleItemDone(item.id)
    armUndo({ id: item.id })
  }

  function handlePriceSave(data: CheckoffPriceData) {
    if (!priceSheetItem) return
    hapticSuccess()
    toggleItemDone(priceSheetItem.id, data)
    armUndo({ id: priceSheetItem.id, price: data.price })
    setPriceSheetItem(null)
  }

  function handlePriceSkip() {
    if (!priceSheetItem) return
    hapticSuccess()
    toggleItemDone(priceSheetItem.id)
    armUndo({ id: priceSheetItem.id })
    setPriceSheetItem(null)
  }

  function handleUndo() {
    if (!lastChecked) return
    toggleItemDone(lastChecked.id)
    setLastChecked(null)
    if (undoTimer.current) clearTimeout(undoTimer.current)
  }

  function handleResetTrip() {
    clearTodayCheckoffsForActiveList()
  }

  function handleFinishShopping() {
    if (tripTotal > 0 || calculatorEntries.length > 0) {
      resetCalculatorSession()
    }
    navigate('/')
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: 'var(--bg)' }}>
      <header
        className="glass flex flex-none items-center justify-between border-b px-4"
        style={{
          paddingTop: 'calc(12px + var(--safe-top))',
          paddingBottom: '12px',
          paddingLeft: 'calc(16px + var(--safe-left))',
          paddingRight: 'calc(16px + var(--safe-right))',
        }}
      >
        <button
          className="tap-scale flex h-10 w-10 items-center justify-center rounded-full"
          style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
          onClick={() => navigate('/')}
          aria-label="Einkaufsmodus beenden"
        >
          <Icon path={ICON_PATHS.close} size={20} />
        </button>
        <div className="min-w-0 flex-1 px-3 text-center">
          <div className="truncate text-[17px] font-extrabold">{list.name}</div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {doneCount} von {totalCount || doneCount} erledigt
            {showProjectedTotal
              ? ` · ${tripTotal > 0 ? formatMoney(tripTotal, currency) + ' / ' : ''}${formatMoney(projectedTotal, currency)} geschätzt`
              : ''}
            {budget ? ` · Budget ${formatMoney(budgetSpend, currency)}` : ''}
          </div>
        </div>
        {lastChecked ? (
          <button
            className="tap-scale flex h-10 items-center justify-center rounded-full px-3 text-[12px] font-bold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            onClick={handleUndo}
          >
            <Icon path={ICON_PATHS.undo} size={14} />
          </button>
        ) : showTripTotal ? (
          <button
            className="tap-scale flex h-10 items-center justify-center rounded-full px-2.5 text-[11px] font-bold"
            style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
            onClick={handleResetTrip}
            aria-label="Einkaufssumme zurücksetzen"
          >
            Leeren
          </button>
        ) : (
          <div className="flex w-10 items-center justify-center" title={wakeLockActive ? 'Bildschirm bleibt an' : undefined}>
            {wakeLockActive && (
              <span style={{ color: 'var(--text-muted)' }} aria-label="Bildschirm bleibt an">
                <Icon path={ICON_PATHS.sun} size={16} />
              </span>
            )}
          </div>
        )}
      </header>

      {(showTripTotal || showProjectedTotal) && (
        <div
          className="mx-4 mb-2 flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          <div className="min-w-0">
            <div className="text-[13px] font-semibold opacity-90">
              {tripTotal > 0 ? 'Aktueller Einkauf' : 'Geschätzte Summe'}
            </div>
            {showProjectedTotal && tripTotal > 0 && openEstimate.pricedItemCount > 0 && (
              <div className="text-[11px] opacity-80">
                inkl. {openEstimate.pricedItemCount} offene Artikel geschätzt
              </div>
            )}
          </div>
          <span className="text-[22px] font-extrabold tabular-nums">
            {formatMoney(showProjectedTotal ? projectedTotal : tripTotal, currency)}
          </span>
        </div>
      )}

      {budget && (
        <div className="px-4 py-2">
          <div className="progress-track h-2 overflow-hidden rounded-full">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, budget.percent)}%`,
                background: budget.status === 'over' ? 'var(--danger)' : budget.status === 'warn' ? '#e8a317' : 'var(--accent)',
              }}
            />
          </div>
        </div>
      )}

      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-8">
        {!openItems.length ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-3 text-5xl">🎉</div>
            <h2 className="mb-2 text-[22px] font-extrabold">Einkauf abgeschlossen!</h2>
            <p className="mb-6 text-[15px]" style={{ color: 'var(--text-muted)' }}>
              {doneCount > 0 ? `${doneCount} Artikel erledigt.` : 'Keine offenen Artikel mehr.'}
              {showTripTotal ? ` Summe: ${formatMoney(tripTotal, currency)}.` : ''}
            </p>
            <div className="flex w-full max-w-xs flex-col gap-2.5">
              <button
                type="button"
                className="tap-scale text-[13px] font-semibold"
                style={{ color: 'var(--text-muted)' }}
                onClick={() => setAddOpen(true)}
              >
                Noch etwas hinzufügen
              </button>
              {showTripTotal && (
                <button
                  className="w-full rounded-2xl py-3.5 text-[15px] font-bold"
                  style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                  onClick={handleResetTrip}
                >
                  Rechner zurücksetzen
                </button>
              )}
              <button
                className="btn-primary tap-scale rounded-full px-8 py-3.5 text-[15px]"
                onClick={handleFinishShopping}
              >
                {showTripTotal ? 'Fertig & Rechner leeren' : 'Zurück zur Liste'}
              </button>
            </div>
          </div>
        ) : (
          groups.map((group) => (
            <div key={group.category} className="mb-5">
              <div className="category-heading mb-2 px-1.5 text-[14px] font-bold" style={{ color: 'var(--text)' }}>
                {group.category}
              </div>
              <div className="flex flex-col gap-2">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    className="tap-scale flex min-h-[72px] items-center gap-3 rounded-2xl px-4 py-4 text-left shadow-sm"
                    style={{ background: 'var(--surface)' }}
                    onClick={() => handleCheck(item)}
                  >
                    <span
                      className="flex h-11 w-11 flex-none items-center justify-center rounded-full border-2"
                      style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                    >
                      <Icon path={ICON_PATHS.check} size={22} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[18px] font-bold leading-tight">{item.name}</span>
                      {item.note && (
                        <span className="mt-0.5 block truncate text-[13px]" style={{ color: 'var(--text-muted)' }}>
                          {item.note}
                        </span>
                      )}
                    </span>
                    {item.amount && <AmountBadge amount={item.amount} prominent />}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      {openItems.length > 0 && (
        <FloatingPortal>
          <div
            className="glass fixed left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 rounded-full py-1.5 pl-4 pr-1"
            style={{
              bottom: 'calc(12px + var(--safe-bottom))',
            }}
          >
            {!lastChecked && (
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                Tippen zum Abhaken
              </span>
            )}
            <button
              type="button"
              className="tap-scale flex h-8 w-8 flex-none items-center justify-center rounded-full"
              style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}
              onClick={() => setAddOpen(true)}
              aria-label="Extra-Artikel hinzufügen"
            >
              <Icon path={ICON_PATHS.plus} size={16} />
            </button>
          </div>
        </FloatingPortal>
      )}

      {addOpen && (
        <ShoppingQuickAddSheet
          onClose={() => setAddOpen(false)}
          onAdded={() => hapticSuccess()}
        />
      )}

      {priceSheetItem && (
        <CheckoffPriceSheet
          item={priceSheetItem}
          profile={findPriceProfile(priceProfiles, priceSheetItem.name, priceSheetItem.category) ?? null}
          currency={currency}
          onClose={() => setPriceSheetItem(null)}
          onSave={handlePriceSave}
          onSkip={handlePriceSkip}
        />
      )}
    </div>
  )
}
