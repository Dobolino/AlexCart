import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '@/store/useStore'
import { groupByCategory } from '@/utils/group'
import { adjustAmount } from '@/utils/amount'
import { buildShareText } from '@/utils/shareText'
import { CategorySection } from '@/components/CategorySection'
import { ProductIconSlot } from '@/components/ProductIconSlot'
import { AddItemSheet } from '@/components/AddItemSheet'
import { EditItemSheet } from '@/components/EditItemSheet'
import { ListSwitcherSheet } from '@/components/ListSwitcherSheet'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { QuickAddSection } from '@/components/QuickAddSection'
import { LowStockSection } from '@/components/LowStockSection'
import { RecurringSection } from '@/components/RecurringSection'
import { FloatingPortal } from '@/components/FloatingPortal'
import { getIconKey } from '@/utils/icon'
import { CheckoffPriceSheet } from '@/components/CheckoffPriceSheet'
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
  const lists = useStore((s) => s.lists)
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
  const weeklyBudget = useStore((s) => s.settings.weeklyBudget)
  const currency = useStore((s) => s.settings.currency)

  const [addOpen, setAddOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [filteredOpen, setFilteredOpen] = useState(false)
  const [doneOpen, setDoneOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [priceSheetItem, setPriceSheetItem] = useState<ShoppingItem | null>(null)
  const [priceSheetMode, setPriceSheetMode] = useState<'on-checkoff' | 'add-later'>('on-checkoff')
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!list) return null

  const activeItems = list.items.filter((i) => !i.done)
  const doneItems = list.items.filter((i) => i.done)
  const groups = groupByCategory(activeItems)

  const calculatorTotal = calculatorEntries.reduce((sum, e) => sum + e.amount, 0)
  const hasCalculatorTotal = calculatorEntries.length > 0
  const weekSpend = currentWeekSpend(purchaseLog)
  const budgetSpend = totalBudgetSpend(weekSpend, calculatorTotal)
  const hasWeeklyBudget = weeklyBudget > 0
  const budget = hasWeeklyBudget ? budgetProgress(budgetSpend, weeklyBudget) : null

  const listEstimate = estimateOpenListCost(activeItems, priceProfiles)

  const summaryParts: string[] = []
  if (hasWeeklyBudget) {
    summaryParts.push(`${formatMoney(budgetSpend, currency)} / ${formatMoney(weeklyBudget, currency)}`)
  } else if (hasCalculatorTotal) {
    summaryParts.push(formatMoney(calculatorTotal, currency))
  }
  if (listEstimate.pricedItemCount > 0) {
    summaryParts.push(`Geschätzt ${formatMoney(listEstimate.total, currency)}`)
  }
  summaryParts.push(`${activeItems.length} offen`)
  if (doneItems.length > 0) summaryParts.push(`${doneItems.length} erledigt`)
  const listSubtitle = summaryParts.join(' • ')

  function showToast(message: string, action?: ToastState['action'], secondaryAction?: ToastState['secondaryAction']) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, action, secondaryAction })
    toastTimer.current = setTimeout(() => setToast(null), action || secondaryAction ? 5000 : 1800)
  }

  function showDoneToast(item: ShoppingItem, withPrice?: number) {
    const priceHint = withPrice ? ` · ${formatMoney(withPrice, currency)}` : ''
    showToast(
      `„${item.name}" erledigt${priceHint}`,
      { label: 'Rückgängig', onClick: () => toggleItemDone(item.id) },
      withPrice === undefined
        ? { label: 'Preis', onClick: () => openPriceSheetLater(item) }
        : undefined
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
    updateItemInActiveList(item.id, { amount: adjustAmount(item.amount, direction) })
  }

  async function handleShareList() {
    const text = buildShareText(list!)
    const nav = navigator as Navigator & { share?: (data: { title?: string; text?: string }) => Promise<void> }
    if (nav.share) {
      try {
        await nav.share({ title: list!.name, text })
      } catch {
        // Nutzer hat abgebrochen - kein Fehler
      }
      return
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text)
      showToast('Liste in Zwischenablage kopiert')
    }
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
                className="tap-scale flex h-9 w-9 flex-none items-center justify-center rounded-full"
                style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}
                onClick={() => navigate('/shop')}
                aria-label="Einkaufsmodus starten"
              >
                <Icon path={ICON_PATHS.shopping} size={18} />
              </button>
            )}
            <button
              className="tap-scale flex h-9 w-9 flex-none items-center justify-center rounded-full"
              style={{
                color: listViewMode === 'tiles' ? 'var(--accent)' : 'var(--text-muted)',
                background: listViewMode === 'tiles' ? 'var(--accent-soft)' : 'transparent',
              }}
              onClick={() => setListViewMode('tiles')}
              aria-label="Kachel-Ansicht"
            >
              <Icon path={ICON_PATHS.grid} size={18} />
            </button>
            <button
              className="tap-scale flex h-9 w-9 flex-none items-center justify-center rounded-full"
              style={{
                color: listViewMode === 'list' ? 'var(--accent)' : 'var(--text-muted)',
                background: listViewMode === 'list' ? 'var(--accent-soft)' : 'transparent',
              }}
              onClick={() => setListViewMode('list')}
              aria-label="Listen-Ansicht"
            >
              <Icon path={ICON_PATHS.layoutList} size={18} />
            </button>
            <button
              className="tap-scale flex h-9 w-9 flex-none items-center justify-center rounded-full"
              style={{ color: 'var(--text-muted)' }}
              onClick={handleShareList}
              aria-label="Liste teilen"
            >
              <Icon path={ICON_PATHS.share} size={19} />
            </button>
          </div>
        }
      />
      {lists.length === 1 && (
        <p className="px-4 pb-1 text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>
          Tipp: Titel antippen für weitere Listen
        </p>
      )}
      {budget && <BudgetBar progress={budget} currency={currency} />}
      <InstallPrompt />

      <main className="scroll-behind-nav-fab flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pt-3">
        {filteredItems.length > 0 && (
          <div
            className="glass-card mb-3.5 flex items-center justify-between gap-2.5 px-3.5 py-3 text-[13px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <span>{filteredItems.length} Artikel aus Vorrat automatisch gefiltert</span>
            <button
              className="tap-scale font-bold"
              style={{ color: 'var(--accent)' }}
              onClick={() => setFilteredOpen(true)}
            >
              Anzeigen
            </button>
          </div>
        )}

        <LowStockSection onAdded={(name) => showToast(`„${name}“ zur Liste hinzugefügt`)} />
        <RecurringSection onAdded={(name) => showToast(`„${name}“ zur Liste hinzugefügt`)} />
        <QuickAddSection onAdded={(name) => showToast(`„${name}“ hinzugefügt`)} />

        {!activeItems.length && !doneItems.length ? (
          <div className="flex flex-1 items-center justify-center">
            <EmptyState
              icon={ICON_PATHS.cart}
              title="Noch keine Einkaufsliste"
              hint="Füge unten Artikel hinzu oder importiere deinen Wochenplan."
              action={
                <button className="btn-primary tap-scale mt-1 rounded-full px-6 py-3 text-[14px]" onClick={() => setAddOpen(true)}>
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
                onReorder={(ids) => reorderItemsInCategory(g.category, ids)}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEdit={setEditingItem}
                onAddToPantry={handleAddToPantry}
                onToggleFavorite={toggleItemFavorite}
                onAdjustAmount={handleAdjustAmount}
              />
            ))}

            {doneItems.length > 0 && (
              <>
                <div
                  className="card-surface tap-scale mt-1 flex cursor-pointer items-center justify-between px-4 py-3.5 text-[14px] font-bold"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => setDoneOpen((o) => !o)}
                >
                  <span>Erledigt</span>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[12px] font-extrabold"
                    style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
                  >
                    {doneItems.length} erledigt
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

      <FloatingPortal>
        <button
          className="btn-primary tap-scale fixed z-20 flex h-14 w-14 items-center justify-center rounded-full text-2xl shadow-lg"
          style={{
            right: 'calc(18px + var(--safe-right))',
            bottom: 'calc(var(--nav-scroll-padding) + 8px)',
          }}
          onClick={() => setAddOpen(true)}
          aria-label="Artikel hinzufügen"
        >
          <Icon path={ICON_PATHS.plus} size={26} />
        </button>
      </FloatingPortal>

      {addOpen && <AddItemSheet onClose={() => setAddOpen(false)} onImported={showToast} />}
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
            Diese Artikel stehen auf deiner Vorrats-Liste und wurden automatisch entfernt. Bei Bedarf einzeln
            zurückholen.
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
                    <span className="flex-none text-[12px] font-medium tabular-nums" style={{ color: 'var(--text-muted)' }}>
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
          currency={currency}
          onClose={() => setPriceSheetItem(null)}
          onSave={handlePriceSave}
          onSkip={handlePriceSkip}
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
    </>
  )
}
