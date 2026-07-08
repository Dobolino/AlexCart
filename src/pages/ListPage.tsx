import { useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { groupByCategory } from '@/utils/group'
import { adjustAmount } from '@/utils/amount'
import { buildShareText } from '@/utils/shareText'
import { CategorySection } from '@/components/CategorySection'
import { ProductIcon } from '@/components/product-icons/ProductIcon'
import { AddItemSheet } from '@/components/AddItemSheet'
import { EditItemSheet } from '@/components/EditItemSheet'
import { ListSwitcherSheet } from '@/components/ListSwitcherSheet'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { QuickAddSection } from '@/components/QuickAddSection'
import { FloatingPortal } from '@/components/FloatingPortal'
import { getIconKey } from '@/utils/icon'
import type { ShoppingItem } from '@/types'

interface ToastState {
  message: string
  action?: { label: string; onClick: () => void }
}

export function ListPage() {
  const list = useStore((s) => s.activeList())
  const filteredItems = useStore((s) => s.filteredForActiveList())
  const toggleItemDone = useStore((s) => s.toggleItemDone)
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

  const [addOpen, setAddOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [filteredOpen, setFilteredOpen] = useState(false)
  const [doneOpen, setDoneOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null)
  const [toast, setToast] = useState<ToastState | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  if (!list) return null

  const activeItems = list.items.filter((i) => !i.done)
  const doneItems = list.items.filter((i) => i.done)
  const groups = groupByCategory(activeItems)

  function showToast(message: string, action?: ToastState['action']) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ message, action })
    toastTimer.current = setTimeout(() => setToast(null), action ? 4000 : 1800)
  }

  function handleAddToPantry(item: ShoppingItem) {
    addPantryItem(item.name, item.category)
    showToast(`${item.name} zum Vorrat hinzugefügt`)
  }

  function handleDelete(itemId: string) {
    const item = list!.items.find((i) => i.id === itemId)
    if (!item) return
    deleteItem(itemId)
    showToast(`„${item.name}“ gelöscht`, { label: 'Rückgängig', onClick: () => restoreItem(item) })
  }

  function handleToggle(itemId: string) {
    const item = list!.items.find((i) => i.id === itemId)
    if (!item) return
    const wasDone = item.done
    toggleItemDone(itemId)
    if (!wasDone) {
      showToast(`„${item.name}“ erledigt`, {
        label: 'Rückgängig',
        onClick: () => toggleItemDone(itemId),
      })
    }
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
        subtitle={`${list.weekLabel ? `Woche ${list.weekLabel} · ` : ''}${activeItems.length} offen`}
        onTitleClick={() => setSwitcherOpen(true)}
        right={
          <div className="flex items-center gap-1">
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

      <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-24">
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

        <QuickAddSection onAdded={(name) => showToast(`„${name}“ hinzugefügt`)} />

        {!activeItems.length && !doneItems.length ? (
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
            bottom: 'calc(72px + var(--safe-bottom))',
          }}
          onClick={() => setAddOpen(true)}
          aria-label="Artikel hinzufügen"
        >
          <Icon path={ICON_PATHS.plus} size={26} />
        </button>
      </FloatingPortal>

      {addOpen && <AddItemSheet onClose={() => setAddOpen(false)} onImported={showToast} />}
      {editingItem && <EditItemSheet item={editingItem} onClose={() => setEditingItem(null)} />}
      {switcherOpen && <ListSwitcherSheet onClose={() => setSwitcherOpen(false)} />}
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
                  className="flex items-center justify-between border-b px-3.5 py-3"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span className="flex items-center gap-2.5 text-[15px] font-semibold">
                    <ProductIcon iconKey={iconKey} size={20} />
                    {item.name} {item.amount && `· ${item.amount}`}
                  </span>
                  <button
                    className="tap-scale"
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

      {toast && (
        <FloatingPortal>
          <div
            className="glass fixed left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full py-2.5 pl-4.5 pr-2 text-[13px] font-semibold"
            style={{
              color: 'var(--text)',
              bottom: 'calc(88px + var(--safe-bottom))',
            }}
          >
            <span>{toast.message}</span>
            {toast.action && (
              <button
                className="tap-scale rounded-full px-3 py-1.5 text-[13px] font-bold"
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
