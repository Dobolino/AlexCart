import { useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { groupByCategory } from '@/utils/group'
import { isLowStock } from '@/utils/pantry'
import { joinAmount } from '@/utils/amount'
import { CATEGORIES } from '@/data/products'
import { UNITS, DEFAULT_UNIT, getDefaultUnit } from '@/constants/units'
import { getIconKey } from '@/utils/icon'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { EditPantrySheet } from '@/components/EditPantrySheet'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import type { PantryItem } from '@/types'

export function PantryPage() {
  const pantry = useStore((s) => s.pantry)
  const addPantryItem = useStore((s) => s.addPantryItem)
  const removePantryItem = useStore((s) => s.removePantryItem)
  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [amountValue, setAmountValue] = useState('')
  const [amountUnit, setAmountUnit] = useState(DEFAULT_UNIT)
  const [minValue, setMinValue] = useState('')
  const [minUnit, setMinUnit] = useState(DEFAULT_UNIT)
  const [editing, setEditing] = useState<PantryItem | null>(null)
  const amountUnitTouched = useRef(false)
  const minUnitTouched = useRef(false)

  const groups = groupByCategory(pantry)

  function applyDefaultUnits(nextName: string, nextCategory: string) {
    const unit = getDefaultUnit(getIconKey(nextName, nextCategory))
    if (!amountUnitTouched.current) setAmountUnit(unit)
    if (!minUnitTouched.current) setMinUnit(unit)
  }

  function handleNameChange(value: string) {
    setName(value)
    applyDefaultUnits(value, category)
  }

  function handleCategoryChange(value: string) {
    setCategory(value)
    applyDefaultUnits(name, value)
  }

  function handleAdd() {
    if (!name.trim()) return
    addPantryItem(
      name,
      category,
      joinAmount(amountValue, amountUnit),
      joinAmount(minValue, minUnit)
    )
    setName('')
    setAmountValue('')
    setMinValue('')
    setAmountUnit(DEFAULT_UNIT)
    setMinUnit(DEFAULT_UNIT)
    amountUnitTouched.current = false
    minUnitTouched.current = false
  }

  return (
    <>
      <PageHeader title="Vorrat" subtitle="Bestand & Mindestmengen" />
      <main className="pb-nav min-h-0 flex-1 overflow-y-auto px-3 pt-3">
        <div className="card-surface mb-4 px-3.5 py-3.5">
          <div className="mb-2 text-[13px] font-bold">Neuer Vorrat-Artikel</div>
          <input
            type="text"
            className="input mb-2 w-full min-w-0"
            placeholder="z.B. Milch"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
          />
          <select
            className="input mb-2 w-full min-w-0"
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div className="mb-2 grid grid-cols-2 gap-2">
            <input
              className="input w-full"
              inputMode="decimal"
              placeholder="Bestand"
              value={amountValue}
              onChange={(e) => setAmountValue(e.target.value)}
            />
            <select
              className="input w-full"
              value={amountUnit}
              onChange={(e) => {
                amountUnitTouched.current = true
                setAmountUnit(e.target.value)
              }}
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-3 grid grid-cols-2 gap-2">
            <input
              className="input w-full"
              inputMode="decimal"
              placeholder="Minimum"
              value={minValue}
              onChange={(e) => setMinValue(e.target.value)}
            />
            <select
              className="input w-full"
              value={minUnit}
              onChange={(e) => {
                minUnitTouched.current = true
                setMinUnit(e.target.value)
              }}
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <button className="btn-primary tap-scale w-full py-3 text-[14px]" onClick={handleAdd}>
            Hinzufügen
          </button>
        </div>

        {!pantry.length ? (
          <EmptyState
            icon={ICON_PATHS.pantry}
            title="Vorrats-Liste ist leer"
            hint="Lege Artikel mit Bestand und Mindestmenge an – bei Unterschreitung schlägt die App Nachkauf vor."
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
                  const low = isLowStock(item)
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 border-b px-3.5 py-3.5 last:border-b-0"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <button
                        className="tap-scale min-w-0 flex-1 text-left"
                        onClick={() => setEditing(item)}
                      >
                        <span className="block truncate text-[15px] font-semibold">{item.name}</span>
                        <span className="block truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {item.amount ? `Bestand: ${item.amount}` : 'Kein Bestand erfasst'}
                          {item.minAmount ? ` · min ${item.minAmount}` : ''}
                        </span>
                      </button>
                      {low && (
                        <span
                          className="flex-none rounded-full px-2 py-0.5 text-[11px] font-bold"
                          style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                        >
                          Nachkauf
                        </span>
                      )}
                      <button
                        className="tap-scale flex-none p-1"
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

      {editing && <EditPantrySheet item={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
