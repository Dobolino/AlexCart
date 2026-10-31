import { lazy, Suspense, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { groupByCategory } from '@/utils/group'
import { adjustAmount } from '@/utils/amount'
import { shouldUseExactProduceWeight } from '@/utils/producePrice'
import { CategorySection } from '@/components/CategorySection'
import { ProductIconSlot } from '@/components/ProductIconSlot'
const SyncIndicator = lazy(() =>
  import('@/components/SyncIndicator').then((m) => ({ default: m.SyncIndicator }))
)
const ShareListSheet = lazy(() =>
  import('@/components/ShareListSheet').then((m) => ({ default: m.ShareListSheet }))
)
const BarcodeScannerSheet = lazy(() =>
  import('@/components/BarcodeScannerSheet').then((m) => ({ default: m.BarcodeScannerSheet }))
)
const AddItemSheet = lazy(() =>
  import('@/components/AddItemSheet').then((m) => ({ default: m.AddItemSheet }))
)
import { EditItemSheet } from '@/components/EditItemSheet'
import { ListSwitcherSheet } from '@/components/ListSwitcherSheet'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { ShoppingLocationButton } from '@/components/ShoppingLocationButton'
import { locationForList } from '@/store/shoppingLocation'
const StoreLayoutSheet = lazy(() =>
  import('@/components/StoreLayoutSheet').then((m) => ({ default: m.StoreLayoutSheet }))
)
import { Sheet } from '@/components/Sheet'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { QuickAddSection } from '@/components/QuickAddSection'
import { LowStockSection } from '@/components/LowStockSection'
import { RecurringSection } from '@/components/RecurringSection'
import { FloatingPortal } from '@/components/FloatingPortal'
import { getIconKey } from '@/utils/icon'
const CheckoffPriceSheet = lazy(() =>
  import('@/components/CheckoffPriceSheet').then((m) => ({ default: m.CheckoffPriceSheet }))
)
const ReceiptImportSheet = lazy(() =>
  import('@/components/ReceiptImportSheet').then((m) => ({ default: m.ReceiptImportSheet }))
)
import { BudgetBar } from '@/components/BudgetBar'
import { InstallPrompt } from '@/components/InstallPrompt'
import { formatMoney } from '@/utils/currency'
import { budgetProgress, currentWeekSpend, totalBudgetSpend } from '@/utils/budget'
import { findPriceProfile, estimateOpenListCost } from '@/utils/priceProfiles'
import type { CheckoffPriceData, ShoppingItem } from '@/types'

interface ToastState {
  message: string
  action?: { label: string; onClick: () => void }
  secondaryAction?: { label: string; onClick: () => void }
}

export function ListPage() {
  const navigate = useNavigate()
  const list = useStore((s) => s.activeList())
  const filteredItems = useStore((s) => s.filteredForActiveList())
  const toggleItemDone = useStore((s) => s.toggleItemDone)
  const updatePurchaseLogPrice = useStore((s) => s.updatePurchaseLogPrice)
  const askPriceOnCheckoff = useStore((s) => s.settings.askPriceOnCheckoff)
  const toggleItemFavorite = useStore((s) => s.toggleItemFavorite)
  const deleteItem = useStore((s) => s.deleteItem)
  const restoreItem = useStore((s) => s.restoreItem)
  const updateItemInActiveList = useStore((s) => s.updateItemInActiveList)
  const addPantryItem = useStore((s) => s.addPantryItem)
  const restoreFilteredItem = useStore((s) => s.restoreFilteredItem)
  const clearFilteredNote = useStore((s) => s.clearFilteredNote)
  const reorderItemsInCategory = useStore((s) => s.reorderItemsInCategory)
  const reorderDoneItems = useStore((s) => s.reorderDoneItems)
  const clearDoneItems = useStore((s) => s.clearDoneItems)
  const listViewMode = useStore((s) => s.settings.listViewMode)
  const setListViewMode = useStore((s) => s.setListViewMode)
  const calculatorEntries = useStore((s) => s.calculatorEntries)
  const purchaseLog = useStore((s) => s.purchaseLog)
  const priceProfiles = useStore((s) => s.priceProfiles)
  const brands = useStore((s) => s.brands)
  const settings = useStore((s) => s.settings)
  const stores = useStore((s) => s.retailStores)
  const session = useStore((s) => s.shoppingSession)
  const [locationOpen, setLocationOpen] = useState(false)

  const [shareOpen, setShareOpen] = useState(false)
  const [scannerOpen, setScannerOpen] = useState(false)
  let sharedEnabled = false
  try {
    sharedEnabled = !!localStorage.getItem('alexcart-shared-enabled')
  } catch {
    /* local mode */
  }
  const handedness = useStore((s) => s.settings.handedness)
  const [addOpen, setAddOpen] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [filteredOpen, setFilteredOpen] = useState(false)
  const [doneOpen, setDoneOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [priceSheetItem, setPriceSheetItem] = useState<ShoppingItem | null>(null)
  const [priceSheetMode, setPriceSheetMode] = useState<'on-checkoff' | 'add-later'>('on-checkoff')
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!list) return null

  const currency =
    session?.listId === list.id
      ? (session.currency ?? 'CHF')
      : locationForList(settings, stores, list).currency
  const weeklyBudget =
    currency === settings.currency ? settings.weeklyBudget : (settings.budgetsByCurrency?.[currency] ?? 0)

  const activeItems = list.items.filter((i) => !i.done)
  const doneItems = list.items.filter((i) => i.done)
  const groups = groupByCategory(activeItems)

  const calculatorTotal = calculatorEntries
    .filter((e) => (e.currency ?? 'CHF') === currency)
    .reduce((sum, e) => sum + e.amount, 0)
  const weekSpend = currentWeekSpend(purchaseLog, undefined, currency)
  const budgetSpend = totalBudgetSpend(weekSpend, calculatorTotal)
  const hasWeeklyBudget = weeklyBudget > 0
  const budget = hasWeeklyBudget ? budgetProgress(budgetSpend, weeklyBudget) : null

  const listEstimate = estimateOpenListCost(activeItems, priceProfiles, currency)

  const summaryParts: string[] = []
  summaryParts.push(`${activeItems.length} offen`)
  if (doneItems.length > 0) summaryParts.push(`${doneItems.length} erledigt`)
  const listSubtitle = summaryParts.join(' • ')

  function showToast(
    message: string,
    action?: ToastState['action'],
    secondaryAction?: ToastState['secondaryAction']
  ) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, action, secondaryAction })
    toastTimer.current = setTimeout(() => setToast(null), action || secondaryAction ? 5000 : 1800)
  }

  function showDoneToast(item: ShoppingItem, withPrice?: number) {
    const priceHint = withPrice ? ` · ${formatMoney(withPrice, currency)}` : ''
    showToast(
      `„${item.name}" erledigt${priceHint}`,
      { label: 'Rückgängig', onClick: () => toggleItemDone(item.id) },
      withPrice === undefined ? { label: 'Preis', onClick: () => openPriceSheetLater(item) } : undefined
    )
  }

  function openPriceSheetLater(item: ShoppingItem) {
    setPriceSheetMode('add-later')
    setPriceSheetItem(item)
  }

  function handleToggle(itemId: string) {
    const item = list!.items.find((i) => i.id === itemId)
    if (!item) return
    const wasDone = item.done
    if (!wasDone && askPriceOnCheckoff) {
      setPriceSheetMode('on-checkoff')
      setPriceSheetItem(item)
      return
    }
    toggleItemDone(itemId)
    if (!wasDone) showDoneToast(item)
  }

  function handlePriceSave(data: CheckoffPriceData) {
    if (!priceSheetItem) return
    if (priceSheetMode === 'on-checkoff') {
      toggleItemDone(priceSheetItem.id, data)
      showDoneToast(priceSheetItem, data.price)
    } else {
      updatePurchaseLogPrice(priceSheetItem, data)
      showToast(`Preis für „${priceSheetItem.name}" gespeichert · ${formatMoney(data.price, currency)}`)
    }
    setPriceSheetItem(null)
  }

  function handlePriceSkip() {
    if (!priceSheetItem) return
    if (priceSheetMode === 'on-checkoff') {
      toggleItemDone(priceSheetItem.id)
      showDoneToast(priceSheetItem)
    }
    setPriceSheetItem(null)
  }
  function handleAddToPantry(item: ShoppingItem) {
    addPantryItem(item.name, item.category, item.amount)
    showToast(`${item.name} zum Vorrat hinzugefügt`)
  }

  function handleDelete(itemId: string) {
    const item = list!.items.find((i) => i.id === itemId)
    if (!item) return
    deleteItem(itemId)
    showToast(`„${item.name}“ gelöscht`, { label: 'Rückgängig', onClick: () => restoreItem(item) })
  }

  function handleClearDone() {
    const count = doneItems.length
    if (!count) return
    clearDoneItems()
    setDoneOpen(false)
    showToast(`${count} erledigte Artikel entfernt`)
  }

  function handleAdjustAmount(item: ShoppingItem, direction: 1 | -1) {
    if (shouldUseExactProduceWeight(item.category, item.amount)) return
    updateItemInActiveList(item.id, { amount: adjustAmount(item.amount, direction) })
  }

  function handleProduceWeight(item: ShoppingItem, amount: string) {
    updateItemInActiveList(item.id, { amount })
  }

  return (
    <>
      <PageHeader
        title={list.name}
        subtitle={listSubtitle}
        onTitleClick={() => setSwitcherOpen(true)}
        right={
          <div className="flex items-center gap-1">
            {activeItems.length > 0 && (
              <button
                className="tap-scale flex h-11 w-11 flex-none items-center justify-center rounded-full shadow-sm"
                style={{ color: 'var(--accent-fg)', background: 'var(--accent)' }}
                onClick={() => navigate('/shop')}
                aria-label="Einkaufsmodus starten"
              >
                <Icon path={ICON_PATHS.shopping} size={18} />
              </button>
            )}
            <button
              className="tap-scale flex h-11 w-11 flex-none items-center justify-center rounded-full"
              onClick={() => setListViewMode(listViewMode === 'list' ? 'tiles' : 'list')}
              aria-label={listViewMode === 'list' ? 'Kachel-Ansicht' : 'Listen-Ansicht'}
            >
              <Icon path={listViewMode === 'list' ? ICON_PATHS.grid : ICON_PATHS.list} size={18} />
            </button>
            <button
              className="tap-scale flex h-11 w-11 flex-none items-center justify-center rounded-full"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setShareOpen(true)}
              aria-label="Liste teilen"
            >
              <Icon path={ICON_PATHS.share} size={19} />
            </button>
          </div>
        }
      />
      {sharedEnabled && (
        <Suspense fallback={null}>
          <SyncIndicator listId={list.id} onOpen={() => setShareOpen(true)} />
        </Suspense>
      )}
      <InstallPrompt />

      <main className="scroll-behind-nav-fab flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-3">
        <ShoppingLocationButton onClick={() => setLocationOpen(true)} />
        {budget && <BudgetBar progress={budget} currency={currency} />}
        {filteredItems.length > 0 && (
          <div
            className="glass-card mb-3.5 flex shrink-0 items-center justify-between gap-2.5 px-3.5 text-[12px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>{filteredItems.length} Artikel bereits im Vorrat</span>
            <button
              className="tap-scale min-h-11 shrink-0 font-bold"
              style={{ color: 'var(--accent)' }}
              onClick={() => setFilteredOpen(true)}
            >
              Anzeigen
            </button>
          </div>
        )}

        <details className="suggestions-panel shrink-0" open={activeItems.length === 0 || undefined}>
          <summary>Vorschläge für deinen Einkauf</summary>
          <div className="px-3 pb-1">
            <LowStockSection onAdded={(name) => showToast(`„${name}“ zur Liste hinzugefügt`)} />
            <RecurringSection onAdded={(name) => showToast(`„${name}“ zur Liste hinzugefügt`)} />
            <QuickAddSection onAdded={(name) => showToast(`„${name}“ hinzugefügt`)} />
          </div>
        </details>

        {!activeItems.length && !doneItems.length ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={ICON_PATHS.cart}
              title="Noch keine Einkaufsliste"
              hint="Füge unten Artikel hinzu oder importiere deinen Wochenplan."
              action={
                <button
                  className="btn-primary tap-scale mt-1 rounded-full px-6 py-3 text-[14px]"
                  onClick={() => setAddOpen(true)}
                >
                  Artikel hinzufügen
                </button>
              }
            />
          </div>
        ) : (
          <>
            {groups.map((g) => (
              <CategorySection
                key={g.category}
                category={g.category}
                items={g.items}
                viewMode={listViewMode}
                priceProfiles={priceProfiles}
                currency={currency}
                onReorder={(ids) => reorderItemsInCategory(g.category, ids)}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={setEditingItem}
                onAddToPantry={handleAddToPantry}
                onToggleFavorite={toggleItemFavorite}
                onAdjustAmount={handleAdjustAmount}
                onProduceWeightChange={handleProduceWeight}
              />
            ))}

            {listEstimate.pricedItemCount > 0 && (
              <div
                className="mb-3 flex items-center justify-between rounded-[14px] px-4 py-3.5"
                style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-card)' }}
              >
                <span className="text-[15px] font-bold" style={{ color: 'var(--text-muted)' }}>
                  Ungefähres Total
                </span>
                <span className="text-[18px] font-extrabold tabular-nums">
                  {formatMoney(listEstimate.total, currency)}
                </span>
              </div>
            )}

            {doneItems.length > 0 && (
              <>
                <div
                  className="tap-scale mt-1 flex cursor-pointer items-center justify-between rounded-[14px] px-4 py-3.5 text-[14px] font-bold"
                  style={{
                    color: 'var(--text-muted)',
                    background: 'var(--surface)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                  onClick={() => setDoneOpen((o) => !o)}
                >
                  <span>Erledigt</span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[12px] font-extrabold"
                    style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
                  >
                    {doneItems.length}
                  </span>
                </div>
                {doneOpen && (
                  <>
                    <div className="mt-2 flex justify-end px-1">
                      <button
                        className="tap-scale text-[13px] font-bold"
                        style={{ color: 'var(--danger)' }}
                        onClick={handleClearDone}
                      >
                        Alle erledigten entfernen
                      </button>
                    </div>
                    <CategorySection
                      category="Erledigt"
                      items={doneItems}
                      viewMode={listViewMode}
                      priceProfiles={priceProfiles}
                      currency={currency}
                      onReorder={reorderDoneItems}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onEdit={setEditingItem}
                      onAddToPantry={handleAddToPantry}
                      onToggleFavorite={toggleItemFavorite}
                      onAdjustAmount={handleAdjustAmount}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </main>

      <div
        className="list-actions"
        role="toolbar"
        aria-label="Artikel verwalten"
        style={{ flexDirection: handedness === 'left' ? 'row-reverse' : 'row' }}
      >
        <button className="btn-soft tap-scale" onClick={() => setScannerOpen(true)}>
          Scannen
        </button>
        <button
          className="btn-primary tap-scale flex-1"
          onClick={() => setAddOpen(true)}
          aria-label="Artikel hinzufügen"
        >
          <Icon path={ICON_PATHS.plus} size={20} /> Hinzufügen
        </button>
      </div>
      <Suspense fallback={null}>
        {locationOpen && <StoreLayoutSheet onClose={() => setLocationOpen(false)} />}
        {shareOpen && <ShareListSheet onClose={() => setShareOpen(false)} />}
        {scannerOpen && (
          <BarcodeScannerSheet
            onClose={() => setScannerOpen(false)}
            onAdded={(name) => showToast(`„${name}“ hinzugefügt`)}
          />
        )}
        {addOpen && (
          <AddItemSheet
            onClose={() => setAddOpen(false)}
            onImported={showToast}
            onOpenReceiptImport={() => setReceiptOpen(true)}
          />
        )}
        {receiptOpen && <ReceiptImportSheet onClose={() => setReceiptOpen(false)} onDone={showToast} />}
        {editingItem && <EditItemSheet item={editingItem} onClose={() => setEditingItem(null)} />}
        {switcherOpen && (
          <ListSwitcherSheet
            onClose={() => setSwitcherOpen(false)}
            onRepeated={(count) => showToast(`${count} Artikel von letzter Woche hinzugefügt`)}
            onDuplicated={(name) => showToast(`„${name}“ erstellt`)}
            onExported={() => showToast('Liste exportiert')}
          />
        )}
        {filteredOpen && (
          <Sheet onClose={() => setFilteredOpen(false)}>
            <h2 className="mb-1 text-lg font-bold">Aus Vorrat gefiltert</h2>
            <p className="mb-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Diese Artikel stehen auf deiner Vorrats-Liste und wurden automatisch entfernt. Bei Bedarf
              einzeln zurückholen.
            </p>
            <div className="card-surface">
              {filteredItems.map((item) => {
                const iconKey = getIconKey(item.name, item.category)
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-3 border-b px-3.5 py-3.5"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2.5 text-[15px] font-semibold">
                      <ProductIconSlot iconKey={iconKey} size={20} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    {item.amount && (
                      <span
                        className="flex-none text-[12px] font-medium tabular-nums"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {item.amount}
                      </span>
                    )}
                    <button
                      className="tap-scale flex-none"
                      onClick={() => {
                        restoreFilteredItem(item.id)
                        if (filteredItems.length <= 1) setFilteredOpen(false)
                      }}
                    >
                      <Icon path={ICON_PATHS.plus} size={20} />
                    </button>
                  </div>
                )
              })}
            </div>
            <button
              className="btn-soft mt-3 w-full py-3 text-[13px]"
              onClick={() => {
                clearFilteredNote()
                setFilteredOpen(false)
              }}
            >
              Hinweis verwerfen
            </button>
          </Sheet>
        )}

        {priceSheetItem && (
          <CheckoffPriceSheet
            item={priceSheetItem}
            profile={findPriceProfile(priceProfiles, priceSheetItem.name, priceSheetItem.category) ?? null}
            brands={brands}
            currency={currency}
            onClose={() => setPriceSheetItem(null)}
            onSave={handlePriceSave}
            onSkip={handlePriceSkip}
            skipLabel={priceSheetMode === 'add-later' ? 'Ohne Änderung zurück' : undefined}
            onAmountChange={(amount) => {
              updateItemInActiveList(priceSheetItem.id, { amount })
              setPriceSheetItem((prev) => (prev ? { ...prev, amount } : prev))
            }}
          />
        )}

        {toast && (
          <FloatingPortal>
            <div
              className="glass fixed left-1/2 z-40 flex max-w-[calc(100vw-24px)] -translate-x-1/2 items-center gap-2 rounded-full py-2.5 pl-4 pr-2 text-[13px] font-semibold"
              style={{
                color: 'var(--text)',
                bottom: 'calc(var(--nav-scroll-padding) + 72px)',
              }}
            >
              <span className="min-w-0 truncate">{toast.message}</span>
              {toast.secondaryAction && (
                <button
                  className="tap-scale flex-none rounded-full px-3 py-1.5 text-[13px] font-bold"
                  style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
                  onClick={() => {
                    toast.secondaryAction!.onClick()
                    setToast(null)
                  }}
                >
                  {toast.secondaryAction.label}
                </button>
              )}
              {toast.action && (
                <button
                  className="tap-scale flex-none rounded-full px-3 py-1.5 text-[13px] font-bold"
                  style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
                  onClick={() => {
                    toast.action!.onClick()
                    setToast(null)
                  }}
                >
                  {toast.action.label}
                </button>
              )}
            </div>
          </FloatingPortal>
        )}
      </Suspense>
    </>
  )
}
