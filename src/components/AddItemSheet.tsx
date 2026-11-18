import { useMemo, useState } from 'react'
import { Sheet } from './Sheet'
import { SearchField } from './SearchField'
import { ListImportPanel } from './ListImportPanel'
import { Icon } from './Icon'
import { ProductForm, type ProductFormValues } from './ProductForm'
import { BrandSelect } from './BrandSelect'
import { ICON_PATHS } from '@/constants/icons'
import { DEFAULT_UNIT, defaultListAmount, getDefaultUnit } from '@/constants/units'
import { getIconKey } from '@/utils/icon'
import { ProductIconSlot } from '@/components/ProductIconSlot'
import { getCategoryColor } from '@/utils/categoryColor'
import { searchProducts } from '@/utils/search'
import { buildLastPurchaseIndex, lastPurchasedHintForName } from '@/utils/purchaseFrequency'
import { adjustAmount, parseAmount, joinAmount } from '@/utils/amount'
import { useStore } from '@/store/useStore'
import { CATEGORIES, PRODUCTS } from '@/data/products'
import { buildQuickPicks } from '@/utils/quickAdd'
import { normalize } from '@/utils/text'
import { parseRecipeText } from '@/utils/recipe'
import { RecipeReviewSheet, type RecipeReviewItem } from '@/components/RecipeReviewSheet'
import { uid } from '@/utils/id'
import type { ImportMode } from '@/types'

interface AddItemSheetProps {
  onClose: () => void
  onImported: (message: string) => void
  /** Öffnet den Kassenbon-Import (separates Sheet). */
  onOpenReceiptImport?: () => void
}

const STARTER_PICKS = [
  'Milch',
  'Brot',
  'Eier',
  'Butter',
  'Bananen',
  'Tomaten',
  'Käse',
  'Kaffee',
  'Joghurt',
  'Äpfel',
]

type Mode = 'search' | 'form' | 'import' | 'recipe'
type FormMode = 'new' | 'confirm-builtin' | 'confirm-custom' | 'variant'

const EMPTY_FORM: ProductFormValues = {
  name: '',
  category: CATEGORIES[0],
  amountValue: '',
  unit: DEFAULT_UNIT,
  note: '',
}

