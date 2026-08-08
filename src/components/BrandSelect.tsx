import { useMemo, useState } from 'react'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { normalize } from '@/utils/text'
import type { GlobalBrand } from '@/types'

interface BrandSelectProps {
  brands: GlobalBrand[]
  value: string
  onChange: (brandId: string) => void
  /** Legt eine neue Marke an und gibt ihre ID zurück (z. B. store.ensureBrand). */
  onCreateBrand: (name: string) => string
  label?: string
}

/** Marken-Wähler mit Suchfeld und Inline-Anlegen. Neu angelegte Marken sind sofort auswählbar
 *  und stehen danach überall zur Verfügung. Single-Select – erneutes Tippen hebt die Wahl auf. */
export function BrandSelect({ brands, value, onChange, onCreateBrand, label = 'Marke (optional)' }: BrandSelectProps) {
  const [query, setQuery] = useState('')
  const q = query.trim()

  const filtered = useMemo(() => {
    if (!q) return brands
    const nq = normalize(q)
    return brands.filter((b) => normalize(b.name).includes(nq))
  }, [brands, q])

  const exactExists = useMemo(
    () => brands.some((b) => normalize(b.name) === normalize(q)),
    [brands, q]
  )

  function handleCreate() {
    if (!q || exactExists) return
    const id = onCreateBrand(q)
    if (id) onChange(id)
    setQuery('')
  }

  return (
    <div>
      <div className="mb-1.5 px-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
        {label}
      </div>

      <div className="relative mb-2">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
          <Icon path={ICON_PATHS.search} size={15} />
        </span>
        <input
          type="text"
          className="input w-full py-2 pl-9 text-[14px]"
          placeholder="Marke suchen oder neu eingeben"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleCreate()
            }
          }}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {q && !exactExists && (
          <button
            type="button"
            className="tap-scale flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold"
            style={{ background: 'var(--accent-soft)', color: 'var(--accent)', outline: '1px dashed var(--accent)' }}
            onClick={handleCreate}
          >
            <Icon path={ICON_PATHS.plus} size={13} />„{q}" anlegen
          </button>
        )}
        {filtered.map((brand) => {
          const active = brand.id === value
          return (
            <button
              key={brand.id}
              type="button"
              className="tap-scale rounded-full px-3 py-1.5 text-[12px] font-bold"
              style={{
                background: active ? 'var(--accent-soft)' : 'var(--chip-bg)',
                color: active ? 'var(--accent)' : 'var(--text)',
                outline: active ? '2px solid var(--accent)' : 'none',
              }}
              onClick={() => onChange(active ? '' : brand.id)}
              aria-pressed={active}
            >
              {brand.name}
            </button>
          )
        })}
        {!filtered.length && !q && (
          <span className="px-0.5 py-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Noch keine Marken – oben eintippen zum Anlegen.
          </span>
        )}
      </div>
    </div>
  )
}
