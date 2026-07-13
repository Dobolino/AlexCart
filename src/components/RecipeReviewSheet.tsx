import { useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ProductIconSlot } from './ProductIconSlot'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey } from '@/utils/icon'
import { getCategoryColor } from '@/utils/categoryColor'
import { truncateRecipeSnippet } from '@/utils/recipe'
import type { ImportItemPayload } from '@/types'

export interface RecipeReviewItem extends ImportItemPayload {
  id: string
}

interface RecipeReviewSheetProps {
  originalText: string
  initialItems: RecipeReviewItem[]
  onConfirm: (items: ImportItemPayload[]) => void
  onClose: () => void
}

export function RecipeReviewSheet({
  originalText,
  initialItems,
  onConfirm,
  onClose,
}: RecipeReviewSheetProps) {
  const [items, setItems] = useState(initialItems)

  function updateAmount(id: string, amount: string) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, amount } : item)))
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id))
  }

  function handleConfirm() {
    if (!items.length) return
    onConfirm(
      items.map(({ name, amount, category }) => ({
        name,
        amount: amount ?? '',
        category: category ?? 'Sonstiges',
      }))
    )
  }

  return (
    <Sheet onClose={onClose} tall>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0">
          <h2 className="text-[18px] font-extrabold">Rezept überprüfen</h2>
          <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            {items.length} Zutaten erkannt – Mengen anpassen oder unnötige Artikel entfernen.
          </p>
          <div
            className="mt-3 rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed"
            style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}
          >
            <span className="font-bold" style={{ color: 'var(--text)' }}>
              Original:
            </span>{' '}
            {truncateRecipeSnippet(originalText)}
          </div>
        </div>

        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <p className="px-1 py-8 text-center text-[14px]" style={{ color: 'var(--text-muted)' }}>
              Alle Zutaten wurden entfernt. Schließen und erneut analysieren.
            </p>
          ) : (
            items.map((item) => {
              const iconKey = getIconKey(item.name, item.category || 'Sonstiges')
              const color = getCategoryColor(item.category || 'Sonstiges')
              return (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 border-b py-3 last:border-b-0"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <ProductIconSlot
                    iconKey={iconKey}
                    size={18}
                    wrapClassName="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                    wrapStyle={{ background: color.bg, color: color.fg }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold">{item.name}</div>
                    <div className="truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {item.category || 'Sonstiges'}
                    </div>
                  </div>
                  <input
                    type="text"
                    className="input w-[5.5rem] flex-none px-2 py-1.5 text-right text-[13px] tabular-nums"
                    value={item.amount ?? ''}
                    placeholder="Menge"
                    aria-label={`Menge für ${item.name}`}
                    onChange={(e) => updateAmount(item.id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="tap-scale flex h-9 w-9 flex-none items-center justify-center rounded-full"
                    style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                    onClick={() => removeItem(item.id)}
                    aria-label={`${item.name} entfernen`}
                  >
                    <Icon path={ICON_PATHS.trash} size={16} />
                  </button>
                </div>
              )
            })
          )}
        </div>

        <button
          type="button"
          className="tap-scale mt-4 w-full shrink-0 rounded-full py-3.5 text-[15px] font-extrabold"
          style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
          disabled={!items.length}
          onClick={handleConfirm}
        >
          {items.length
            ? `${items.length} Artikel zur Liste hinzufügen`
            : 'Artikel zur Liste hinzufügen'}
        </button>
      </div>
    </Sheet>
  )
}
