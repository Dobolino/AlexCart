import { useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { CATEGORIES } from '@/data/products'
import { UNITS, getDefaultUnit } from '@/constants/units'
import { getIconKey } from '@/utils/icon'
import { useStore } from '@/store/useStore'
import { parseAmount, joinAmount } from '@/utils/amount'
import { isLowStock } from '@/utils/pantry'
import type { PantryItem } from '@/types'

interface EditPantrySheetProps {
  item: PantryItem
  onClose: () => void
}

export function EditPantrySheet({ item, onClose }: EditPantrySheetProps) {
  const updatePantryItem = useStore((s) => s.updatePantryItem)
  const removePantryItem = useStore((s) => s.removePantryItem)

  const currentParsed = parseAmount(item.amount)
  const minParsed = parseAmount(item.minAmount)
  const fallbackUnit = getDefaultUnit(getIconKey(item.name, item.category), item.category)

  const [name, setName] = useState(item.name)
  const [category, setCategory] = useState(item.category)
  const [amountValue, setAmountValue] = useState(currentParsed ? String(currentParsed.value) : '')
  const [amountUnit, setAmountUnit] = useState(currentParsed?.unit || fallbackUnit)
  const [minValue, setMinValue] = useState(minParsed ? String(minParsed.value) : '')
  const [minUnit, setMinUnit] = useState(minParsed?.unit || fallbackUnit)

  function handleSave() {
    if (!name.trim()) return
    updatePantryItem(item.id, {
      name: name.trim(),
      category,
      amount: joinAmount(amountValue, amountUnit),
      minAmount: joinAmount(minValue, minUnit),
    })
    onClose()
  }

  function handleDelete() {
    if (!window.confirm(`„${item.name}“ wirklich aus dem Vorrat entfernen?`)) return
    removePantryItem(item.id)
    onClose()
  }

  const previewItem: PantryItem = {
    ...item,
    name,
    category,
    amount: joinAmount(amountValue, amountUnit) || undefined,
    minAmount: joinAmount(minValue, minUnit) || undefined,
  }

  return (
    <Sheet onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Vorrat bearbeiten</h2>
        <button
          className="tap-scale flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
          onClick={handleDelete}
          aria-label={`${item.name} löschen`}
        >
          <Icon path={ICON_PATHS.trash} size={16} />
        </button>
      </div>

      <label className="mb-3 block">
        <span className="mb-1.5 block text-[13px] font-bold">Name</span>
        <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
      </label>

      <label className="mb-3 block">
        <span className="mb-1.5 block text-[13px] font-bold">Kategorie</span>
        <select className="input w-full" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>

      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold">Aktueller Bestand</span>
          <input
            className="input w-full"
            inputMode="decimal"
            placeholder="z. B. 0.5"
            value={amountValue}
            onChange={(e) => setAmountValue(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold">Einheit</span>
          <select className="input w-full" value={amountUnit} onChange={(e) => setAmountUnit(e.target.value)}>
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2.5">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold">Mindestbestand</span>
          <input
            className="input w-full"
            inputMode="decimal"
            placeholder="z. B. 1"
            value={minValue}
            onChange={(e) => setMinValue(e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-bold">Einheit</span>
          <select className="input w-full" value={minUnit} onChange={(e) => setMinUnit(e.target.value)}>
            {UNITS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLowStock(previewItem) && (
        <p className="mb-3 text-[13px] font-semibold" style={{ color: 'var(--danger)' }}>
          Unter Mindestbestand – wird auf der Einkaufsliste vorgeschlagen.
        </p>
      )}

      <div className="mt-4 flex gap-2.5">
        <button className="btn-soft flex-1 py-3.5 text-[15px]" onClick={onClose}>
          Abbrechen
        </button>
        <button className="btn-primary flex-1 py-3.5 text-[15px]" onClick={handleSave}>
          Speichern
        </button>
      </div>
    </Sheet>
  )
}
