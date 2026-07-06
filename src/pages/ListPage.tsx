import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useStore } from '@/store/useStore'
import { groupByCategory } from '@/utils/group'
import { ItemRow } from '@/components/ItemRow'
import { AddItemSheet } from '@/components/AddItemSheet'
import { ListSwitcherSheet } from '@/components/ListSwitcherSheet'
import { EmptyState } from '@/components/EmptyState'
import { PageHeader } from '@/components/PageHeader'
import { Sheet } from '@/components/Sheet'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { FloatingPortal } from '@/components/FloatingPortal'
import { getIconKey, getIconSvgPath } from '@/utils/icon'

export function ListPage() {
  const list = useStore((s) => s.activeList())
  const filteredItems = useStore((s) => s.filteredForActiveList())
  const toggleItemDone = useStore((s) => s.toggleItemDone)
  const deleteItem = useStore((s) => s.deleteItem)
  const restoreFilteredItem = useStore((s) => s.restoreFilteredItem)
  const clearFilteredNote = useStore((s) => s.clearFilteredNote)

  const [addOpen, setAddOpen] = useState(false)
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const [filteredOpen, setFilteredOpen] = useState(false)
  const [doneOpen, setDoneOpen] = useState(false)
  const [toast, setToast] = useState('')

  if (!list) return null

  const activeItems = list.items.filter((i) => !i.done)
  const doneItems = list.items.filter((i) => i.done)
  const groups = groupByCategory(activeItems)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 1800)
  }

  return (
    <>
      <PageHeader
        title={list.name}
        subtitle={`${list.weekLabel ? `Woche ${list.weekLabel} · ` : ''}${activeItems.length} offen`}
        onTitleClick={() => setSwitcherOpen(true)}
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
              <div key={g.category} className="mb-4.5">
                <div
                  className="px-1.5 pb-2 pt-1 text-[13px] font-extrabold uppercase tracking-wide"
                  style={{ color: 'var(--category-fg)' }}
                >
                  {g.category}
                </div>
                <div className="card-surface">
                  <AnimatePresence initial={false}>
                    {g.items.map((item) => (
                      <ItemRow key={item.id} item={item} onToggle={toggleItemDone} onDelete={deleteItem} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
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
                  <div className="card-surface mt-1.5">
                    <AnimatePresence initial={false}>
                      {doneItems.map((item) => (
                        <ItemRow key={item.id} item={item} onToggle={toggleItemDone} onDelete={deleteItem} />
                      ))}
                    </AnimatePresence>
                  </div>
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
                    <Icon path={getIconSvgPath(iconKey)} size={20} />
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
            className="glass fixed left-1/2 z-40 -translate-x-1/2 rounded-full px-4.5 py-2.5 text-[13px] font-semibold"
            style={{
              color: 'var(--text)',
              bottom: 'calc(88px + var(--safe-bottom))',
            }}
          >
            {toast}
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
