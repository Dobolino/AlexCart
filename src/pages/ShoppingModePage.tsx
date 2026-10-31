import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { groupByCategory } from '@/utils/group'
import { formatMoney } from '@/utils/currency'
import { budgetProgress, currentWeekSpend, totalBudgetSpend } from '@/utils/budget'
import { ShoppingLocationButton } from '@/components/ShoppingLocationButton'
import { hapticSuccess } from '@/utils/haptics'
import { useWakeLock } from '@/hooks/useWakeLock'
import { receiptItemsForSession, todayPricedTotalForList } from '@/utils/purchaseLog'
import { adjustAmount } from '@/utils/amount'
import { shouldUseExactProduceWeight } from '@/utils/producePrice'
import { nextOpenCategory } from '@/utils/shoppingProgress'
import { todayKey } from '@/utils/date'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { FloatingPortal } from '@/components/FloatingPortal'
const BarcodeScannerSheet = lazy(() =>
  import('@/components/BarcodeScannerSheet').then((m) => ({ default: m.BarcodeScannerSheet }))
)
const StoreLayoutSheet = lazy(() =>
  import('@/components/StoreLayoutSheet').then((m) => ({ default: m.StoreLayoutSheet }))
)
const CheckoffPriceSheet = lazy(() =>
  import('@/components/CheckoffPriceSheet').then((m) => ({ default: m.CheckoffPriceSheet }))
)
import { ShoppingQuickAddSheet } from '@/components/ShoppingQuickAddSheet'
import { ShoppingClock } from '@/components/ShoppingClock'
import { EditItemSheet } from '@/components/EditItemSheet'
import { ItemActionSheet } from '@/components/ItemActionSheet'
import { ShoppingCategoryBlock } from '@/components/ShoppingCategoryBlock'
import { ShoppingProgressBar } from '@/components/ShoppingProgressBar'
import { ShoppingPausedOverlay } from '@/components/ShoppingPausedOverlay'
import { findPriceProfile, estimateOpenListCost } from '@/utils/priceProfiles'
import { activeShoppingDurationMs, isShoppingPaused } from '@/utils/shoppingDuration'
import type { CheckoffPriceData, ShoppingItem } from '@/types'

/** Trennzeichen für den Kategorie-Key (kommt in Kategorienamen nicht vor). */
const CATEGORY_SEP = '\u0000'

