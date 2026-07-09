import { useState } from 'react'
import { Sheet } from './Sheet'
import { ProductForm, type ProductFormValues } from './ProductForm'
import { getDefaultUnit } from '@/constants/units'
import { getIconKey } from '@/utils/icon'
import { findPriceProfile } from '@/utils/priceProfiles'
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
  const priceProfiles = useStore((s) => s.priceProfiles)
  const parsed = parseAmount(item.amount)
  const profile = findPriceProfile(priceProfiles, item.name, item.category)

  const [form, setForm] = useState<ProductFormValues>({
    name: item.name,
    category: item.category,
    amountValue: parsed ? String(parsed.value) : '',
    unit: parsed?.unit || getDefaultUnit(getIconKey(item.name, item.category)),
    note: item.note || '',
  })
  const [variantId, setVariantId] = useState(item.variantId || '')

  function handleSave() {
    if (!form.name.trim()) return
    updateItemInActiveList(item.id, {
      name: form.name,
      category: form.category,
      amount: joinAmount(form.amountValue, form.unit),
      note: form.note,
      variantId: variantId || undefined,
    })
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-3 text-lg font-bold">Artikel bearbeiten</h2>
      <ProductForm values={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />

      {profile && profile.variants.length > 0 && (
        <div className="mt-3">
          <label className="mb-1.5 block px-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
            Variante für Kostenschätzung
          </label>
          <select
            className="input w-full py-3 text-[15px]"
            value={variantId}
            onChange={(e) => setVariantId(e.target.value)}
          >
            <option value="">Automatisch (zuletzt gekauft)</option>
            {profile.variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
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
