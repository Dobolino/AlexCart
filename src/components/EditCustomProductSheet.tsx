import { useState } from 'react'
import { Sheet } from './Sheet'
import { useStore } from '@/store/useStore'
import { CATEGORIES } from '@/data/products'
import { parseAmount } from '@/utils/amount'
import type { CustomProduct } from '@/types'

interface EditCustomProductSheetProps {
  product: CustomProduct
  onClose: () => void
}

export function EditCustomProductSheet({ product, onClose }: EditCustomProductSheetProps) {
  const updateCustomProduct = useStore((s) => s.updateCustomProduct)
  const parsed = parseAmount(product.defaultAmount)

  const [name, setName] = useState(product.name)
  const [category, setCategory] = useState(product.category)
  const [amountValue, setAmountValue] = useState(parsed ? String(parsed.value) : '')
  const [unit, setUnit] = useState(parsed?.unit || '')
  const [note, setNote] = useState(product.note || '')

  function handleSave() {
    if (!name.trim()) return
    const amount = [amountValue.trim(), unit.trim()].filter(Boolean).join(' ')
    updateCustomProduct(product.id, { name: name.trim(), category, defaultAmount: amount, note: note.trim() })
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-3 text-lg font-bold">Produkt bearbeiten</h2>
      <div className="flex flex-col gap-2.5">
        <input
          type="text"
          className="rounded-2xl border px-4 py-3 text-[15px]"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <select
          className="rounded-2xl border px-4 py-3 text-[15px]"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex gap-2.5">
          <input
            type="text"
            inputMode="decimal"
            className="w-1/2 rounded-2xl border px-4 py-3 text-[15px]"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            placeholder="Menge"
            value={amountValue}
            onChange={(e) => setAmountValue(e.target.value)}
          />
          <input
            type="text"
            className="w-1/2 rounded-2xl border px-4 py-3 text-[15px]"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            placeholder="Einheit"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
          />
        </div>
        <input
          type="text"
          className="rounded-2xl border px-4 py-3 text-[15px]"
          style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
          placeholder="Notiz (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
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
