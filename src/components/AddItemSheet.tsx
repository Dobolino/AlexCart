import { useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey, getIconSvgPath } from '@/utils/icon'
import { searchProducts } from '@/utils/search'
import { useStore } from '@/store/useStore'
import { CATEGORIES } from '@/data/products'

interface AddItemSheetProps {
  onClose: () => void
  onImported: (message: string) => void
}

type Mode = 'search' | 'create' | 'import'

export function AddItemSheet({ onClose, onImported }: AddItemSheetProps) {
  const customProducts = useStore((s) => s.customProducts)
  const addItemToActiveList = useStore((s) => s.addItemToActiveList)
  const addCustomProduct = useStore((s) => s.addCustomProduct)
  const importIntoActiveList = useStore((s) => s.importIntoActiveList)

  const [mode, setMode] = useState<Mode>('search')
  const [query, setQuery] = useState('')
  const [addedCount, setAddedCount] = useState(0)

  const [name, setName] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [amountValue, setAmountValue] = useState('')
  const [unit, setUnit] = useState('')
  const [note, setNote] = useState('')

  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')

  const results = searchProducts(query, customProducts)

  function pick(result: (typeof results)[number]) {
    addItemToActiveList({ name: result.name, amount: result.amount || '', category: result.category })
    setAddedCount((c) => c + 1)
    setQuery('')
  }

  function openCreateForm() {
    setName(query)
    setMode('create')
  }

  function handleCreate() {
    if (!name.trim()) return
    const amount = [amountValue.trim(), unit.trim()].filter(Boolean).join(' ')
    const product = addCustomProduct({ name, category, amount, note })
    addItemToActiveList({ name: product.name, amount: product.defaultAmount, category: product.category })
    setAddedCount((c) => c + 1)
    setName('')
    setAmountValue('')
    setUnit('')
    setNote('')
    setQuery('')
    setMode('search')
  }

  function handleImport() {
    if (!importText.trim()) {
      setImportError('Bitte JSON einfügen.')
      return
    }
    const result = importIntoActiveList(importText.trim())
    if (!result.ok) {
      setImportError(result.error || 'Import fehlgeschlagen.')
      return
    }
    onClose()
    const suffix = result.filteredCount ? `, ${result.filteredCount} aus Vorrat gefiltert` : ''
    onImported(`${result.keptCount} Artikel importiert${suffix}`)
  }

  return (
    <Sheet onClose={onClose}>
      <div className="mb-4 flex gap-1.5 rounded-2xl p-1" style={{ background: 'var(--chip-bg)' }}>
        {(['search', 'import'] as const).map((m) => (
          <button
            key={m}
            className="flex-1 rounded-xl py-2 text-[13px] font-bold tap-scale"
            style={{
              background: mode === m || (m === 'search' && mode === 'create') ? 'var(--surface)' : 'transparent',
              color: 'var(--text)',
            }}
            onClick={() => setMode(m)}
          >
            {m === 'search' ? 'Hinzufügen' : 'Wochenplan importieren'}
          </button>
        ))}
      </div>

      {mode !== 'import' ? (
        mode === 'search' ? (
          <>
            <h2 className="mb-3 text-lg font-bold">Artikel hinzufügen</h2>
            <input
              autoFocus
              type="text"
              className="w-full rounded-2xl border px-4 py-3.5 text-[16px]"
              style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
              placeholder="z.B. Tomaten"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="mt-2 max-h-[300px] overflow-y-auto">
              {results.map((r) => {
                const iconKey = getIconKey(r.name, r.category)
                return (
                  <button
                    key={r.customId || r.name}
                    className="tap-scale flex w-full items-center gap-3 border-b px-1 py-3 text-left"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => pick(r)}
                  >
                    <span
                      className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                      style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                    >
                      <Icon path={getIconSvgPath(iconKey)} size={20} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{r.name}</span>
                      <span className="block text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {r.category}
                      </span>
                    </span>
                    <Icon path={ICON_PATHS.plus} size={18} />
                  </button>
                )
              })}
              {query.trim() && (
                <button
                  className="tap-scale mt-1 flex w-full items-center gap-3 px-1 py-3 text-left"
                  onClick={openCreateForm}
                >
                  <span
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                    style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
                  >
                    <Icon path={ICON_PATHS.plus} size={18} />
                  </span>
                  <span className="text-[15px] font-semibold" style={{ color: 'var(--accent)' }}>
                    „{query}“ als neues Produkt anlegen
                  </span>
                </button>
              )}
            </div>
            {addedCount > 0 && (
              <button className="btn-primary mt-4 w-full py-3.5 text-[15px]" onClick={onClose}>
                Fertig ({addedCount} hinzugefügt)
              </button>
            )}
          </>
        ) : (
          <>
            <h2 className="mb-3 text-lg font-bold">Neues Produkt</h2>
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
                  placeholder="Menge (z.B. 500)"
                  value={amountValue}
                  onChange={(e) => setAmountValue(e.target.value)}
                />
                <input
                  type="text"
                  className="w-1/2 rounded-2xl border px-4 py-3 text-[15px]"
                  style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
                  placeholder="Einheit (z.B. g)"
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
              <button className="btn-soft flex-1 py-3.5 text-[15px]" onClick={() => setMode('search')}>
                Zurück
              </button>
              <button className="btn-primary flex-1 py-3.5 text-[15px]" onClick={handleCreate}>
                Anlegen &amp; hinzufügen
              </button>
            </div>
          </>
        )
      ) : (
        <>
          <h2 className="mb-1 text-lg font-bold">Wochenplan importieren</h2>
          <p className="mb-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            JSON aus deinem Essensplan-Chat hier einfügen.
          </p>
          <textarea
            className="min-h-[160px] w-full rounded-2xl border p-3 font-mono text-[14px]"
            style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            placeholder='{"week":"2026-07-06","items":[{"name":"Tomaten","amount":"500g","category":"Obst & Gemüse"}]}'
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <div className="mt-2 min-h-[16px] text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
            {importError}
          </div>
          <button className="btn-primary mt-3 w-full py-3.5 text-[15px]" onClick={handleImport}>
            Importieren
          </button>
        </>
      )}
    </Sheet>
  )
}
