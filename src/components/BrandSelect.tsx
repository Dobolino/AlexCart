import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { Sheet } from './Sheet'
import { SearchField } from './SearchField'
import { MarketSelector } from './MarketSelector'
import { ICON_PATHS } from '@/constants/icons'
import { useStore } from '@/store/useStore'
import { useVisualViewportInset } from '@/hooks/useVisualViewportInset'
import {
  BRAND_CATALOG,
  brandSearchKey,
  BRAND_SECTORS,
  BRAND_CATALOG_NOTE,
  RETAILERS,
  catalogBrand,
  retailSelection,
  type RetailSelection,
  type BrandSector,
} from '@/data/retailCatalog'
import type { GlobalBrand } from '@/types'

const catalogOrder = new Map(BRAND_CATALOG.map((brand, index) => [brand.name, index]))

interface BrandSelectProps {
  brands: GlobalBrand[]
  value: string
  onChange: (brandId: string) => void
  onCreateBrand: (name: string) => string
  label?: string
  context?: RetailSelection
  onContextChange?: (value: RetailSelection) => void
  lockCountry?: boolean
  manage?: boolean
}
export function BrandSelect({
  brands,
  value,
  onChange,
  onCreateBrand,
  label = 'Marke (optional)',
  context,
  onContextChange,
  lockCountry,
  manage = false,
}: BrandSelectProps) {
  const settings = useStore((s) => s.settings)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState<BrandSector>('Alle Bereiche')
  const [limit, setLimit] = useState(6)
  const [showHidden, setShowHidden] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const { height } = useVisualViewportInset()
  const compact = height < 620
  const showFilters = !compact || filtersOpen
  const choice = context ?? retailSelection(settings)
  const retailer = RETAILERS.find((r) => r.id === choice.retailerId)
  const selected = brands.find((b) => b.id === value)
  const favorites = settings.favoriteBrandNames ?? []
  const hidden = settings.hiddenBrandNames ?? []
  const entries = useMemo(() => {
    const all = new Map(BRAND_CATALOG.map((brand) => [brandSearchKey(brand.name), brand]))
    for (const brand of brands)
      if (!all.has(brandSearchKey(brand.name)))
        all.set(brandSearchKey(brand.name), { name: brand.name, retailerIds: [], sector: 'Alle Bereiche' })
    return [...all.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
  }, [brands])
  const matches = entries.filter(
    (b) =>
      (showHidden || !hidden.includes(b.name)) &&
      brandSearchKey(b.name).includes(brandSearchKey(query)) &&
      (sector === 'Alle Bereiche' || b.sector === 'Alle Bereiche' || b.sector === sector)
  )
  const privateBrands = matches
    .filter((b) => b.retailerIds.includes(choice.retailerId))
    .sort((a, b) => (catalogOrder.get(a.name) ?? Infinity) - (catalogOrder.get(b.name) ?? Infinity))
  const manufacturerBrands = matches.filter((b) => !b.retailerIds.length)
  function changeContext(next: RetailSelection) {
    const selectedMeta = selected && catalogBrand(selected.name)
    if (selectedMeta?.retailerIds.length && !selectedMeta.retailerIds.includes(next.retailerId)) onChange('')
    if (onContextChange) onContextChange(next)
    else useStore.getState().setRetailSelection(next)
    setLimit(6)
  }
  function preference(name: string, key: 'favoriteBrandNames' | 'hiddenBrandNames') {
    useStore.setState((state) => {
      const values = state.settings[key] ?? []
      return {
        settings: {
          ...state.settings,
          [key]: values.includes(name) ? values.filter((n) => n !== name) : [...values, name],
        },
      }
    })
  }
  function choose(name: string) {
    const existing = brands.find((b) => brandSearchKey(b.name) === brandSearchKey(name))
    const id = existing?.id ?? onCreateBrand(name)
    onChange(value === id ? '' : id)
    if (!manage) setOpen(false)
  }
  function group(title: string, items: typeof entries, hint?: string) {
    if (compact && !items.length) return null
    return (
      <section className="mb-4" aria-label={title}>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-[14px] font-bold">{title}</h3>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {items.length}
          </span>
        </div>
        {hint && !compact && (
          <p className="mb-2 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </p>
        )}
        <div className={manage ? 'flex flex-col gap-2' : 'grid grid-cols-2 gap-2'}>
          {items.slice(0, limit).map((b) => (
            <div
              key={b.name}
              className="flex min-w-0 items-center rounded-xl border"
              style={{
                borderColor: value && selected?.name === b.name ? 'var(--accent)' : 'var(--border)',
                background: 'var(--chip-bg)',
              }}
            >
              <button
                type="button"
                className="min-h-11 min-w-0 flex-1 break-words px-3 py-2 text-left text-[13px] font-semibold"
                aria-pressed={manage ? favorites.includes(b.name) : selected?.name === b.name}
                aria-label={manage ? `Favorit ${b.name}` : undefined}
                onClick={() => (manage ? preference(b.name, 'favoriteBrandNames') : choose(b.name))}
              >
                {favorites.includes(b.name) ? '★ ' : ''}
                {b.name}
              </button>
              {manage && (
                <button
                  className="h-11 w-11 shrink-0"
                  aria-label={`${b.name} ${favorites.includes(b.name) ? 'nicht mehr merken' : 'merken'}`}
                  onClick={() => preference(b.name, 'favoriteBrandNames')}
                  style={{ color: favorites.includes(b.name) ? 'var(--accent)' : 'var(--text-muted)' }}
                >
                  ★
                </button>
              )}
              {manage && (
                <button
                  className="h-11 w-11 shrink-0"
                  aria-label={`${b.name} ${hidden.includes(b.name) ? 'einblenden' : 'ausblenden'}`}
                  onClick={() => preference(b.name, 'hiddenBrandNames')}
                >
                  {hidden.includes(b.name) ? '+' : '−'}
                </button>
              )}
            </div>
          ))}
        </div>
        {!items.length && (
          <p className="py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            Keine passenden Marken.
          </p>
        )}
      </section>
    )
  }
  return (
    <div>
      <span className="mb-1.5 block text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <button
        type="button"
        className="brand-select-summary flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 text-left"
        style={{ borderColor: 'var(--border)', background: 'var(--chip-bg)' }}
        onClick={() => {
          setQuery('')
          setLimit(6)
          setOpen(true)
        }}
        aria-label={manage ? 'Markenkatalog verwalten' : 'Marke auswählen'}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">
            {manage ? `Markenkatalog · ${entries.length} Marken` : (selected?.name ?? 'Marke auswählen')}
          </span>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            {retailer?.name} · Eigenmarken & allgemeine Marken
          </span>
        </span>
        <Icon path={ICON_PATHS.chevron} size={17} />
      </button>
      {open && (
        <Sheet onClose={() => setOpen(false)} tall>
          <h2 className="mb-3 shrink-0 text-xl font-bold">
            {manage ? 'Marken verwalten' : 'Marke auswählen'}
          </h2>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
            {compact && (
              <button
                className="btn-soft mb-2 min-h-11 w-full px-3 text-left text-xs font-semibold"
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((value) => !value)}
              >
                {choice.country === 'CH' ? 'Schweiz' : 'Deutschland'} · {retailer?.name} · {sector}{' '}
                {filtersOpen ? '▴' : '▾'}
              </button>
            )}
            {showFilters && (
              <MarketSelector value={choice} onChange={changeContext} lockCountry={lockCountry} />
            )}
            <SearchField
              className="my-3 shrink-0"
              value={query}
              onChange={(q) => {
                setQuery(q)
                setLimit(6)
              }}
              label="Markensuche"
              placeholder="Marken suchen oder ergänzen"
              onFocus={() => {
                if (compact) setFiltersOpen(false)
              }}
            />
            {showFilters && (
              <label className="mb-3 block text-xs font-semibold">
                Bereich
                <select
                  className="input mt-1 w-full"
                  aria-label="Markenbereich"
                  value={sector}
                  onChange={(e) => {
                    setSector(e.target.value as BrandSector)
                    setLimit(6)
                  }}
                >
                  {BRAND_SECTORS.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </label>
            )}
            {!!favorites.length &&
              group(
                'Deine Favoriten',
                matches.filter(
                  (b) =>
                    favorites.includes(b.name) &&
                    (!b.retailerIds.length || b.retailerIds.includes(choice.retailerId))
                )
              )}
            {group(`Eigenmarken · ${retailer?.name ?? 'Supermarkt'}`, privateBrands)}
            {group(
              'Allgemeine Marken · beide Länder',
              manufacturerBrands,
              'Herstellermarken bleiben unabhängig von Land und Supermarkt verfügbar. Die tatsächliche Verfügbarkeit kann je Geschäft abweichen.'
            )}
            {compact && !privateBrands.length && !manufacturerBrands.length && (
              <p className="my-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                Keine passenden Marken.
              </p>
            )}
            {Math.max(privateBrands.length, manufacturerBrands.length) > limit && (
              <button className="btn-soft mb-3 min-h-11 w-full" onClick={() => setLimit((v) => v + 40)}>
                Weitere Marken anzeigen
              </button>
            )}
            {query.trim() && !entries.some((b) => brandSearchKey(b.name) === brandSearchKey(query)) && (
              <button className="btn-primary mb-3 min-h-12 w-full px-3" onClick={() => choose(query.trim())}>
                „{query.trim()}“ als eigene Marke anlegen
              </button>
            )}
            {manage && (
              <label className="my-3 flex min-h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showHidden}
                  onChange={(e) => setShowHidden(e.target.checked)}
                />
                Ausgeblendete Marken anzeigen
              </label>
            )}
            <p className="mb-3 text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {BRAND_CATALOG_NOTE}
            </p>
          </div>
          <button className="btn-soft mt-2 min-h-11 shrink-0" onClick={() => setOpen(false)}>
            Fertig
          </button>
        </Sheet>
      )}
    </div>
  )
}
