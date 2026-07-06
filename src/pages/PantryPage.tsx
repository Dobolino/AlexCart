import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { groupByCategory } from '@/utils/group'
import { getIconKey, getIconSvgPath } from '@/utils/icon'
import { CATEGORIES } from '@/data/products'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'

export function PantryPage() {
  const pantry = useStore((s) => s.pantry)
  const addPantryItem = useStore((s) => s.addPantryItem)
  const removePantryItem = useStore((s) => s.removePantryItem)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])

  const groups = groupByCategory(pantry)

  return (
    <>
      <PageHeader title="Vorrat" subtitle="Immer vorrätige Artikel" />
      <main className="flex-1 px-3 pt-3" style={{ paddingBottom: 'calc(90px + var(--safe-bottom))' }}>
        <div className="mb-4 flex gap-2">
          <input
            type="text"
            className="flex-1 rounded-xl border px-3.5 py-3 text-[15px]"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            placeholder="z.B. Reis"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <select
            className="rounded-xl border px-2.5 text-[14px]"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            className="btn-duo rounded-xl px-4.5 text-xl"
            aria-label="Zum Vorrat hinzufügen"
            onClick={() => {
              if (!name.trim()) return
              addPantryItem(name, category)
              setName('')
            }}
          >
            <Icon path={ICON_PATHS.plus} size={18} />
          </button>
        </div>

        {!pantry.length ? (
          <div className="py-14 text-center text-[15px]" style={{ color: 'var(--text-muted)' }}>
            <div className="mb-2.5 flex justify-center">
              <Icon path={ICON_PATHS.pantry} size={44} />
            </div>
            Vorrats-Liste ist leer.
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.category} className="mb-4.5">
              <div
                className="px-1.5 pb-2 pt-1 text-[13px] font-extrabold uppercase tracking-wide"
                style={{ color: 'var(--category-fg)' }}
              >
                {g.category}
              </div>
              <div className="card-surface">
                {g.items.map((item) => {
                  const iconKey = getIconKey(item.name, item.category)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b px-3.5 py-3"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <span className="flex items-center gap-2.5 text-[15px] font-semibold">
                        <Icon path={getIconSvgPath(iconKey)} size={20} />
                        {item.name}
                      </span>
                      <button
                        style={{ color: 'var(--danger)' }}
                        onClick={() => removePantryItem(item.id)}
                        aria-label={`${item.name} entfernen`}
                      >
                        <Icon path={ICON_PATHS.close} size={18} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </main>
    </>
  )
}
