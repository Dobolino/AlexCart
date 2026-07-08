import { useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ProductForm, type ProductFormValues } from './ProductForm'
import { ICON_PATHS } from '@/constants/icons'
import { DEFAULT_UNIT } from '@/constants/units'
import { getIconKey } from '@/utils/icon'
import { ProductIconSlot } from '@/components/ProductIconSlot'
import { getCategoryColor } from '@/utils/categoryColor'
import { searchProducts } from '@/utils/search'
import { parseAmount, joinAmount } from '@/utils/amount'
import { useStore } from '@/store/useStore'
import { CATEGORIES } from '@/data/products'
import type { ImportMode } from '@/types'

interface AddItemSheetProps {
  onClose: () => void
  onImported: (message: string) => void
}

type Mode = 'search' | 'form' | 'import'
type FormMode = 'new' | 'confirm-builtin' | 'confirm-custom'

const EMPTY_FORM: ProductFormValues = { name: '', category: CATEGORIES[0], amountValue: '', unit: DEFAULT_UNIT, note: '' }

export function AddItemSheet({ onClose, onImported }: AddItemSheetProps) {
  const customProducts = useStore((s) => s.customProducts)
  const addItemToActiveList = useStore((s) => s.addItemToActiveList)
  const addCustomProduct = useStore((s) => s.addCustomProduct)
  const updateCustomProduct = useStore((s) => s.updateCustomProduct)
  const importIntoActiveList = useStore((s) => s.importIntoActiveList)
  const activeList = useStore((s) => s.activeList())

  const [mode, setMode] = useState<Mode>('search')
  const [query, setQuery] = useState('')
  const [addedCount, setAddedCount] = useState(0)

  const [formMode, setFormMode] = useState<FormMode>('new')
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormValues>(EMPTY_FORM)

  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [importMode, setImportMode] = useState<ImportMode>('merge')

  const openCount = activeList?.items.filter((i) => !i.done).length ?? 0

  const results = searchProducts(query, customProducts)

  function openConfirmFor(result: (typeof results)[number]) {
    const parsed = parseAmount(result.amount)
    setForm({
      name: result.name,
      category: result.category,
      amountValue: parsed ? String(parsed.value) : '',
      unit: parsed?.unit || DEFAULT_UNIT,
      note: result.note || '',
    })
    setFormMode(result.isCustom ? 'confirm-custom' : 'confirm-builtin')
    setEditingCustomId(result.customId ?? null)
    setMode('form')
  }

  function openCreateForm() {
    setForm({ ...EMPTY_FORM, name: query })
    setFormMode('new')
    setEditingCustomId(null)
    setMode('form')
  }

  function handleFormSubmit() {
    if (!form.name.trim()) return
    const amount = joinAmount(form.amountValue, form.unit)

    if (formMode === 'new') {
      addCustomProduct({ name: form.name, category: form.category, amount, note: form.note })
    } else if (formMode === 'confirm-custom' && editingCustomId) {
      updateCustomProduct(editingCustomId, {
        name: form.name.trim(),
        category: form.category,
        defaultAmount: amount,
        note: form.note.trim() || undefined,
      })
    }

    addItemToActiveList({ name: form.name, amount, category: form.category, note: form.note })
    setAddedCount((c) => c + 1)
    setQuery('')
    setForm(EMPTY_FORM)
    setMode('search')
  }

  function handleImport() {
    if (!importText.trim()) {
      setImportError('Bitte JSON einfügen.')
      return
    }
    const result = importIntoActiveList(importText.trim(), importMode)
    if (!result.ok) {
      setImportError(result.error || 'Import fehlgeschlagen.')
      return
    }
    onClose()
    const suffix = result.filteredCount ? `, ${result.filteredCount} aus Vorrat gefiltert` : ''
    const modeLabel =
      importMode === 'replace' ? 'importiert' : importMode === 'append' ? 'angehängt' : 'zusammengeführt'
    onImported(`${result.keptCount} Artikel ${modeLabel}${suffix}`)
  }

  return (
    <Sheet onClose={onClose}>
      <div className="mb-4 flex gap-1.5 rounded-2xl p-1" style={{ background: 'var(--chip-bg)' }}>
        {(['search', 'import'] as const).map((m) => (
          <button
            key={m}
            className="flex-1 rounded-xl py-2 text-[13px] font-bold tap-scale"
            style={{
              background: mode === m || (m === 'search' && mode === 'form') ? 'var(--surface)' : 'transparent',
              color: 'var(--text)',
            }}
            onClick={() => setMode(m)}
          >
            {m === 'search' ? 'Hinzufügen' : 'Wochenplan importieren'}
          </button>
        ))}
      </div>

      {mode === 'search' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0">
            <h2 className="mb-3 text-lg font-bold">Artikel hinzufügen</h2>
            <input
              autoFocus
              type="text"
              className="input"
              placeholder="z.B. Tomaten"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {results.map((r) => {
              const iconKey = getIconKey(r.name, r.category)
              const color = getCategoryColor(r.category)
              return (
                <button
                  key={r.customId || r.name}
                  className="tap-scale flex w-full items-center gap-3 border-b px-1 py-3 text-left"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={() => openConfirmFor(r)}
                >
                  <ProductIconSlot
                    iconKey={iconKey}
                    size={20}
                    wrapClassName="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                    wrapStyle={{ background: color.bg, color: color.fg }}
                  />
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
            <button className="btn-primary mt-4 w-full shrink-0 py-3.5 text-[15px]" onClick={onClose}>
              Fertig ({addedCount} hinzugefügt)
            </button>
          )}
        </div>
      )}

      {mode === 'form' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <h2 className="mb-3 text-lg font-bold">{formMode === 'new' ? 'Neues Produkt' : 'Zur Liste hinzufügen'}</h2>
          <ProductForm values={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} autoFocusName={formMode === 'new'} />
          <div className="mt-4 flex gap-2.5">
            <button className="btn-soft flex-1 py-3.5 text-[15px]" onClick={() => setMode('search')}>
              Zurück
            </button>
            <button className="btn-primary flex-1 py-3.5 text-[15px]" onClick={handleFormSubmit}>
              {formMode === 'new' ? 'Anlegen & hinzufügen' : 'Hinzufügen'}
            </button>
          </div>
        </div>
      )}

      {mode === 'import' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <h2 className="mb-1 text-lg font-bold">Wochenplan importieren</h2>
          <p className="mb-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            JSON aus deinem Essensplan-Chat hier einfügen.
          </p>
          <textarea
            className="input min-h-[160px] font-mono text-[14px]"
            placeholder='{"week":"2026-07-06","items":[{"name":"Tomaten","amount":"500g","category":"Obst & Gemüse"}]}'
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value)
              setImportError('')
            }}
          />
          {openCount > 0 && (
            <div className="mt-3">
              <div className="mb-2 text-[13px] font-bold">Mit bestehender Liste</div>
              <div className="flex flex-col gap-1.5">
                {(
                  [
                    ['merge', 'Zusammenführen', 'Gleiche Namen werden addiert, neue ergänzt'],
                    ['append', 'Anhängen', 'Importierte Artikel hinten anfügen'],
                    ['replace', 'Ersetzen', 'Offene Artikel ersetzen (Erledigte bleiben)'],
                  ] as const
                ).map(([value, label, hint]) => (
                  <button
                    key={value}
                    type="button"
                    className="tap-scale rounded-xl px-3.5 py-2.5 text-left"
                    style={{
                      background: importMode === value ? 'var(--accent-soft)' : 'var(--chip-bg)',
                      outline: importMode === value ? '2px solid var(--accent)' : 'none',
                    }}
                    onClick={() => setImportMode(value)}
                  >
                    <div className="text-[14px] font-bold">{label}</div>
                    <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-2 min-h-[16px] text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
            {importError}
          </div>
          <button className="btn-primary mt-3 w-full py-3.5 text-[15px]" onClick={handleImport}>
            Importieren
          </button>
        </div>
      )}
    </Sheet>
  )
}
