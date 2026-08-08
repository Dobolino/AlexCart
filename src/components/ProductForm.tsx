import { CATEGORIES } from '@/data/products'
import { UNITS } from '@/constants/units'
import { offersCanSize, CAN_SIZE_UNITS } from '@/utils/variantPresets'

export interface ProductFormValues {
  name: string
  category: string
  amountValue: string
  unit: string
  note: string
}

interface ProductFormProps {
  values: ProductFormValues
  onChange: (patch: Partial<ProductFormValues>) => void
  autoFocusName?: boolean
}

/** Gemeinsame Formularfelder für "Produkt anlegen", "Produkt bearbeiten" und
 *  "vorhandenes Produkt zur Liste hinzufügen" – Name, Kategorie, Menge + Einheit, Notiz. */
export function ProductForm({ values, onChange, autoFocusName }: ProductFormProps) {
  return (
    <div className="flex flex-col gap-2.5">
      <input
        autoFocus={autoFocusName}
        type="text"
        className="input"
        placeholder="Name"
        value={values.name}
        onChange={(e) => onChange({ name: e.target.value })}
      />
      <select className="input" value={values.category} onChange={(e) => onChange({ category: e.target.value })}>
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      {offersCanSize(values.name, values.category) ? (
        <div className="flex flex-col gap-1.5">
          <span className="px-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
            Dosengrösse
          </span>
          <div className="inline-flex self-start rounded-full p-0.5" style={{ background: 'var(--chip-bg)' }}>
            {([['klein', 'Klein'], ['gross', 'Gross']] as const).map(([key, label]) => {
              const unit = CAN_SIZE_UNITS[key]
              const active = values.unit === unit
              return (
                <button
                  key={key}
                  type="button"
                  className="tap-scale min-h-[38px] rounded-full px-5 text-[13px] font-bold"
                  style={{
                    background: active ? 'var(--accent)' : 'transparent',
                    color: active ? 'var(--accent-fg)' : 'var(--text-muted)',
                  }}
                  onClick={() => onChange({ unit, amountValue: values.amountValue.trim() || '1' })}
                  aria-pressed={active}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="flex gap-2.5">
          <input
            type="text"
            inputMode="decimal"
            className="input w-1/2"
            placeholder="Menge"
            value={values.amountValue}
            onChange={(e) => onChange({ amountValue: e.target.value })}
          />
          <select className="input w-1/2" value={values.unit} onChange={(e) => onChange({ unit: e.target.value })}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>
      )}
      <input
        type="text"
        className="input"
        placeholder="Notiz (optional)"
        value={values.note}
        onChange={(e) => onChange({ note: e.target.value })}
      />
    </div>
  )
}
