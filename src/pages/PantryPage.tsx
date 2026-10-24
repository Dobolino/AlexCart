import { PantryIdeas } from '@/components/PantryIdeas'
import { useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { groupByCategory } from '@/utils/group'
import { joinAmount } from '@/utils/amount'
import { CATEGORIES } from '@/data/products'
import { UNITS, getDefaultUnit, getDefaultUnitForCategory } from '@/constants/units'
import { getIconKey } from '@/utils/icon'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { EditPantrySheet } from '@/components/EditPantrySheet'
import { PantryItemRow } from '@/components/PantryItemRow'
import { FloatingPortal } from '@/components/FloatingPortal'
import { Sheet } from '@/components/Sheet'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import type { PantryItem } from '@/types'

export function PantryPage() {
  const pantry = useStore((s) => s.pantry)
  const addPantryItem = useStore((s) => s.addPantryItem)
  const removePantryItem = useStore((s) => s.removePantryItem)
  const decrementPantryItem = useStore((s) => s.decrementPantryItem)
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [amountValue, setAmountValue] = useState('')
  const [amountUnit, setAmountUnit] = useState(() => getDefaultUnitForCategory(CATEGORIES[0]))
  const [minValue, setMinValue] = useState('')
  const [minUnit, setMinUnit] = useState(() => getDefaultUnitForCategory(CATEGORIES[0]))
  const [editing, setEditing] = useState<PantryItem | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const amountUnitTouched = useRef(false)
  const minUnitTouched = useRef(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visiblePantry = pantry.filter((item) =>
    item.name.toLocaleLowerCase('de').includes(search.trim().toLocaleLowerCase('de'))
  )
  const groups = groupByCategory(visiblePantry)

  function applyDefaultUnits(nextName: string, nextCategory: string) {
    const unit = nextName.trim()
      ? getDefaultUnit(getIconKey(nextName, nextCategory), nextCategory)
      : getDefaultUnitForCategory(nextCategory)
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
    addPantryItem(name, category, joinAmount(amountValue, amountUnit), joinAmount(minValue, minUnit))
    setAdding(false)
    setSearch('')
    showToast(`„${name.trim()}“ zum Vorrat hinzugefügt`)
    setName('')
    setAmountValue('')
    setMinValue('')
    setAmountUnit(getDefaultUnitForCategory(category))
    setMinUnit(getDefaultUnitForCategory(category))
    amountUnitTouched.current = false
    minUnitTouched.current = false
  }

  function showToast(message: string) {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2200)
  }

  function handleDecrement(item: PantryItem) {
    const addedToList = decrementPantryItem(item.id)
    setFlashId(item.id)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlashId(null), 280)

    if (addedToList) {
      showToast(`„${item.name}" auf Einkaufsliste`)
    }
  }

  return (
    <>
      <PageHeader
        title="Vorrat"
        subtitle={`${pantry.length} Artikel · Bestand & Mindestmengen`}
        right={
          <button
            className="btn-primary tap-scale flex h-11 w-11 items-center justify-center rounded-full"
            aria-label="Vorratsartikel hinzufügen"
            onClick={() => setAdding(true)}
          >
            <Icon path={ICON_PATHS.plus} size={22} />
          </button>
        }
      />
      {adding && (
        <Sheet onClose={() => setAdding(false)}>
          <form
            className="min-h-0 overflow-y-auto pb-1"
            onSubmit={(event) => {
              event.preventDefault()
              handleAdd()
            }}
          >
            <h2 className="mb-4 text-xl font-bold">Vorratsartikel hinzufügen</h2>
            <label htmlFor="pantry-product-name" className="mb-1 block text-sm font-semibold">
              Produktname
            </label>
            <input
              id="pantry-product-name"
              type="text"
              className="input mb-2 w-full min-w-0"
              placeholder="z.B. Milch"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
            <select
              aria-label="Kategorie"
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
            <p className="mb-1 mt-2 text-sm font-semibold">Bestand</p>
            <div className="mb-2 grid grid-cols-2 gap-2">
              <input
                aria-label="Bestand"
                className="input w-full"
                inputMode="decimal"
                placeholder="Bestand"
                value={amountValue}
                onChange={(e) => setAmountValue(e.target.value)}
              />
              <select
                aria-label="Einheit des Bestands"
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
            <p className="mb-1 mt-2 text-sm font-semibold">
              Mindestbestand <span style={{ color: 'var(--text-muted)' }}>(optional)</span>
            </p>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <input
                aria-label="Mindestbestand"
                className="input w-full"
                inputMode="decimal"
                placeholder="Minimum"
                value={minValue}
                onChange={(e) => setMinValue(e.target.value)}
              />
              <select
                aria-label="Einheit des Mindestbestands"
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
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn-primary tap-scale min-h-12 w-full py-3 text-[14px]"
            >
              Hinzufügen
            </button>
          </form>
        </Sheet>
      )}
      <main className="scroll-behind-nav min-h-0 flex-1 overflow-y-auto px-3 pt-3">
        {pantry.length > 0 && (
          <input
            type="search"
            className="input mb-4"
            aria-label="Vorrat durchsuchen"
            placeholder="Vorrat durchsuchen"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        )}
        {!pantry.length ? (
          <EmptyState
            icon={ICON_PATHS.pantry}
            title="Vorrats-Liste ist leer"
            hint="Lege Artikel mit Bestand und Mindestmenge an – bei Unterschreitung schlägt die App Nachkauf vor."
            action={
              <button className="btn-primary min-h-12 px-5" onClick={() => setAdding(true)}>
                Ersten Artikel erfassen
              </button>
            }
          />
        ) : (
          groups.map((g) => (
            <div key={g.category} className="mb-4.5">
              <div className="px-1.5 pb-2 pt-1 text-[16px] font-bold" style={{ color: 'var(--category-fg)' }}>
                {g.category}
              </div>
              <div className="card-surface">
                {g.items.map((item) => (
                  <PantryItemRow
                    key={item.id}
                    item={item}
                    flash={flashId === item.id}
                    onEdit={() => setEditing(item)}
                    onRemove={() => removePantryItem(item.id)}
                    onDecrement={() => handleDecrement(item)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
        {pantry.length > 0 && !visiblePantry.length && (
          <p className="p-4 text-center text-sm" role="status">
            Kein Artikel gefunden.
          </p>
        )}
        {!search && <PantryIdeas />}
      </main>

      {editing && <EditPantrySheet item={editing} onClose={() => setEditing(null)} />}

      {toast && (
        <FloatingPortal>
          <div
            className="glass fixed left-1/2 z-40 max-w-[calc(100vw-24px)] -translate-x-1/2 rounded-full px-4 py-2.5 text-center text-[13px] font-semibold"
            style={{
              color: 'var(--text)',
              bottom: 'calc(72px + var(--safe-bottom))',
            }}
          >
            {toast}
          </div>
        </FloatingPortal>
      )}
    </>
  )
}