export function AddItemSheet({ onClose, onImported, onOpenReceiptImport }: AddItemSheetProps) {
  const customProducts = useStore((s) => s.customProducts)
  const catalog = useStore((s) => s.catalog)
  const addItemToActiveList = useStore((s) => s.addItemToActiveList)
  const addCustomProduct = useStore((s) => s.addCustomProduct)
  const updateCustomProduct = useStore((s) => s.updateCustomProduct)
  const importRecipeItemsToActiveList = useStore((s) => s.importRecipeItemsToActiveList)
  const ensureBrandVariant = useStore((s) => s.ensureBrandVariant)
  const ensureItemVariant = useStore((s) => s.ensureItemVariant)
  const ensureBrand = useStore((s) => s.ensureBrand)
  const brands = useStore((s) => s.brands)
  const completedTrips = useStore((s) => s.completedTrips)
  const activeList = useStore((s) => s.activeList())
  const lists = useStore((s) => s.lists)

  const [mode, setMode] = useState<Mode>('search')
  const [query, setQuery] = useState('')
  const [searchAmount, setSearchAmount] = useState('')
  const [variantName, setVariantName] = useState('')
  const [addedCount, setAddedCount] = useState(0)

  const [formMode, setFormMode] = useState<FormMode>('new')
  const [editingCustomId, setEditingCustomId] = useState<string | null>(null)
  const [form, setForm] = useState<ProductFormValues>(EMPTY_FORM)
  const [selectedBrandId, setSelectedBrandId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>()

  const [recipeText, setRecipeText] = useState('')
  const [recipeError, setRecipeError] = useState('')
  const [recipeMode, setRecipeMode] = useState<ImportMode>('append')
  const [recipeReviewOpen, setRecipeReviewOpen] = useState(false)
  const [recipeReviewItems, setRecipeReviewItems] = useState<RecipeReviewItem[]>([])

  const openCount = activeList?.items.filter((i) => !i.done).length ?? 0

  const results = useMemo(
    () => searchProducts(query, customProducts, 12, catalog),
    [query, customProducts, catalog]
  )
  const exact = results.find((result) => normalize(result.name) === normalize(query))
  // Leeres Suchfeld: Favoriten/zuletzt genutzte Artikel als Ein-Tipp-Auswahl,
  // für neue Nutzer ergänzt um typische Grundartikel.
  const quickPicks = useMemo(() => {
    if (!activeList) return []
    const picks = buildQuickPicks(activeList, lists, customProducts, 10)
    const onList = new Set(activeList.items.filter((i) => !i.done).map((i) => normalize(i.name)))
    const seen = new Set(picks.map((p) => normalize(p.name)))
    for (const name of STARTER_PICKS) {
      if (picks.length >= 10) break
      const product = PRODUCTS.find((p) => p.name === name)
      if (!product || onList.has(normalize(name)) || seen.has(normalize(name))) continue
      picks.push({ key: `starter-${name}`, name, category: product.category, amount: '', kind: 'recent' })
    }
    return picks
  }, [activeList, lists, customProducts])
  const lastPurchaseIndex = useMemo(() => buildLastPurchaseIndex(completedTrips), [completedTrips])

  function openConfirmFor(result: (typeof results)[number]) {
    const parsed = parseAmount((result === results[0] ? searchAmount : '') || result.amount)
    setForm({
      name: result.name,
      category: result.category,
      amountValue: parsed ? String(parsed.value) : '',
      unit: parsed?.unit || getDefaultUnit(getIconKey(result.name, result.category)),
      note: result.note || '',
    })
    setFormMode(result.isCustom ? 'confirm-custom' : 'confirm-builtin')
    setEditingCustomId(result.customId ?? null)
    setSelectedBrandId('')
    setSelectedProductId(result.productId)
    setMode('form')
  }

  function openCreateForm() {
    const category = EMPTY_FORM.category
    setForm({ ...EMPTY_FORM, name: query, unit: getDefaultUnit(getIconKey(query, category)) })
    setFormMode('new')
    setEditingCustomId(null)
    setSelectedBrandId('')
    setSelectedProductId(undefined)
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

    if (formMode === 'variant' && !variantName.trim()) return
    const variantId =
      formMode === 'variant'
        ? ensureItemVariant(form.name, form.category, variantName, selectedBrandId || undefined)
        : selectedBrandId
          ? ensureBrandVariant(form.name, form.category, selectedBrandId)
          : undefined
    const selectedProduct = catalog.find((product) => product.id === selectedProductId)
    const productId =
      !selectedBrandId && selectedProduct?.name === form.name.trim() ? selectedProduct.id : undefined
    addItemToActiveList({
      name: form.name,
      amount,
      category: form.category,
      note: form.note,
      variantId,
      productId,
    })
    setAddedCount((c) => c + 1)
    setQuery('')
    setForm(EMPTY_FORM)
    setSelectedBrandId('')
    setSelectedProductId(undefined)
    setMode('search')
  }

  function handleRecipeAnalyze() {
    setRecipeError('')
    const parsed = parseRecipeText(recipeText.trim(), customProducts)
    if (!parsed.length) {
      setRecipeError('Keine Zutaten im Text erkannt.')
      return
    }
    setRecipeReviewItems(
      parsed.map((item) => ({
        id: uid(),
        name: item.name,
        amount: item.amount ?? '',
        category: item.category ?? 'Sonstiges',
      }))
    )
    setRecipeReviewOpen(true)
  }

  function handleRecipeReviewConfirm(items: { name: string; amount?: string; category?: string }[]) {
    const result = importRecipeItemsToActiveList(items, recipeMode)
    if (!result.ok) {
      setRecipeError(result.error || 'Rezept konnte nicht importiert werden.')
      setRecipeReviewOpen(false)
      return
    }
    setRecipeReviewOpen(false)
    onClose()
    onImported(`${result.addedCount ?? result.keptCount ?? items.length} Zutaten hinzugefügt`)
  }

  return (
    <Sheet onClose={onClose} tall>
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
              background:
                mode === m || (m === 'search' && mode === 'form') ? 'var(--surface)' : 'transparent',
              color: 'var(--text)',
            }}
            onClick={() => {
              ;(document.activeElement as HTMLElement | null)?.blur()
              setMode(m)
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {onOpenReceiptImport && mode === 'search' && (
        <button
          type="button"
          className="btn-soft tap-scale mb-3 flex w-full items-center justify-center gap-2 py-2.5 text-[13px] font-bold"
          onClick={() => {
            onClose()
            onOpenReceiptImport()
          }}
        >
          <Icon path={ICON_PATHS.import} size={16} />
          Kassenbon (Foto / PDF)
        </button>
      )}

      {mode === 'search' && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="shrink-0">
            <h2 className="mb-3 text-lg font-bold">Artikel hinzufügen</h2>
            <SearchField
              value={query}
              onChange={(value) => {
                setQuery(value)
                setSearchAmount('')
              }}
              label="Artikelsuche"
              placeholder="z.B. Tomaten"
              autoFocus
            />
          </div>
          <div className="mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {!query.trim() && quickPicks.length > 0 && (
              <div className="mt-2">
                <div
                  className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Schnellwahl
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickPicks.map((pick) => (
                    <button
                      key={pick.key}
                      type="button"
                      className="tap-scale flex min-h-11 items-center gap-2 rounded-full px-3.5 text-[14px] font-semibold"
                      style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
                      onClick={() => {
                        addItemToActiveList({
                          name: pick.name,
                          category: pick.category,
                          amount:
                            pick.amount ||
                            defaultListAmount(getIconKey(pick.name, pick.category), pick.category, pick.name),
                          note: pick.note,
                        })
                        onImported(`„${pick.name}“ hinzugefügt`)
                      }}
                    >
                      <span
                        className="category-dot"
                        style={{ background: getCategoryColor(pick.category).fg }}
                      />
                      {pick.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {results.map((r, index) => {
              const iconKey = getIconKey(r.name, r.category)
              const color = getCategoryColor(r.category)
              const frequencyHint = lastPurchasedHintForName(r.name, lastPurchaseIndex)
              return (
                <div
                  key={r.productId || r.customId || r.name}
                  className={
                    index === 0 ? 'best-match mb-3 flex flex-wrap items-center' : 'flex items-center border-b'
                  }
                  style={{ borderColor: index === 0 ? color.fg : 'var(--border)' }}
                >
                  {index === 0 && <h3 className="eyebrow w-full px-3 pt-3">Bester Treffer</h3>}
                  <button
                    className="tap-scale flex min-w-0 flex-1 items-center gap-3 border-b px-1 py-3 text-left"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => {
                      addItemToActiveList({
                        name: r.name,
                        category: r.category,
                        amount:
                          (index === 0 ? searchAmount : '') ||
                          r.amount ||
                          defaultListAmount(getIconKey(r.name, r.category), r.category, r.name),
                        note: r.note,
                        productId: r.productId,
                      })
                      onClose()
                      onImported(`„${r.name}“ hinzugefügt`)
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      openConfirmFor(r)
                    }}
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
                        {r.productId
                          ? [r.brand, r.amount, 'Bonpreis / Produktkatalog'].filter(Boolean).join(' · ')
                          : r.category}
                      </span>
                    </span>
                    <Icon path={ICON_PATHS.plus} size={18} />
                  </button>
                  <button
                    className="h-11 w-11 shrink-0"
                    aria-label={`${r.name}: Menge und Details`}
                    onClick={() => openConfirmFor(r)}
                  >
                    <Icon path={ICON_PATHS.edit} size={18} />
                  </button>
                  {index === 0 && (
                    <div className="flex w-full items-center justify-between gap-2 px-3 pb-3">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Menge
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          className="btn-soft h-11 w-11"
                          aria-label="Suchmenge verringern"
                          onClick={() =>
                            setSearchAmount(
                              adjustAmount(
                                searchAmount || r.amount || defaultListAmount(iconKey, r.category, r.name),
                                -1
                              )
                            )
                          }
                        >
                          −
                        </button>
                        <span className="min-w-12 text-center text-sm font-semibold">
                          {searchAmount || r.amount || defaultListAmount(iconKey, r.category, r.name)}
                        </span>
                        <button
                          className="btn-soft h-11 w-11"
                          aria-label="Suchmenge erhöhen"
                          onClick={() =>
                            setSearchAmount(
                              adjustAmount(
                                searchAmount || r.amount || defaultListAmount(iconKey, r.category, r.name),
                                1
                              )
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
            {exact && (
              <button
                className="min-h-12 w-full px-1 py-2 text-left text-sm font-semibold"
                style={{ color: 'var(--accent)' }}
                onClick={() => {
                  openConfirmFor(exact)
                  setSelectedProductId(undefined)
                  setVariantName('')
                  setFormMode('variant')
                }}
              >
                Eigene Variante von „{exact.name}“ anlegen
                <small className="mt-1 block" style={{ color: 'var(--text-muted)' }}>
                  Andere Marke oder Größe · das Original bleibt erhalten.
                </small>
              </button>
            )}
            {query.trim() && !exact && (
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
          <h2 className="mb-3 text-lg font-bold">
            {formMode === 'new'
              ? 'Neues Produkt'
              : formMode === 'variant'
                ? `Variante von „${form.name}“`
                : 'Zur Liste hinzufügen'}
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {formMode === 'variant' ? (
              <label className="block text-sm font-semibold">
                Name der Variante
                <input
                  className="input mt-2"
                  autoFocus
                  value={variantName}
                  onChange={(event) => setVariantName(event.target.value)}
                  placeholder="z. B. Bio · 500 g"
                />
              </label>
            ) : (
              <ProductForm
                values={form}
                onChange={(patch) => setForm((f) => ({ ...f, ...patch }))}
                autoFocusName={formMode === 'new'}
              />
            )}
            <div className="mt-3">
              <BrandSelect
                brands={brands}
                value={selectedBrandId}
                onChange={setSelectedBrandId}
                onCreateBrand={ensureBrand}
              />
            </div>
          </div>
          <div className="mt-4 flex shrink-0 gap-2.5">
            <button className="btn-soft flex-1 py-3.5 text-[15px]" onClick={() => setMode('search')}>
              Zurück
            </button>
            <button className="btn-primary flex-1 py-3.5 text-[15px]" onClick={handleFormSubmit}>
              {formMode === 'new'
                ? 'Anlegen & hinzufügen'
                : formMode === 'variant'
                  ? 'Variante hinzufügen'
                  : 'Hinzufügen'}
            </button>
          </div>
        </div>
      )}

      {mode === 'import' && (
        <ListImportPanel onClose={onClose} onImported={onImported} onReceipt={onOpenReceiptImport} />
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
            onClick={handleRecipeAnalyze}
            disabled={!recipeText.trim()}
          >
            Rezept analysieren
          </button>
        </div>
      )}

      {recipeReviewOpen && (
        <RecipeReviewSheet
          originalText={recipeText.trim()}
          initialItems={recipeReviewItems}
          onClose={() => setRecipeReviewOpen(false)}
          onConfirm={handleRecipeReviewConfirm}
        />
      )}
    </Sheet>
  )
}
