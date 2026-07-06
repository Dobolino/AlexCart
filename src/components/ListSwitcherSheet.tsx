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
  const [newName, setNewName] = useState('')

  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-3 text-lg font-bold">Meine Listen</h2>
      <div className="card-surface mb-4">
        {lists.map((list) => (
          <div
            key={list.id}
            className="flex items-center justify-between border-b px-3.5 py-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <button
              className="flex-1 text-left text-[15px] font-semibold"
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
            {lists.length > 1 && (
              <button
                style={{ color: 'var(--danger)' }}
                onClick={() => deleteList(list.id)}
                aria-label={`${list.name} löschen`}
              >
                <Icon path={ICON_PATHS.trash} size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          className="flex-1 rounded-xl border px-3.5 py-3 text-[15px]"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          placeholder="z.B. Grillfest"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
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
