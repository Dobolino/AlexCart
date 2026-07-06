import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { groupByCategory } from '@/utils/group'
import { getIconKey, getIconSvgPath } from '@/utils/icon'
import { getCategoryColor } from '@/utils/categoryColor'
import { CATEGORIES } from '@/data/products'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
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
      <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-6">
        <div className="mb-4 flex flex-col gap-2">
          <input
            type="text"
            className="input w-full min-w-0"
            placeholder="z.B. Reis"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex gap-2">
            <select
              className="input min-w-0 flex-1"
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
              className="btn-primary tap-scale flex-none rounded-xl px-5 text-xl"
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
        </div>

        {!pantry.length ? (
          <EmptyState
            icon={ICON_PATHS.pantry}
            title="Vorrats-Liste ist leer"
            hint="Füge Artikel hinzu, die du immer zuhause hast – sie werden bei Importen automatisch rausgefiltert."
          />
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
                  const color = getCategoryColor(item.category)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between border-b px-3.5 py-3"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <span className="flex items-center gap-2.5 text-[15px] font-semibold">
                        <span
                          className="flex h-8 w-8 flex-none items-center justify-center rounded-full"
                          style={{ background: color.bg, color: color.fg }}
                        >
                          <Icon path={getIconSvgPath(iconKey)} size={18} />
                        </span>
                        {item.name}
                      </span>
                      <button
                        className="tap-scale"
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
