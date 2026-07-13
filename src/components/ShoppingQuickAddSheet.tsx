import { useMemo, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ProductIconSlot } from './ProductIconSlot'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey } from '@/utils/icon'
import { getCategoryColor } from '@/utils/categoryColor'
import { searchProducts } from '@/utils/search'
import { buildLastPurchaseIndex, lastPurchasedHintForName } from '@/utils/purchaseFrequency'
import { buildQuickPicks } from '@/utils/quickAdd'
import { useStore } from '@/store/useStore'

interface ShoppingQuickAddSheetProps {
  onClose: () => void
  onAdded?: (name: string) => void
}

export function ShoppingQuickAddSheet({ onClose, onAdded }: ShoppingQuickAddSheetProps) {
  const list = useStore((s) => s.activeList())
  const lists = useStore((s) => s.lists)
  const customProducts = useStore((s) => s.customProducts)
  const completedTrips = useStore((s) => s.completedTrips)
  const addItemToActiveList = useStore((s) => s.addItemToActiveList)
  const [query, setQuery] = useState('')

  const trimmed = query.trim()
  const results = useMemo(() => searchProducts(query, customProducts, 8), [query, customProducts])
  const lastPurchaseIndex = useMemo(
    () => buildLastPurchaseIndex(completedTrips),
    [completedTrips]
  )
  const quickPicks = useMemo(
    () => (list ? buildQuickPicks(list, lists, customProducts, 6) : []),
    [list, lists, customProducts]
  )

  function addItem(name: string, category: string, amount = '', note?: string) {
    addItemToActiveList({ name, category, amount, note })
    onAdded?.(name)
    onClose()
  }

  function handlePick(name: string, category: string, amount = '', note?: string) {
    addItem(name, category, amount, note)
  }

  return (
    <Sheet onClose={onClose}>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="shrink-0">
          <h2 className="mb-1 text-[17px] font-bold">Extra hinzufügen</h2>
          <p className="mb-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Für spontane Artikel während dem Einkauf
          </p>
          <input
            autoFocus
            type="text"
            className="input"
            placeholder="Suchen oder eintippen…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && trimmed) addItem(trimmed, 'Sonstiges')
            }}
          />
        </div>

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {trimmed && (
            <button
              type="button"
              className="tap-scale mb-1 flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left"
              style={{ background: 'var(--chip-bg)' }}
              onClick={() => addItem(trimmed, 'Sonstiges')}
            >
              <span
                className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <Icon path={ICON_PATHS.plus} size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">„{trimmed}" hinzufügen</span>
                <span className="block text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  Sonstiges
                </span>
              </span>
            </button>
          )}

          {!trimmed && quickPicks.length > 0 && (
            <div className="mb-3">
              <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Schnellwahl
              </div>
              <div className="flex flex-wrap gap-2">
                {quickPicks.map((pick) => (
                  <button
                    key={pick.key}
                    type="button"
                    className="tap-scale rounded-full px-3 py-1.5 text-[12px] font-semibold"
                    style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
                    onClick={() => handlePick(pick.name, pick.category, pick.amount, pick.note)}
                  >
                    {pick.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.map((r) => {
            const iconKey = getIconKey(r.name, r.category)
            const color = getCategoryColor(r.category)
            const frequencyHint = lastPurchasedHintForName(r.name, lastPurchaseIndex)
            return (
              <button
                key={r.customId || r.name}
                type="button"
                className="tap-scale flex w-full items-center gap-3 border-b px-1 py-3 text-left"
                style={{ borderColor: 'var(--border)' }}
                onClick={() => handlePick(r.name, r.category, r.amount || '', r.note)}
              >
                <ProductIconSlot
                  iconKey={iconKey}
                  size={20}
                  wrapClassName="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                  wrapStyle={{ background: color.bg, color: color.fg }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{r.name}</span>
                  {frequencyHint && (
                    <span className="block truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {frequencyHint}
                    </span>
                  )}
                  <span className="block text-[12px]" style={{ color: 'var(--text-muted)' }}>
                    {r.category}
                    {r.amount ? ` · ${r.amount}` : ''}
                  </span>
                </span>
                <Icon path={ICON_PATHS.plus} size={16} />
              </button>
            )
          })}

          {!trimmed && !quickPicks.length && (
            <p className="px-1 py-6 text-center text-[13px]" style={{ color: 'var(--text-muted)' }}>
              Produktname eintippen oder aus der Liste wählen
            </p>
          )}
        </div>
      </div>
    </Sheet>
  )
}
