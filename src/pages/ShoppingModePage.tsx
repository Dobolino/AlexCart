import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { locationForList, sessionPurchaseIds } from '@/store/shoppingLocation'
import { groupByCategory } from '@/utils/group'
import { formatMoney } from '@/utils/currency'
import { budgetProgress, currentWeekSpend } from '@/utils/budget'
import { ShoppingLocationButton } from '@/components/ShoppingLocationButton'
import { hapticSuccess } from '@/utils/haptics'
import { useWakeLock } from '@/hooks/useWakeLock'
import { adjustAmount } from '@/utils/amount'
import { shouldUseExactProduceWeight } from '@/utils/producePrice'
import { nextOpenCategory } from '@/utils/shoppingProgress'
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
import { AddItemSheet } from '@/components/AddItemSheet'
import { ReceiptImportSheet } from '@/components/ReceiptImportSheet'
import { ShoppingClock } from '@/components/ShoppingClock'
import { EditItemSheet } from '@/components/EditItemSheet'
import { ItemActionSheet } from '@/components/ItemActionSheet'
import { ShoppingCategoryBlock } from '@/components/ShoppingCategoryBlock'
import { ShoppingProgressBar } from '@/components/ShoppingProgressBar'
import { ShoppingPausedOverlay } from '@/components/ShoppingPausedOverlay'
import { FinishShoppingSheet } from '@/components/FinishShoppingSheet'
import { findPriceProfile, estimateOpenListCost } from '@/utils/priceProfiles'
import { isShoppingPaused } from '@/utils/shoppingDuration'
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
  const completedTrips = useStore((s) => s.completedTrips)
  const priceProfiles = useStore((s) => s.priceProfiles)
  const catalog = useStore((s) => s.catalog)
  const observations = useStore((s) => s.priceObservations)
  const stores = useStore((s) => s.retailStores)
  const settings = useStore((s) => s.settings)
  const calculatorEntries = useStore((s) => s.calculatorEntries)
  const shoppingSession = useStore((s) => s.shoppingSession)
  const startShoppingSession = useStore((s) => s.startShoppingSession)
  const pauseShopping = useStore((s) => s.pauseShopping)
  const resumeShopping = useStore((s) => s.resumeShopping)
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
  const [finishOpen, setFinishOpen] = useState(false)
  const storeLayouts = useStore((s) => s.storeLayouts)
  const [addOpen, setAddOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
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
    if (listId && !finishOpen) startShoppingSession(listId)
  }, [listId, startShoppingSession, finishOpen])

  const sessionEntries = useMemo(() => {
    const ids = sessionPurchaseIds(sessionForList, list ?? undefined, purchaseLog, completedTrips)
    return purchaseLog.filter((entry) => entry.id && ids.has(entry.id))
  }, [sessionForList, list, purchaseLog, completedTrips])
  const tripTotal =
    Math.round(
      sessionEntries
        .filter((entry) => (entry.currency ?? 'CHF') === currency)
        .reduce((sum, entry) => sum + (entry.price ?? 0), 0) * 100
    ) / 100
  const cartItems =
    list?.items.filter((item) => item.done && sessionForList?.checkedItemIds.includes(item.id)) ?? []
  const missingPrices = cartItems.filter(
    (item) => !sessionEntries.some((entry) => entry.id === item.purchaseLogId && entry.price !== undefined)
  )

  const openItems = useMemo(() => list?.items.filter((i) => !i.done) ?? [], [list])

  const openEstimate = useMemo(() => {
    const location = list ? locationForList(settings, stores, list) : undefined
    return estimateOpenListCost(openItems, priceProfiles, currency, {
      catalog,
      observations,
      purchaseLog,
      stores: location && !stores.some((store) => store.id === location.id) ? [...stores, location] : stores,
      storeId: sessionForList?.storeId ?? location?.id,
      storeName: sessionForList?.store ?? location?.name,
    })
  }, [
    openItems,
    priceProfiles,
    currency,
    list,
    settings,
    stores,
    catalog,
    observations,
    purchaseLog,
    sessionForList?.storeId,
    sessionForList?.store,
  ])

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
  const budgetSpend = currentWeekSpend(purchaseLog, undefined, currency)
  const budget = weeklyBudget > 0 ? budgetProgress(budgetSpend, weeklyBudget) : null
  const showTripTotal = tripTotal > 0

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
    updateItemInActiveList(priceSheetItem.id, { amount: priceSheetItem.amount })
    hapticSuccess()
    if (priceSheetItem.done) updatePurchaseLogPrice(priceSheetItem, data)
    else toggleItemDone(priceSheetItem.id, data)
    armUndo({ id: priceSheetItem.id, price: data.price })
    setPriceSheetItem(null)
  }

  function handlePriceSkip() {
    if (!priceSheetItem) return
    hapticSuccess()
    if (!priceSheetItem.done) {
      updateItemInActiveList(priceSheetItem.id, { amount: priceSheetItem.amount })
      toggleItemDone(priceSheetItem.id)
    }
    armUndo({ id: priceSheetItem.id })
    setPriceSheetItem(null)
  }

  function handleUndo() {
    if (!lastChecked) return
    toggleItemDone(lastChecked.id)
    setLastChecked(null)
    if (undoTimer.current) clearTimeout(undoTimer.current)
  }

  function handleExitShopping() {
    pauseShopping()
    navigate('/')
  }

  function handleFinishShopping() {
    setFinishOpen(true)
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
      <section className="shop-summary mx-4 my-2" aria-label="Aktueller Einkauf">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="eyebrow">Bezahlt (bestätigt)</h2>
            <p className="mt-1 text-[36px] font-extrabold leading-tight tracking-tight tabular-nums">
              {formatMoney(tripTotal, currency)}
            </p>
          </div>
          <span
            className="text-xs font-semibold"
            style={{ color: missingPrices.length ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {missingPrices.length} Preise fehlen
          </span>
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Offene Artikel ≈ {formatMoney(openEstimate.total, currency)} ·{' '}
          {openEstimate.openItemCount - openEstimate.pricedItemCount} ohne Preisschätzung
        </p>
        {!!openEstimate.referenceItemCount && (
          <p className="mt-1 text-xs">
            {openEstimate.referenceItemCount} aus Bonpreisen
            {openEstimate.oldPriceItemCount ? ` · ${openEstimate.oldPriceItemCount} älter als 90 Tage` : ''}
          </p>
        )}
        <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
          Bekannte Einkaufssumme inkl. Schätzung ≈ {formatMoney(projectedTotal, currency)}
        </p>
        {budget && (
          <p className="mt-1 text-xs">
            Diese Woche {formatMoney(budgetSpend, currency)} ausgegeben ·{' '}
            {formatMoney(budget.remaining, currency)} Budget übrig
          </p>
        )}
        {calculatorTotal > 0 && (
          <p className="mt-1 text-xs">
            Rechnernotizen {formatMoney(calculatorTotal, currency)} · nicht als Kauf bestätigt
          </p>
        )}
      </section>

      {totalCount > 0 && (
        <ShoppingProgressBar doneCount={doneCount} totalCount={totalCount} currency={currency} />
      )}

      <main className="min-h-0 flex-1 overflow-y-auto px-3 py-3 pb-40">
        <p className="mb-3 px-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Name antippen: Preis erfassen · Kreis: gekauft, Preis später.
        </p>
        {!openItems.length ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-3 text-5xl">🎉</div>
            <h2 className="mb-2 text-[22px] font-extrabold">Alles im Wagen</h2>
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
              <button
                className="btn-primary tap-scale rounded-full px-8 py-3.5 text-[15px]"
                onClick={handleFinishShopping}
              >
                Einkauf abschließen
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
                onMarkBought={(item) => {
                  toggleItemDone(item.id)
                  armUndo({ id: item.id })
                }}
                priceProfiles={priceProfiles}
                currency={currency}
                estimateContext={{
                  catalog,
                  observations,
                  purchaseLog,
                  stores,
                  storeId: sessionForList?.storeId,
                  storeName: sessionForList?.store,
                }}
                onOpenMenu={setMenuItem}
                onAdjustAmount={handleAdjustAmount}
              />
            ))}
          </>
        )}
        {cartItems.length > 0 && (
          <section className="cart-items mt-4" aria-label="Im Wagen">
            <h2 className="eyebrow mb-2 px-1">Im Wagen · {cartItems.length}</h2>
            <div className="card-surface">
              {cartItems.map((item) => {
                const entry = sessionEntries.find((entry) => entry.id === item.purchaseLogId)
                return (
                  <div key={item.id} className="cart-row">
                    <span className="min-w-0 flex-1 break-words">
                      <strong>{item.name}</strong>
                      <small>{item.amount}</small>
                    </span>
                    <button
                      className="min-h-11 shrink-0 rounded-full px-3 text-sm font-bold"
                      style={{
                        background: entry?.price === undefined ? 'var(--accent-soft)' : 'var(--chip-bg)',
                        color: entry?.price === undefined ? 'var(--accent)' : 'var(--text)',
                      }}
                      onClick={() => setPriceSheetItem(item)}
                      aria-label={`Preis für ${item.name} nachtragen`}
                    >
                      {entry?.price === undefined
                        ? 'Preis fehlt'
                        : formatMoney(entry.price, entry.currency ?? currency)}
                    </button>
                    <button
                      className="flex h-11 w-11 shrink-0 items-center justify-center"
                      aria-label={`${item.name} rückgängig`}
                      onClick={() => toggleItemDone(item.id)}
                    >
                      <Icon path={ICON_PATHS.undo} size={18} />
                    </button>
                  </div>
                )
              })}
            </div>
          </section>
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
          <button
            className="btn-soft"
            onClick={() => {
              pauseShopping()
              navigate('/calculator')
            }}
            aria-label="Rechner öffnen"
          >
            <Icon path={ICON_PATHS.calculator} size={20} />
          </button>
          <button className="btn-soft" onClick={handleFinishShopping}>
            Abschließen
          </button>
        </div>
      </FloatingPortal>

      {deletedItem && (
        <FloatingPortal>
          <div
            className="fixed left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 rounded-full border py-2.5 pl-4 pr-2 text-[13px] font-semibold"
            style={{
              color: 'var(--text)',
              background: 'var(--surface)',
              borderColor: 'var(--border)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
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

      {finishOpen && (
        <FinishShoppingSheet
          listId={list.id}
          onClose={() => setFinishOpen(false)}
          onFinished={(newList, finishedTripId) =>
            navigate('/', { replace: true, state: { shoppingCompleted: true, newList, finishedTripId } })
          }
        />
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
      {addOpen && (
        <AddItemSheet
          onClose={() => setAddOpen(false)}
          onImported={() => hapticSuccess()}
          onOpenReceiptImport={() => setReceiptOpen(true)}
        />
      )}

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
              setPriceSheetItem((prev) => (prev ? { ...prev, amount } : prev))
            }}
            highlightOptions
          />
        </Suspense>
      )}

      {receiptOpen && (
        <ReceiptImportSheet onClose={() => setReceiptOpen(false)} onDone={() => setReceiptOpen(false)} />
      )}
      {isPaused && <ShoppingPausedOverlay onResume={resumeShopping} onExit={handleExitShopping} />}
    </div>
  )
}
