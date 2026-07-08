import { useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { useStore } from '@/store/useStore'

interface ListSwitcherSheetProps {
  onClose: () => void
}

export function ListSwitcherSheet({ onClose }: ListSwitcherSheetProps) {
  const lists = useStore((s) => s.lists)
  const activeListId = useStore((s) => s.activeListId)
  const switchList = useStore((s) => s.switchList)
  const createList = useStore((s) => s.createList)
  const deleteList = useStore((s) => s.deleteList)
  const renameList = useStore((s) => s.renameList)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  function startRename(listId: string, currentName: string) {
    setEditingId(listId)
    setEditName(currentName)
  }

  function saveRename(listId: string) {
    if (editName.trim()) renameList(listId, editName)
    setEditingId(null)
    setEditName('')
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-3 text-lg font-bold">Meine Listen</h2>
      <div className="card-surface mb-4">
        {lists.map((list) => (
          <div
            key={list.id}
            className="flex items-center gap-2 border-b px-3.5 py-3"
            style={{ borderColor: 'var(--border)' }}
          >
            {editingId === list.id ? (
              <>
                <input
                  autoFocus
                  type="text"
                  className="input flex-1 py-2 text-[15px]"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename(list.id)
                    if (e.key === 'Escape') setEditingId(null)
                  }}
                />
                <button
                  className="tap-scale rounded-full p-1.5"
                  style={{ color: 'var(--accent)' }}
                  onClick={() => saveRename(list.id)}
                  aria-label="Name speichern"
                >
                  <Icon path={ICON_PATHS.check} size={18} />
                </button>
              </>
            ) : (
              <>
                <button
                  className="min-w-0 flex-1 text-left text-[15px] font-semibold"
                  style={{ color: list.id === activeListId ? 'var(--accent)' : 'var(--text)' }}
                  onClick={() => {
                    switchList(list.id)
                    onClose()
                  }}
                >
                  {list.name}
                  <span className="ml-2 text-[12px] font-normal" style={{ color: 'var(--text-muted)' }}>
                    {list.items.filter((i) => !i.done).length} offen
                  </span>
                </button>
                <button
                  className="tap-scale p-1"
                  style={{ color: 'var(--text-muted)' }}
                  onClick={() => startRename(list.id, list.name)}
                  aria-label={`${list.name} umbenennen`}
                >
                  <Icon path={ICON_PATHS.edit} size={17} />
                </button>
                {lists.length > 1 && (
                  <button
                    className="tap-scale p-1"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => {
                      if (window.confirm(`„${list.name}“ wirklich löschen?`)) deleteList(list.id)
                    }}
                    aria-label={`${list.name} löschen`}
                  >
                    <Icon path={ICON_PATHS.trash} size={18} />
                  </button>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="input flex-1"
          placeholder="z.B. Grillfest"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newName.trim()) {
              createList(newName)
              setNewName('')
              onClose()
            }
          }}
        />
        <button
          className="btn-primary tap-scale rounded-xl px-5 text-xl"
          aria-label="Neue Liste anlegen"
          onClick={() => {
            if (!newName.trim()) return
            createList(newName)
            setNewName('')
            onClose()
          }}
        >
          <Icon path={ICON_PATHS.plus} size={18} />
        </button>
      </div>
    </Sheet>
  )
}
