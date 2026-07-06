import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { groupByCategory } from '@/utils/group'
import { ItemRow } from '@/components/ItemRow'
import { ImportSheet } from '@/components/ImportSheet'
import { ListSwitcherSheet } from '@/components/ListSwitcherSheet'
import { Sheet } from '@/components/Sheet'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey, getIconSvgPath } from '@/utils/icon'

export function ListPage() {
  const list = useStore((s) => s.activeList())
  const filteredItems = useStore((s) => s.filteredForActiveList())
  const toggleItemDone = useStore((s) => s.toggleItemDone)
  const deleteItem = useStore((s) => s.deleteItem)
  const restoreFilteredItem = useStore((s) => s.restoreFilteredItem)
  const clearFilteredNote = useStore((s) => s.clearFilteredNote)

  const [importOpen, setImportOpen] = useState(false)
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
      <header
        className="sticky top-0 z-20 flex items-center justify-between px-4"
        style={{
          background: 'var(--header-bg)',
          color: 'var(--header-fg)',
          paddingTop: 'calc(14px + var(--safe-top))',
          paddingBottom: '14px',
        }}
      >
        <button className="text-left" onClick={() => setSwitcherOpen(true)}>
          <h1 className="text-[20px] font-extrabold leading-none">{list.name}</h1>
          <div className="mt-0.5 text-[12px] font-medium opacity-75">
            {list.weekLabel ? `Woche ${list.weekLabel} · ` : ''}
            {activeItems.length} offen
          </div>
        </button>
      </header>

      <main className="flex-1 px-3 pt-3" style={{ paddingBottom: 'calc(90px + var(--safe-bottom))' }}>
        {filteredItems.length > 0 && (
          <div
            className="mb-3.5 flex items-center justify-between gap-2.5 rounded-[14px] px-3.5 py-3 text-[13px]"
            style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}
          >
            <span>{filteredItems.length} Artikel aus Vorrat automatisch gefiltert</span>
            <button className="font-bold" style={{ color: 'var(--text)' }} onClick={() => setFilteredOpen(true)}>
              Anzeigen
            </button>
          </div>
        )}

        {!activeItems.length && !doneItems.length ? (
          <div className="py-14 text-center text-[15px]" style={{ color: 'var(--text-muted)' }}>
            <div className="mb-2.5 flex justify-center" style={{ color: 'var(--text-muted)' }}>
              <Icon path={ICON_PATHS.cart} size={44} />
            </div>
            Noch keine Einkaufsliste.
            <br />
            Importiere unten deinen Wochenplan.
          </div>
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
                  {g.items.map((item) => (
                    <ItemRow key={item.id} item={item} onToggle={toggleItemDone} onDelete={deleteItem} />
                  ))}
                </div>
              </div>
            ))}

            {doneItems.length > 0 && (
              <>
                <div
                  className="mt-1 flex cursor-pointer items-center justify-between rounded-2xl px-4 py-3.5 text-[14px] font-bold"
                  style={{ background: 'var(--surface)', color: 'var(--text-muted)' }}
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
                    {doneItems.map((item) => (
                      <ItemRow key={item.id} item={item} onToggle={toggleItemDone} onDelete={deleteItem} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <button
        className="btn-duo fixed right-4.5 z-20 flex h-14 w-14 items-center justify-center rounded-full text-2xl"
        style={{ bottom: 'calc(84px + var(--safe-bottom))' }}
        onClick={() => setImportOpen(true)}
        aria-label="Wochenplan importieren"
      >
        <Icon path={ICON_PATHS.import} size={24} />
      </button>

      {importOpen && <ImportSheet onClose={() => setImportOpen(false)} onImported={showToast} />}
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
            className="mt-3 w-full rounded-[14px] py-3 text-[13px] font-bold"
            style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
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
        <div
          className="fixed left-1/2 z-40 -translate-x-1/2 rounded-full px-4.5 py-2.5 text-[13px] font-semibold text-white"
          style={{ background: '#1b1f27', bottom: 'calc(100px + var(--safe-bottom))' }}
        >
          {toast}
        </div>
      )}
    </>
  )
}
