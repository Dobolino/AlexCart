import type { GlobalBrand } from '@/types'

interface BrandPickerProps {
  brands: GlobalBrand[]
  value: string
  onChange: (brandId: string) => void
  label?: string
}

/** Single-Select Marken-Chips – für "Marke direkt beim Anlegen/Bearbeiten eines
 *  Artikels wählen" (Hausmarken verhalten sich hier wie jede andere globale Marke). */
export function BrandPicker({ brands, value, onChange, label = 'Marke (optional)' }: BrandPickerProps) {
  if (!brands.length) return null

  return (
    <div>
      <div className="mb-1.5 px-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
        {label}
      </div>
      <div className="flex flex-wrap gap-2">
        {brands.map((brand) => {
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
      </div>
    </div>
  )
}
