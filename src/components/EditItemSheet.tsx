import { useState } from 'react'
import { Sheet } from './Sheet'
import { ProductForm, type ProductFormValues } from './ProductForm'
import { getDefaultUnit } from '@/constants/units'
import { getIconKey } from '@/utils/icon'
import { useStore } from '@/store/useStore'
import { parseAmount, joinAmount } from '@/utils/amount'
import type { ShoppingItem } from '@/types'

interface EditItemSheetProps {
  item: ShoppingItem
  onClose: () => void
}

/** Bearbeitet einen bestehenden Artikel der aktiven Einkaufsliste (nicht das Produkt selbst). */
export function EditItemSheet({ item, onClose }: EditItemSheetProps) {
  const updateItemInActiveList = useStore((s) => s.updateItemInActiveList)
  const parsed = parseAmount(item.amount)

  const [form, setForm] = useState<ProductFormValues>({
    name: item.name,
    category: item.category,
    amountValue: parsed ? String(parsed.value) : '',
    unit: parsed?.unit || getDefaultUnit(getIconKey(item.name, item.category)),
    note: item.note || '',
  })

  function handleSave() {
    if (!form.name.trim()) return
    updateItemInActiveList(item.id, {
      name: form.name,
      category: form.category,
      amount: joinAmount(form.amountValue, form.unit),
      note: form.note,
    })
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-3 text-lg font-bold">Artikel bearbeiten</h2>
      <ProductForm values={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />
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
