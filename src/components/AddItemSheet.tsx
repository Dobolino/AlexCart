import { useMemo, useState } from 'react'
import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ProductForm, type ProductFormValues } from './ProductForm'
import { ICON_PATHS } from '@/constants/icons'
import { DEFAULT_UNIT, getDefaultUnit } from '@/constants/units'
import { getIconKey } from '@/utils/icon'
import { ProductIconSlot } from '@/components/ProductIconSlot'
import { getCategoryColor } from '@/utils/categoryColor'
import { searchProducts } from '@/utils/search'
import { parseAmount, joinAmount } from '@/utils/amount'
import { useStore } from '@/store/useStore'
import { CATEGORIES } from '@/data/products'
import { parseRecipeText } from '@/utils/recipe'
import type { ImportMode } from '@/types'

interface AddItemSheetProps {
  onClose: () => void
  onImported: (message: string) => void
}

type Mode = 'search' | 'form' | 'import' | 'recipe'
type FormMode = 'new' | 'confirm-builtin' | 'confirm-custom'

const EMPTY_FORM: ProductFormValues = { name: '', category: CATEGORIES[0], amountValue: '', unit: DEFAULT_UNIT, note: '' }

export function AddItemSheet({ onClose, onImported }: AddItemSheetProps) {
  const customProducts = useStore((s) => s.customProducts)
  const addItemToActiveList = useStore((s) => s.addItemToActiveList)
  const addCustomProduct = useStore((s) => s.addCustomProduct)
  const updateCustomProduct = useStore((s) => s.updateCustomProduct)
  const importIntoActiveList = useStore((s) => s.importIntoActiveList)
  const repeatLastWeekToActiveList = useStore((s) => s.repeatLastWeekToActiveList)
  const importRecipeToActiveList = useStore((s) => s.importRecipeToActiveList)
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
  const [recipeText, setRecipeText] = useState('')
  const [recipeError, setRecipeError] = useState('')
  const [recipeMode, setRecipeMode] = useState<ImportMode>('append')
  const recipePreview = useMemo(
    () => (recipeText.trim() ? parseRecipeText(recipeText, customProducts) : []),
    [recipeText, customProducts]
  )

  const openCount = activeList?.items.filter((i) => !i.done).length ?? 0

  const results = searchProducts(query, customProducts)

  function openConfirmFor(result: (typeof results)[number]) {
    const parsed = parseAmount(result.amount)
    setForm({
      name: result.name,
      category: result.category,
      amountValue: parsed ? String(parsed.value) : '',
      unit: parsed?.unit || getDefaultUnit(getIconKey(result.name, result.category)),
      note: result.note || '',
    })
    setFormMode(result.isCustom ? 'confirm-custom' : 'confirm-builtin')
    setEditingCustomId(result.customId ?? null)
    setMode('form')
  }

  function openCreateForm() {
    const category = EMPTY_FORM.category
    setForm({ ...EMPTY_FORM, name: query, unit: getDefaultUnit(getIconKey(query, category)) })
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

  function handleRepeatLastWeek() {
    setImportError('')
    const result = repeatLastWeekToActiveList()
    if (!result.ok) {
      setImportError(result.error || 'Konnte letzte Woche nicht übernehmen.')
      return
    }
    onClose()
    onImported(`${result.addedCount} Artikel von letzter Woche hinzugefügt`)
  }

  function handleRecipeImport() {
    setRecipeError('')
    const result = importRecipeToActiveList(recipeText.trim(), recipeMode)
    if (!result.ok) {
      setRecipeError(result.error || 'Rezept konnte nicht importiert werden.')
      return
    }
    onClose()
    onImported(`${result.addedCount ?? result.keptCount ?? 0} Zutaten hinzugefügt`)
  }

  return (
    <Sheet onClose={onClose}>
      <div className="mb-4 flex gap-1 rounded-2xl p-1" style={{ background: 'var(--chip-bg)' }}>
        {(
          [
            ['search', 'Hinzufügen'],
            ['import', 'Import'],
            ['recipe', 'Rezept'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            className="flex-1 rounded-xl py-2 text-[12px] font-bold tap-scale"
            style={{
              background: mode === m || (m === 'search' && mode === 'form') ? 'var(--surface)' : 'transparent',
              color: 'var(--text)',
            }}
            onClick={() => setMode(m)}
          >
            {label}
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
            JSON aus Claude oder ChatGPT hier einfügen – oder Artikel der letzten Woche übernehmen.
          </p>
          <button
            className="btn-soft tap-scale mb-3 flex w-full items-center justify-center gap-2 py-3 text-[14px] font-bold"
            onClick={handleRepeatLastWeek}
          >
            <Icon path={ICON_PATHS.copy} size={16} />
            Letzte Woche wiederholen
          </button>
          <details className="mb-3 rounded-xl px-3.5 py-3 text-[12px]" style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}>
            <summary className="cursor-pointer font-bold" style={{ color: 'var(--text)' }}>
              Claude-Prompt für den Import
            </summary>
            <p className="mt-2 leading-relaxed">
              Erstelle eine Einkaufsliste als JSON mit diesem Format: week (ISO-Datum), items mit name, amount und
              category. Kategorien: Früchte & Gemüse, Milch & Käse, Fleisch & Fisch, Getreide & Beilagen, Brot &
              Backwaren, Tiefkühl, Getränke, Konserven & Saucen, Gewürze, Öl & Backen, Sonstiges, Asiatisch &
              Indisch, Protein & Health, Süßes & Snacks, Haushalt & Reinigung, Drogerie & Kosmetik, Tierbedarf. Nur
              JSON ausgeben, ohne Erklärung.
            </p>
          </details>
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

      {mode === 'recipe' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <h2 className="mb-1 text-lg font-bold">Rezept importieren</h2>
          <p className="mb-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Zutatenliste aus Rezept, Screenshot-Text oder Chat hier einfügen.
          </p>
          <textarea
            className="input min-h-[180px] text-[14px]"
            placeholder={`Zutaten\n- 500 g Mehl\n- 2 Stück Eier\n- 1 l Milch\n- Salz`}
            value={recipeText}
            onChange={(e) => {
              setRecipeText(e.target.value)
              setRecipeError('')
            }}
          />
          {recipePreview.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 text-[13px] font-bold">
                Vorschau ({recipePreview.length} Zutaten)
              </div>
              <div className="card-surface max-h-40 overflow-y-auto">
                {recipePreview.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between gap-2 border-b px-3.5 py-2.5 text-[13px] last:border-b-0"
                    style={{ borderColor: 'var(--border)' }}
                  >
                    <span className="min-w-0 truncate font-semibold">{item.name}</span>
                    <span className="flex-none text-[12px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                      {item.amount || '–'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {openCount > 0 && (
            <div className="mt-3">
              <div className="mb-2 text-[13px] font-bold">Mit bestehender Liste</div>
              <div className="flex gap-2">
                {(
                  [
                    ['append', 'Anhängen'],
                    ['merge', 'Zusammenführen'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    className="tap-scale flex-1 rounded-xl px-3 py-2.5 text-[13px] font-bold"
                    style={{
                      background: recipeMode === value ? 'var(--accent-soft)' : 'var(--chip-bg)',
                      outline: recipeMode === value ? '2px solid var(--accent)' : 'none',
                    }}
                    onClick={() => setRecipeMode(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-2 min-h-[16px] text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
            {recipeError}
          </div>
          <button
            className="btn-primary mt-3 w-full py-3.5 text-[15px]"
            onClick={handleRecipeImport}
            disabled={!recipePreview.length}
          >
            {recipePreview.length
              ? `${recipePreview.length} Zutaten zur Liste hinzufügen`
              : 'Zutaten zur Liste hinzufügen'}
          </button>
        </div>
      )}
    </Sheet>
  )
}
