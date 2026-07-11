import { useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { EmptyState } from '@/components/EmptyState'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { formatVariantLabel } from '@/utils/brands'
import { isProduceCategory } from '@/utils/producePrice'
import { formatMoney, parseMoneyInput } from '@/utils/currency'
import { HOUSE_BRAND_PRESETS } from '@/constants/houseBrands'
import { isBrandNameTaken } from '@/utils/houseBrands'
import type { Currency, GlobalBrand, ProductPriceProfile, ProductVariant } from '@/types'

export function PriceProfilesSettingsSection() {
  const brands = useStore((s) => s.brands)
  const priceProfiles = useStore((s) => s.priceProfiles)
  const currency = useStore((s) => s.settings.currency)
  const addBrand = useStore((s) => s.addBrand)
  const addHouseBrandPresets = useStore((s) => s.addHouseBrandPresets)
  const updateBrand = useStore((s) => s.updateBrand)
  const removeBrand = useStore((s) => s.removeBrand)
  const updatePriceProfileVariant = useStore((s) => s.updatePriceProfileVariant)

  const [newBrand, setNewBrand] = useState('')
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null)
  const [brandDraft, setBrandDraft] = useState('')
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null)

  const sortedProfiles = useMemo(
    () => [...priceProfiles].sort((a, b) => a.itemName.localeCompare(b.itemName, 'de')),
    [priceProfiles]
  )

  const missingHouseBrands = useMemo(
    () => HOUSE_BRAND_PRESETS.filter((name) => !isBrandNameTaken(brands, name)),
    [brands]
  )

  function submitNewBrand() {
    if (!newBrand.trim()) return
    addBrand(newBrand)
    setNewBrand('')
  }

  function saveBrandEdit(id: string) {
    if (!brandDraft.trim()) return
    updateBrand(id, brandDraft)
    setEditingBrandId(null)
    setBrandDraft('')
  }

  return (
    <div>
      <div
        className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
        style={{ color: 'var(--category-fg)' }}
      >
        Marken
      </div>
      <div className="card-surface mb-4.5 px-3.5 py-3.5">
        <p className="mb-3 text-[12px]" style={{ color: 'var(--text-muted)' }}>
          Marken gelten für alle Produkte – beim Abhaken, in Varianten und in der Kostenschätzung.
        </p>

        <div className="mb-3">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
            Hausmarken
          </div>
          <p className="mb-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Schnellauswahl für gängige Eigenmarken – z. B. M Classic, Prix Garantie, Gut &amp; Günstig.
          </p>
          <div className="flex flex-wrap gap-2">
            {HOUSE_BRAND_PRESETS.map((name) => {
              const active = isBrandNameTaken(brands, name)
              return (
                <button
                  key={name}
                  type="button"
                  className="tap-scale rounded-full px-3 py-1.5 text-[12px] font-bold"
                  style={{
                    background: active ? 'var(--accent-soft)' : 'var(--chip-bg)',
                    color: active ? 'var(--accent)' : 'var(--text)',
                    outline: active ? '2px solid var(--accent)' : 'none',
                  }}
                  onClick={() => {
                    if (!active) addBrand(name)
                  }}
                  aria-pressed={active}
                  disabled={active}
                >
                  {active ? `✓ ${name}` : `+ ${name}`}
                </button>
              )
            })}
          </div>
          {missingHouseBrands.length > 0 && (
            <button
              type="button"
              className="tap-scale mt-2 text-[12px] font-bold"
              style={{ color: 'var(--accent)' }}
              onClick={() => addHouseBrandPresets()}
            >
              Alle Hausmarken hinzufügen ({missingHouseBrands.length})
            </button>
          )}
        </div>

        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
          Eigene Marken
        </div>
        <div className="mb-3 flex gap-2">
          <input
            type="text"
            className="input flex-1 py-2 text-[14px]"
            placeholder="Neue Marke"
            value={newBrand}
            onChange={(e) => setNewBrand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitNewBrand()
            }}
          />
          <button type="button" className="btn-primary shrink-0 px-4 py-2 text-[13px]" onClick={submitNewBrand}>
            Hinzufügen
          </button>
        </div>
        {!brands.length ? (
          <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
            Noch keine Marken angelegt.
          </p>
        ) : (
          <div className="flex flex-col">
            {brands.map((brand) => (
              <BrandRow
                key={brand.id}
                brand={brand}
                editing={editingBrandId === brand.id}
                draft={brandDraft}
                onStartEdit={() => {
                  setEditingBrandId(brand.id)
                  setBrandDraft(brand.name)
                }}
                onDraftChange={setBrandDraft}
                onSave={() => saveBrandEdit(brand.id)}
                onCancel={() => setEditingBrandId(null)}
                onRemove={() => {
                  if (window.confirm(`Marke „${brand.name}" entfernen?`)) removeBrand(brand.id)
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
        style={{ color: 'var(--category-fg)' }}
      >
        Produkte & Preise
      </div>
      {!sortedProfiles.length ? (
        <div className="card-surface mb-4.5">
          <EmptyState
            icon={ICON_PATHS.chart}
            title="Noch keine Preisdaten"
            hint="Preise werden beim Abhaken erfasst – oder du legst sie hier manuell fest."
          />
        </div>
      ) : (
        <div className="card-surface mb-4.5">
          {sortedProfiles.map((profile) => (
            <ProfileBlock
              key={profile.id}
              profile={profile}
              brands={brands}
              currency={currency}
              expanded={expandedProfileId === profile.id}
              onToggle={() =>
                setExpandedProfileId((id) => (id === profile.id ? null : profile.id))
              }
              onUpdateVariant={updatePriceProfileVariant}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function BrandRow({
  brand,
  editing,
  draft,
  onStartEdit,
  onDraftChange,
  onSave,
  onCancel,
  onRemove,
}: {
  brand: GlobalBrand
  editing: boolean
  draft: string
  onStartEdit: () => void
  onDraftChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  onRemove: () => void
}) {
  return (
    <div
      className="flex items-center gap-2 border-b py-2.5 last:border-b-0"
      style={{ borderColor: 'var(--border)' }}
    >
      {editing ? (
        <>
          <input
            type="text"
            className="input min-w-0 flex-1 py-1.5 text-[14px]"
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSave()
              if (e.key === 'Escape') onCancel()
            }}
            onFocus={(e) => {
              // iOS öffnet die Tastatur, ohne das fokussierte Feld verlässlich neu ins
              // Bild zu scrollen (führt sonst zu einer scheinbar leeren Fläche über der
              // Tastatur) - kurz warten, bis die Tastatur-Animation begonnen hat.
              const target = e.currentTarget
              window.setTimeout(() => target.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300)
            }}
            autoFocus
          />
          <button type="button" className="tap-scale text-[12px] font-bold" style={{ color: 'var(--accent)' }} onClick={onSave}>
            OK
          </button>
        </>
      ) : (
        <>
          <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{brand.name}</span>
          <button type="button" className="tap-scale p-1.5" style={{ color: 'var(--text-muted)' }} onClick={onStartEdit} aria-label={`${brand.name} bearbeiten`}>
            <Icon path={ICON_PATHS.edit} size={16} />
          </button>
          <button type="button" className="tap-scale p-1.5" style={{ color: 'var(--danger)' }} onClick={onRemove} aria-label={`${brand.name} löschen`}>
            <Icon path={ICON_PATHS.trash} size={16} />
          </button>
        </>
      )}
    </div>
  )
}

function ProfileBlock({
  profile,
  brands,
  currency,
  expanded,
  onToggle,
  onUpdateVariant,
}: {
  profile: ProductPriceProfile
  brands: GlobalBrand[]
  currency: Currency
  expanded: boolean
  onToggle: () => void
  onUpdateVariant: (profileId: string, variantId: string, patch: Partial<Pick<ProductVariant, 'name' | 'brandId' | 'lastPrice' | 'pricePerKg'>>) => void
}) {
  const produce = isProduceCategory(profile.category)

  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <button
        type="button"
        className="tap-scale flex w-full items-center justify-between px-3.5 py-3 text-left"
        onClick={onToggle}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{profile.itemName}</span>
          <span className="block text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {profile.category} · {profile.variants.length} Variante{profile.variants.length === 1 ? '' : 'n'}
          </span>
        </span>
        <span className="rotate-90" style={{ color: 'var(--text-muted)' }}>
          <Icon path={ICON_PATHS.chevron} size={16} />
        </span>
      </button>
      {expanded && (
        <div className="px-3.5 pb-3">
          {profile.variants.map((variant) => (
            <VariantEditor
              key={variant.id}
              profileId={profile.id}
              variant={variant}
              label={formatVariantLabel(variant, brands)}
              brands={brands}
              currency={currency}
              produce={produce}
              onUpdate={onUpdateVariant}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function VariantEditor({
  profileId,
  variant,
  label,
  brands,
  currency,
  produce,
  onUpdate,
}: {
  profileId: string
  variant: ProductVariant
  label: string
  brands: GlobalBrand[]
  currency: Currency
  produce: boolean
  onUpdate: (profileId: string, variantId: string, patch: Partial<Pick<ProductVariant, 'name' | 'brandId' | 'lastPrice' | 'pricePerKg'>>) => void
}) {
  const [priceInput, setPriceInput] = useState(
    String(produce ? (variant.pricePerKg ?? variant.lastPrice ?? '') : (variant.lastPrice ?? ''))
  )

  function savePrice() {
    const parsed = parseMoneyInput(priceInput)
    if (parsed === null) return
    if (produce) {
      onUpdate(profileId, variant.id, { pricePerKg: parsed, lastPrice: parsed })
    } else {
      onUpdate(profileId, variant.id, { lastPrice: parsed })
    }
  }

  return (
    <div className="mb-2 rounded-xl px-3 py-2.5 last:mb-0" style={{ background: 'var(--chip-bg)' }}>
      <div className="mb-2 truncate text-[13px] font-bold">{label}</div>
      <div className="mb-2 flex gap-2">
        <select
          className="input min-w-0 flex-1 py-2 text-[13px]"
          value={variant.brandId || ''}
          onChange={(e) => onUpdate(profileId, variant.id, { brandId: e.target.value || undefined })}
        >
          <option value="">Keine Marke</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
          {produce ? 'CHF/kg' : 'Preis'}
        </span>
        <input
          type="text"
          inputMode="decimal"
          className="input min-w-0 flex-1 py-1.5 text-[14px]"
          value={priceInput}
          onChange={(e) => setPriceInput(e.target.value)}
          onBlur={savePrice}
          onKeyDown={(e) => {
            if (e.key === 'Enter') savePrice()
          }}
        />
        {variant.lastPrice ? (
          <span className="text-[11px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {formatMoney(variant.lastPrice, currency)}
          </span>
        ) : null}
      </div>
    </div>
  )
}
