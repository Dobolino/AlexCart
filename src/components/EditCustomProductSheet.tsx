import { useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ProductForm, type ProductFormValues } from './ProductForm'
import { ICON_PATHS } from '@/constants/icons'
import { getDefaultUnit } from '@/constants/units'
import { getIconKey } from '@/utils/icon'
import { useStore } from '@/store/useStore'
import { parseAmount, joinAmount } from '@/utils/amount'
import type { CustomProduct } from '@/types'

interface EditCustomProductSheetProps {
  product: CustomProduct
  onClose: () => void
}

export function EditCustomProductSheet({ product, onClose }: EditCustomProductSheetProps) {
  const updateCustomProduct = useStore((s) => s.updateCustomProduct)
  const removeCustomProduct = useStore((s) => s.removeCustomProduct)
  const parsed = parseAmount(product.defaultAmount)

  const [form, setForm] = useState<ProductFormValues>({
    name: product.name,
    category: product.category,
    amountValue: parsed ? String(parsed.value) : '',
    unit: parsed?.unit || getDefaultUnit(getIconKey(product.name, product.category)),
    note: product.note || '',
  })

  function handleSave() {
    if (!form.name.trim()) return
    updateCustomProduct(product.id, {
      name: form.name.trim(),
      category: form.category,
      defaultAmount: joinAmount(form.amountValue, form.unit),
      note: form.note.trim() || undefined,
    })
    onClose()
  }

  function handleDelete() {
    if (!window.confirm(`„${product.name}“ wirklich löschen?`)) return
    removeCustomProduct(product.id)
    onClose()
  }

  return (
    <Sheet onClose={onClose}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold">Produkt bearbeiten</h2>
        <button
          className="tap-scale flex h-8 w-8 items-center justify-center rounded-full"
          style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
          onClick={handleDelete}
          aria-label={`${product.name} löschen`}
        >
          <Icon path={ICON_PATHS.trash} size={16} />
        </button>
      </div>
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