export function ShoppingModePage() {
  const navigate = useNavigate()
  const list = useStore((s) => s.activeList())
  const toggleItemDone = useStore((s) => s.toggleItemDone)
  const updatePurchaseLogPrice = useStore((s) => s.updatePurchaseLogPrice)
  const updateItemInActiveList = useStore((s) => s.updateItemInActiveList)
  const deleteItem = useStore((s) => s.deleteItem)
  const restoreItem = useStore((s) => s.restoreItem)
  const brands = useStore((s) => s.brands)
  const purchaseLog = useStore((s) => s.purchaseLog)
  const priceProfiles = useStore((s) => s.priceProfiles)
  const excludedIds = useStore((s) => s.calculatorExcludedPurchaseIds)
  const calculatorEntries = useStore((s) => s.calculatorEntries)
  const clearTodayCheckoffsForActiveList = useStore((s) => s.clearTodayCheckoffsForActiveList)
  const resetCalculatorSession = useStore((s) => s.resetCalculatorSession)
  const logCompletedTrip = useStore((s) => s.logCompletedTrip)
  const shoppingSession = useStore((s) => s.shoppingSession)
  const startShoppingSession = useStore((s) => s.startShoppingSession)
  const pauseShopping = useStore((s) => s.pauseShopping)
  const resumeShopping = useStore((s) => s.resumeShopping)
  const clearShoppingSession = useStore((s) => s.clearShoppingSession)
  const selectedBudget = useStore((s) => s.settings.weeklyBudget)
  const currencyBudgets = useStore((s) => s.settings.budgetsByCurrency)
  const askPriceOnCheckoff = useStore((s) => s.settings.askPriceOnCheckoff)
  const autoCollapse = useStore((s) => s.settings.shoppingAutoCollapse)
  const setShoppingAutoCollapse = useStore((s) => s.setShoppingAutoCollapse)
  const toggleItemFavorite = useStore((s) => s.toggleItemFavorite)
  const addPantryItem = useStore((s) => s.addPantryItem)
  const selectedCurrency = useStore((s) => s.settings.currency)
  const currency =
    shoppingSession?.listId === list?.id ? (shoppingSession?.currency ?? selectedCurrency) : selectedCurrency
  const weeklyBudget = currency === selectedCurrency ? selectedBudget : (currencyBudgets?.[currency] ?? 0)
  const [lastChecked, setLastChecked] = useState<{ id: string; price?: number } | null>(null)
  const [priceSheetItem, setPriceSheetItem] = useState<ShoppingItem | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [layoutOpen, setLayoutOpen] = useState(false)
  const storeLayouts = useStore((s) => s.storeLayouts)
  const [addOpen, setAddOpen] = useState(false)
  const [menuItem, setMenuItem] = useState<ShoppingItem | null>(null)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [deletedItem, setDeletedItem] = useState<ShoppingItem | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const deleteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scrollTargetRef = useRef<HTMLDivElement | null>(null)

  const sessionForList = list && shoppingSession?.listId === list.id ? shoppingSession : null
  const isPaused = isShoppingPaused(sessionForList)

  const wakeLockActive = useWakeLock(!isPaused)

  useEffect(
    () => () => {
      if (undoTimer.current) clearTimeout(undoTimer.current)
      if (deleteTimer.current) clearTimeout(deleteTimer.current)
    },
    []
  )
  const listId = list?.id
  useEffect(() => {
    if (listId) startShoppingSession(listId)
  }, [listId, startShoppingSession])

  const tripTotal = useMemo(() => {
    if (!list) return 0
    return todayPricedTotalForList(purchaseLog, list.items, todayKey(), new Set(excludedIds), currency)
  }, [purchaseLog, list, excludedIds, currency])

  const openItems = useMemo(() => list?.items.filter((i) => !i.done) ?? [], [list])

  const openEstimate = useMemo(
    () => estimateOpenListCost(openItems, priceProfiles, currency),
    [openItems, priceProfiles, currency]
  )

  const projectedTotal = useMemo(
    () => Math.round((tripTotal + openEstimate.total) * 100) / 100,
    [tripTotal, openEstimate.total]
  )

  const doneCount = useMemo(
    () => list?.items.filter((i) => i.done && sessionForList?.checkedItemIds.includes(i.id)).length ?? 0,
    [list, sessionForList?.checkedItemIds]
  )
  const totalCount = openItems.length + doneCount
  const groups = useMemo(() => {
    const grouped = groupByCategory(openItems.filter((i) => !i.unavailable))
    const order = storeLayouts[`${currency}:${sessionForList?.store ?? ''}`] ?? []
    return grouped.sort((a, b) => {
      const ai = order.indexOf(a.category),
        bi = order.indexOf(b.category)
      return (ai < 0 ? 1000 : ai) - (bi < 0 ? 1000 : bi)
    })
  }, [openItems, storeLayouts, currency, sessionForList?.store])
  const categoryNames = useMemo(() => groups.map((g) => g.category), [groups])

  // Aufgeklappte Kategorie nachführen, wenn sich die offenen Kategorien ändern (z. B. letzte
  // abgehakt) – während des Renderns statt in einem Effect (React-Muster „Zustand beim Ändern
  // eines Werts anpassen“; vermeidet set-state-in-effect / kaskadierende Renders). Die vorige
  // Reihenfolge steckt im gemerkten Key, damit im Render kein Ref gelesen werden muss.
  const categoryKey = categoryNames.join(CATEGORY_SEP)
  const [prevCategoryKey, setPrevCategoryKey] = useState<string | null>(null)
  if (categoryKey !== prevCategoryKey) {
    if (!categoryNames.length) {
      setExpandedCategory(null)
    } else if (!expandedCategory || !categoryNames.includes(expandedCategory)) {
      let nextCat: string | null = null
      if (expandedCategory && prevCategoryKey) {
        const candidate = nextOpenCategory(prevCategoryKey.split(CATEGORY_SEP), expandedCategory)
        if (candidate && categoryNames.includes(candidate)) nextCat = candidate
      }
      setExpandedCategory(nextCat ?? categoryNames[0]!)
    }
    setPrevCategoryKey(categoryKey)
  }

  useEffect(() => {
    if (!autoCollapse || !expandedCategory || !scrollTargetRef.current) return
    const el = scrollTargetRef.current
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }, [autoCollapse, expandedCategory, categoryNames])

  if (!list) return null

  const calculatorTotal = calculatorEntries
    .filter((e) => (e.currency ?? 'CHF') === currency)
    .reduce((sum, e) => sum + e.amount, 0)
  const budgetSpend = totalBudgetSpend(currentWeekSpend(purchaseLog, undefined, currency), calculatorTotal)
  const budget = weeklyBudget > 0 ? budgetProgress(budgetSpend, weeklyBudget) : null
  const showTripTotal = tripTotal > 0
  const showProjectedTotal = projectedTotal > 0 && (tripTotal > 0 || openEstimate.pricedItemCount > 0)

  function armUndo(next: { id: string; price?: number }) {
    setLastChecked(next)
    if (undoTimer.current) clearTimeout(undoTimer.current)
    undoTimer.current = setTimeout(() => setLastChecked(null), 10000)
  }

  function handleToggleCategory(category: string) {
    setExpandedCategory(category)
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
    if (priceSheetItem.done) updatePurchaseLogPrice(priceSheetItem, data)
    else toggleItemDone(priceSheetItem.id, data)
    armUndo({ id: priceSheetItem.id, price: data.price })
    setPriceSheetItem(null)
  }

  function handlePriceSkip() {
    if (!priceSheetItem) return
    hapticSuccess()
    if (!priceSheetItem.done) toggleItemDone(priceSheetItem.id)
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

  function handleExitShopping() {
    pauseShopping()
    navigate('/')
  }

  function handleFinishShopping() {
    if (
      openItems.length &&
      !window.confirm(`${openItems.length} Artikel bleiben auf der Liste. Einkauf trotzdem abschließen?`)
    )
      return
    if (list && doneCount > 0) {
      const durationMs = sessionForList ? activeShoppingDurationMs(sessionForList) : undefined
      logCompletedTrip({
        listId: list.id,
        listName: list.name,
        items: receiptItemsForSession(purchaseLog, list.items, sessionForList?.checkedItemIds ?? []),
        durationMs,
      })
    }
    clearShoppingSession()
    if (tripTotal > 0 || calculatorEntries.length > 0) {
      resetCalculatorSession()
    }
    navigate('/')
  }

  function handleAdjustAmount(item: ShoppingItem, direction: 1 | -1) {
    // Gewichts-Obst bleibt fix; Stück-Obst (z. B. „2 Stück Kiwi“) darf per Stepper geändert werden.
    if (shouldUseExactProduceWeight(item.category, item.amount)) return
    if (!item.amount.trim() && direction > 0) {
      updateItemInActiveList(item.id, { amount: '1 Stk' })
      return
    }
    updateItemInActiveList(item.id, { amount: adjustAmount(item.amount, direction) })
  }

  function handleDelete(item: ShoppingItem) {
    deleteItem(item.id)
    setDeletedItem(item)
    if (deleteTimer.current) clearTimeout(deleteTimer.current)
    deleteTimer.current = setTimeout(() => setDeletedItem(null), 4000)
  }

  function handleRestoreDeleted() {
    if (!deletedItem) return
    restoreItem(deletedItem)
    setDeletedItem(null)
    if (deleteTimer.current) clearTimeout(deleteTimer.current)
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col" style={{ background: 'var(--bg)' }}>
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
          className="tap-scale flex h-11 w-11 items-center justify-center rounded-full"
          style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
          onClick={handleExitShopping}
          aria-label="Zur Liste"
        >
          <Icon path={ICON_PATHS.close} size={20} />
        </button>
        <div className="min-w-0 flex-1 px-3 text-center">
          <div className="truncate text-[17px] font-extrabold">{list.name}</div>
          <div className="text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {doneCount} von {totalCount || doneCount} erledigt
            {sessionForList && (
              <>
                {' '}
                · <ShoppingClock session={sessionForList} />
              </>
            )}
            {showProjectedTotal
              ? ` · ${tripTotal > 0 ? formatMoney(tripTotal, currency) + ' / ' : ''}${formatMoney(projectedTotal, currency)} geschätzt`
              : ''}
            {budget ? ` · Budget ${formatMoney(budgetSpend, currency)}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!isPaused && (
            <button
              type="button"
              className="tap-scale flex h-11 w-11 items-center justify-center rounded-full text-[18px]"
              style={{ background: 'var(--chip-bg)' }}
              onClick={pauseShopping}
              aria-label="Einkauf pausieren"
            >
              <span aria-hidden>⏸️</span>
            </button>
          )}
          {lastChecked ? (
            <button
              className="tap-scale flex h-11 items-center justify-center rounded-full px-3.5 text-[12px] font-bold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              onClick={handleUndo}
              aria-label="Abhaken rückgängig"
            >
              <Icon path={ICON_PATHS.undo} size={14} />
            </button>
          ) : showTripTotal ? (
            <button
              className="tap-scale flex h-11 items-center justify-center rounded-full px-3 text-[11px] font-bold"
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
              onClick={handleResetTrip}
              aria-label="Einkaufssumme zurücksetzen"
            >
              Leeren
            </button>
          ) : (
            <div
              className="flex h-11 w-11 items-center justify-center"
              title={wakeLockActive ? 'Bildschirm bleibt an' : undefined}
            >
              {wakeLockActive && (
                <span style={{ color: 'var(--text-muted)' }} aria-label="Bildschirm bleibt an">
                  <Icon path={ICON_PATHS.sun} size={16} />
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="mx-3 mt-2">
        <ShoppingLocationButton onClick={() => setLayoutOpen(true)} showRoute />
      </div>
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

      {totalCount > 0 && (
        <ShoppingProgressBar
          doneCount={doneCount}
          totalCount={totalCount}
          budget={budget}
          currency={currency}
        />
      )}

      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-40">
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
          <>
            {categoryNames.length > 1 && (
              <div className="mb-3 flex items-center justify-between gap-2 px-1">
                <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                  Ansicht
                </span>
                <div className="inline-flex rounded-full p-0.5" style={{ background: 'var(--chip-bg)' }}>
                  <button
                    type="button"
                    className="tap-scale min-h-[36px] rounded-full px-3.5 text-[12px] font-bold"
                    style={{
                      background: autoCollapse ? 'var(--accent)' : 'transparent',
                      color: autoCollapse ? 'var(--accent-fg)' : 'var(--text-muted)',
                    }}
                    onClick={() => setShoppingAutoCollapse(true)}
                    aria-pressed={autoCollapse}
                  >
                    Eine Kategorie
                  </button>
                  <button
                    type="button"
                    className="tap-scale min-h-[36px] rounded-full px-3.5 text-[12px] font-bold"
                    style={{
                      background: !autoCollapse ? 'var(--accent)' : 'transparent',
                      color: !autoCollapse ? 'var(--accent-fg)' : 'var(--text-muted)',
                    }}
                    onClick={() => setShoppingAutoCollapse(false)}
                    aria-pressed={!autoCollapse}
                  >
                    Alle
                  </button>
                </div>
              </div>
            )}
            {groups.map((group) => (
              <ShoppingCategoryBlock
                key={group.category}
                ref={autoCollapse && expandedCategory === group.category ? scrollTargetRef : undefined}
                category={group.category}
                items={group.items}
                expanded={!autoCollapse || expandedCategory === group.category}
                onToggle={autoCollapse ? () => handleToggleCategory(group.category) : undefined}
                onCheck={handleCheck}
                onOpenMenu={setMenuItem}
                onAdjustAmount={handleAdjustAmount}
              />
            ))}
          </>
        )}
        {openItems.some((i) => i.unavailable) && (
          <section className="mt-4 rounded-2xl p-3" style={{ background: 'var(--surface)' }}>
            <h2 className="font-bold">Für später · nicht gefunden</h2>
            {openItems
              .filter((i) => i.unavailable)
              .map((i) => (
                <button
                  className="flex min-h-12 w-full items-center justify-between text-left text-sm"
                  key={i.id}
                  onClick={() => useStore.getState().setItemUnavailable(i.id, false)}
                >
                  <span>{i.name}</span>
                  <span>Wieder anzeigen</span>
                </button>
              ))}
          </section>
        )}
      </main>

      <FloatingPortal>
        {lastChecked && (
          <div
            role="status"
            className="glass fixed bottom-[calc(88px+var(--safe-bottom))] left-3 right-3 z-20 flex items-center justify-between rounded-2xl px-4 py-2"
          >
            <span className="text-[13px]">Artikel abgehakt</span>
            <button className="min-h-11 px-3 font-bold" onClick={handleUndo}>
              Rückgängig
            </button>
            <button
              className="min-h-11 px-3"
              onClick={() => {
                const item = list.items.find((i) => i.id === lastChecked.id)
                if (item) setPriceSheetItem(item)
              }}
            >
              Preis
            </button>
          </div>
        )}
        <div className="glass shopping-actions">
          <button
            className="btn-primary"
            onClick={() => setAddOpen(true)}
            aria-label="Extra-Artikel hinzufügen"
          >
            + Artikel
          </button>
          <button className="btn-soft" onClick={() => setScannerOpen(true)}>
            Scannen
          </button>
          <button className="btn-soft" onClick={handleFinishShopping}>
            Abschließen
          </button>
        </div>
      </FloatingPortal>

      {deletedItem && (
        <FloatingPortal>
          <div
            className="glass fixed left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 rounded-full py-2.5 pl-4 pr-2 text-[13px] font-semibold"
            style={{
              color: 'var(--text)',
              bottom: 'calc(72px + var(--safe-bottom))',
            }}
          >
            <span className="min-w-0 truncate">„{deletedItem.name}" gelöscht</span>
            <button
              type="button"
              className="tap-scale shrink-0 rounded-full px-3 py-1.5 text-[12px] font-bold"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              onClick={handleRestoreDeleted}
            >
              Rückgängig
            </button>
          </div>
        </FloatingPortal>
      )}

      {scannerOpen && (
        <Suspense fallback={null}>
          <BarcodeScannerSheet onClose={() => setScannerOpen(false)} />
        </Suspense>
      )}
      {layoutOpen && (
        <Suspense fallback={null}>
          <StoreLayoutSheet onClose={() => setLayoutOpen(false)} />
        </Suspense>
      )}
      {addOpen && <ShoppingQuickAddSheet onClose={() => setAddOpen(false)} onAdded={() => hapticSuccess()} />}

      {menuItem && (
        <ItemActionSheet
          item={menuItem}
          onClose={() => setMenuItem(null)}
          onUnavailable={() => {
            useStore.getState().setItemUnavailable(menuItem.id, !menuItem.unavailable)
            setMenuItem(null)
          }}
          onEdit={() => {
            setEditingItem(menuItem)
            setMenuItem(null)
          }}
          onAddToPantry={() => {
            addPantryItem(menuItem.name, menuItem.category, menuItem.amount)
            setMenuItem(null)
          }}
          onToggleFavorite={() => {
            toggleItemFavorite(menuItem.id)
            setMenuItem(null)
          }}
          onDelete={() => {
            handleDelete(menuItem)
            setMenuItem(null)
          }}
        />
      )}

      {editingItem && <EditItemSheet item={editingItem} onClose={() => setEditingItem(null)} />}

      {priceSheetItem && (
        <Suspense fallback={null}>
          <CheckoffPriceSheet
            item={priceSheetItem}
            profile={findPriceProfile(priceProfiles, priceSheetItem.name, priceSheetItem.category) ?? null}
            brands={brands}
            currency={currency}
            onClose={() => setPriceSheetItem(null)}
            onSave={handlePriceSave}
            onSkip={handlePriceSkip}
            onAmountChange={(amount) => {
              updateItemInActiveList(priceSheetItem.id, { amount })
              setPriceSheetItem((prev) => (prev ? { ...prev, amount } : prev))
            }}
            highlightOptions
          />
        </Suspense>
      )}

      {isPaused && <ShoppingPausedOverlay onResume={resumeShopping} onExit={handleExitShopping} />}
    </div>
  )
}
