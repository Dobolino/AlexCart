import { useMemo, useState } from 'react'
import { Sheet } from './Sheet'
import { MoneyNumpad } from './MoneyNumpad'
import { ItemAmountColumn } from './ItemAmountColumn'
import { ProduceWeightInput } from './ProduceWeightInput'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { centsToAmount } from '@/utils/numpadInput'
import { adjustAmount, priceQuantityFromAmount, resolveCheckoffTotalPrice, type CheckoffPriceMode } from '@/utils/amount'
import { amountToCents, findVariant, pickVariantForEstimate } from '@/utils/priceProfiles'
import { findVariantIdByName, getVariantSizePresets } from '@/utils/variantPresets'
import { formatVariantLabel } from '@/utils/brands'
import { isProduceCategory, resolveProduceCheckoffPrice, weightGramsFromAmount, formatWeightGrams, parseGramsInput } from '@/utils/producePrice'
import { formatMoney } from '@/utils/currency'
import type { CheckoffPriceData, Currency, GlobalBrand, ProductPriceProfile, ProductVariant, ShoppingItem } from '@/types'

const NEW_VARIANT = '__new__'

interface CheckoffPriceSheetProps {
  item: ShoppingItem
  profile: ProductPriceProfile | null
  brands: GlobalBrand[]
  currency: Currency
  onClose: () => void
  onSave: (data: CheckoffPriceData) => void
  onSkip: () => void
  onAmountChange?: (amount: string) => void
  /** Einkaufsmodus: Optionen (Pro Stück/Gesamt, Aktion) farblich hervorheben. */
  highlightOptions?: boolean
}

function formatShortDate(date?: string): string {
  if (!date) return '–'
  const [y, m, d] = date.split('-')
  if (!d || !m) return date
  return `${d}.${m}.${y}`
}

export function CheckoffPriceSheet({
  item,
  profile,
  brands,
  currency,
  onClose,
  onSave,
  onSkip,
  onAmountChange,
  highlightOptions = false,
}: CheckoffPriceSheetProps) {
  const variants = profile?.variants ?? []
  const hasVariants = variants.length > 0
  const initialVariant = pickVariantForEstimate(profile ?? undefined, item)
  const quantity = priceQuantityFromAmount(item.amount)
  const isProduce = isProduceCategory(item.category)
  const weightGrams = weightGramsFromAmount(item.amount) ?? parseGramsInput(item.amount)

  const [selection, setSelection] = useState<string>(
    hasVariants ? initialVariant?.id ?? NEW_VARIANT : NEW_VARIANT
  )
  const [variantName, setVariantName] = useState('')
  const [brandId, setBrandId] = useState(initialVariant?.brandId || '')
  const [cents, setCents] = useState(0)
  const [wasSale, setWasSale] = useState(false)
  const [priceMode, setPriceMode] = useState<CheckoffPriceMode>(quantity > 1 ? 'unit' : 'total')
  const [error, setError] = useState('')

  const selectedVariant = useMemo(() => {
    if (selection === NEW_VARIANT) return undefined
    return profile ? findVariant(profile, selection) : undefined
  }, [profile, selection])

  const showNewVariantName = selection === NEW_VARIANT
  const sizePresets = getVariantSizePresets(item.name, item.category, item.amount)

  // Preis-/Marken-Vorbelegung bei Variantenwahl oder Aktion/Normalpreis-Wechsel neu anwenden -
  // während des Renderns statt in einem Effect (React-Muster "Zustand beim Ändern eines Werts
  // anpassen"). appliedPrefillKey startet bei null, damit die erste Vorbelegung auch beim
  // initialen Mount greift (bisher übernahm das der erste Effect-Lauf).
  const prefillKey = `${selectedVariant?.id ?? ''}|${wasSale}`
  const [appliedPrefillKey, setAppliedPrefillKey] = useState<string | null>(null)
  if (selectedVariant && prefillKey !== appliedPrefillKey) {
    setAppliedPrefillKey(prefillKey)
    setBrandId(selectedVariant.brandId || '')
    if (wasSale) {
      if (selectedVariant.lastSalePrice && selectedVariant.lastSalePrice > 0) {
        setCents(amountToCents(selectedVariant.lastSalePrice))
      }
    } else {
      const prefilled = isProduce
        ? selectedVariant.pricePerKg ?? selectedVariant.lastPrice
        : selectedVariant.lastPrice
      if (prefilled && prefilled > 0) {
        setCents(amountToCents(prefilled))
      }
    }
  }

  // Stückpreis-Anzeige auf "Pro Stück" umschalten, wenn die Menge (z. B. per Stepper) auf >1
  // wechselt - initialer Wert kommt schon aus useState oben, hier nur Folgeänderungen.
  const [syncedQuantity, setSyncedQuantity] = useState(quantity)
  if (quantity !== syncedQuantity) {
    setSyncedQuantity(quantity)
    if (!isProduce && quantity > 1) setPriceMode('unit')
  }

  const enteredAmount = centsToAmount(cents) ?? 0
  const resolved = useMemo(() => {
    if (enteredAmount <= 0) return null
    if (isProduce && weightGrams) return resolveProduceCheckoffPrice(enteredAmount, weightGrams)
    return resolveCheckoffTotalPrice(enteredAmount, item.amount, priceMode)
  }, [enteredAmount, item.amount, priceMode, isProduce, weightGrams])

  function handleAdjustAmount(direction: 1 | -1) {
    if (!onAmountChange || isProduce) return
    if (!item.amount.trim() && direction > 0) {
      onAmountChange('1 Stk')
      return
    }
    onAmountChange(adjustAmount(item.amount, direction))
  }

  function applySizePreset(preset: string) {
    const existingId = profile ? findVariantIdByName(profile.variants, preset) : undefined
    if (existingId) {
      setSelection(existingId)
      setVariantName('')
    } else {
      setSelection(NEW_VARIANT)
      setVariantName(preset)
    }
    setError('')
  }

  function handleSave() {
    const price = centsToAmount(cents)
    if (price === null) {
      setError('Bitte einen gültigen Preis eingeben.')
      return
    }

    let payload: CheckoffPriceData
    if (isProduce) {
      const grams = weightGramsFromAmount(item.amount) ?? parseGramsInput(item.amount) ?? 0
      if (grams <= 0) {
        setError('Bitte das abgewogene Gewicht in Gramm eingeben.')
        return
      }
      const produce = resolveProduceCheckoffPrice(price, grams)
      payload = {
        price: produce.total,
        unitPrice: produce.unitPrice,
        pricePerKg: produce.pricePerKg,
        weightGrams: produce.weightGrams,
        wasSale,
        brandId: brandId || undefined,
      }
    } else {
      const { total, unitPrice } = resolveCheckoffTotalPrice(price, item.amount, priceMode)
      payload = {
        price: total,
        unitPrice: quantity > 1 || priceMode === 'unit' ? unitPrice : undefined,
        wasSale,
        brandId: brandId || undefined,
      }
    }

    if (showNewVariantName) {
      const name = variantName.trim() || 'Standard'
      onSave({ ...payload, variantName: name })
      return
    }

    if (!selectedVariant) {
      setError('Bitte eine Variante wählen.')
      return
    }

    onSave({ ...payload, variantId: selectedVariant.id })
  }

  return (
    <Sheet onClose={onClose} tall>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="shrink-0">
          <h2 className="mb-0.5 text-lg font-bold leading-tight">Preis erfassen</h2>
          <p className="mb-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold" style={{ color: 'var(--text)' }}>{item.name}</span>
          </p>

          {onAmountChange && isProduce && (
            <div className="mb-2 rounded-xl px-2.5 py-2" style={{ background: 'var(--chip-bg)' }}>
              <div className="mb-1.5 text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                Abgewogenes Gewicht
              </div>
              <ProduceWeightInput
                amount={item.amount}
                onChange={onAmountChange}
              />
            </div>
          )}

          {onAmountChange && !isProduce && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-xl px-2.5 py-2" style={{ background: 'var(--chip-bg)' }}>
              <span className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
                Menge
              </span>
              <ItemAmountColumn
                item={item}
                showStepper
                onAdjustAmount={(_, direction) => handleAdjustAmount(direction)}
              />
            </div>
          )}

          {isProduce && (
            <p className="mb-2 px-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Exaktes Gewicht vom Kassenbon eingeben – z. B. 347 g
            </p>
          )}

          {isProduce && weightGrams && weightGrams > 0 && (
            <p className="mb-2 px-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              Gesamtpreis eingeben – wird in {formatWeightGrams(weightGrams)} auf Kilopreis umgerechnet
            </p>
          )}

          {!isProduce && quantity > 1 && (
            <OptionSegment
              highlight={highlightOptions}
              options={[
                { value: 'unit', label: 'Pro Stück' },
                { value: 'total', label: 'Gesamt' },
              ]}
              value={priceMode}
              onChange={(v) => setPriceMode(v as CheckoffPriceMode)}
            />
          )}

          {!isProduce && quantity > 1 && (
            <p className="mb-2 px-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {priceMode === 'unit'
                ? `Stückpreis eingeben – wird mit ${quantity} multipliziert`
                : 'Gesamtpreis aller Packungen am Kassenbon'}
            </p>
          )}

          {brands.length > 0 && (
            <div className="mb-2">
              <label className="mb-1 block px-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
                Marke
              </label>
              <select
                className="input w-full py-2.5 text-[14px]"
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
              >
                <option value="">Keine Marke</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {sizePresets.length > 0 && (
            <div className="mb-2">
              <div className="mb-1.5 px-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
                Grösse
              </div>
              <div className="flex flex-wrap gap-2">
                {sizePresets.map((preset) => {
                  const active =
                    (selectedVariant && selectedVariant.name === preset) ||
                    (showNewVariantName && variantName === preset)
                  return (
                    <button
                      key={preset}
                      type="button"
                      className="tap-scale rounded-full px-3 py-1.5 text-[12px] font-bold"
                      style={{
                        background: active ? 'var(--accent-soft)' : 'var(--chip-bg)',
                        color: active ? 'var(--accent)' : 'var(--text)',
                        outline: active ? '2px solid var(--accent)' : 'none',
                      }}
                      onClick={() => applySizePreset(preset)}
                      aria-pressed={active}
                    >
                      {preset}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {hasVariants ? (
            <div className="mb-2">
              <label className="mb-1 block px-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
                Variante
              </label>
              <select
                className="input w-full py-2.5 text-[14px]"
                value={selection}
                onChange={(e) => {
                  setSelection(e.target.value)
                  setError('')
                  if (e.target.value !== NEW_VARIANT) setVariantName('')
                }}
              >
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {formatVariantLabel(v, brands)}
                  </option>
                ))}
                <option value={NEW_VARIANT}>+ Neue Variante</option>
              </select>
            </div>
          ) : (
            <div className="mb-2">
              <label className="mb-1 block px-0.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
                Variante (Marke / Grösse)
              </label>
              <input
                type="text"
                className="input w-full py-2.5 text-[14px]"
                placeholder="z. B. Coop Naturaplan Bio 1L"
                value={variantName}
                onChange={(e) => {
                  setVariantName(e.target.value)
                  setError('')
                }}
              />
            </div>
          )}

          {showNewVariantName && hasVariants && (
            <div className="mb-2">
              <input
                type="text"
                className="input w-full py-2.5 text-[14px]"
                placeholder="Name der neuen Variante"
                value={variantName}
                onChange={(e) => {
                  setVariantName(e.target.value)
                  setError('')
                }}
              />
            </div>
          )}

          {selectedVariant && (
            <div
              className="mb-2 grid grid-cols-3 gap-1.5 rounded-xl px-2.5 py-2 text-center text-[11px]"
              style={{ background: 'var(--chip-bg)' }}
            >
              <div>
                <div style={{ color: 'var(--text-muted)' }}>{isProduce ? 'CHF/kg' : 'Zuletzt'}</div>
                <div className="font-bold tabular-nums">
                  {isProduce
                    ? selectedVariant.pricePerKg
                      ? formatMoney(selectedVariant.pricePerKg, currency)
                      : selectedVariant.lastPrice
                        ? formatMoney(selectedVariant.lastPrice, currency)
                        : '–'
                    : selectedVariant.lastPrice
                      ? formatMoney(selectedVariant.lastPrice, currency)
                      : '–'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Ø normal</div>
                <div className="font-bold tabular-nums">
                  {selectedVariant.avgPrice ? formatMoney(selectedVariant.avgPrice, currency) : '–'}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Gekauft</div>
                <div className="font-bold">{formatShortDate(selectedVariant.lastPurchaseDate)}</div>
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <MoneyNumpad
            cents={cents}
            onChange={(value) => {
              setCents(value)
              setError('')
            }}
            currency={currency}
            dense
            label={isProduce ? 'Preis am Kassenbon' : quantity > 1 && priceMode === 'unit' ? 'Preis pro Stück' : 'Preis'}
          />
          {isProduce && enteredAmount > 0 && weightGrams && (
            <div
              className="mb-1 rounded-xl px-3 py-2 text-center text-[13px] font-bold tabular-nums"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              {formatMoney(resolveProduceCheckoffPrice(enteredAmount, weightGrams).pricePerKg, currency)}/kg
              {' · '}
              {formatWeightGrams(weightGrams)}
            </div>
          )}
          {resolved && resolved.total > 0 && !isProduce && quantity > 1 && (
            <div
              className="mb-1 rounded-xl px-3 py-2 text-center text-[13px] font-bold tabular-nums"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              {priceMode === 'unit'
                ? `${quantity} × ${formatMoney(resolved.unitPrice, currency)} = ${formatMoney(resolved.total, currency)}`
                : `Gesamt: ${formatMoney(resolved.total, currency)}`}
            </div>
          )}
          <PriceTypePicker
            wasSale={wasSale}
            onChange={setWasSale}
            variant={selectedVariant}
            currency={currency}
            highlight={highlightOptions}
          />
        </div>

        <div
          className="shrink-0 border-t pt-2.5"
          style={{ borderColor: 'var(--border)' }}
        >
          {error && (
            <p className="mb-2 text-center text-[12px] font-bold" style={{ color: 'var(--danger)' }}>
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn-soft flex-1 py-3 text-[14px]" onClick={onSkip}>
              Überspringen
            </button>
            <button className="btn-primary flex-1 py-3 text-[14px]" onClick={handleSave}>
              Speichern
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

function OptionSegment({
  options,
  value,
  onChange,
  highlight = false,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  highlight?: boolean
}) {
  return (
    <div className="mb-2 flex gap-1 rounded-xl p-0.5" style={{ background: 'var(--chip-bg)' }}>
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            className="tap-scale flex flex-1 items-center justify-center rounded-lg py-2 text-[12px] font-bold transition-colors"
            style={{
              background: active
                ? highlight
                  ? 'var(--accent-soft)'
                  : 'var(--surface)'
                : 'transparent',
              color: active ? (highlight ? 'var(--accent)' : 'var(--text)') : 'var(--text-muted)',
              boxShadow: active && !highlight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              outline: active && highlight ? '2px solid var(--accent)' : 'none',
            }}
            onClick={() => onChange(opt.value)}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

function PriceTypePicker({
  wasSale,
  onChange,
  variant,
  currency,
  highlight = false,
}: {
  wasSale: boolean
  onChange: (sale: boolean) => void
  variant?: ProductVariant
  currency: Currency
  highlight?: boolean
}) {
  const lastSaleHint =
    variant?.lastSalePrice && variant.lastSalePrice > 0
      ? `Zuletzt ${formatMoney(variant.lastSalePrice, currency)}`
      : null

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 rounded-xl p-0.5" style={{ background: 'var(--chip-bg)' }}>
        <button
          type="button"
          className="tap-scale flex flex-1 items-center justify-center rounded-lg py-2 text-[12px] font-bold transition-colors"
          style={{
            background: !wasSale ? (highlight ? 'var(--accent-soft)' : 'var(--surface)') : 'transparent',
            color: !wasSale ? (highlight ? 'var(--accent)' : 'var(--text)') : 'var(--text-muted)',
            boxShadow: !wasSale && !highlight ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            outline: !wasSale && highlight ? '2px solid var(--accent)' : 'none',
          }}
          onClick={() => onChange(false)}
          aria-pressed={!wasSale}
        >
          Normalpreis
        </button>
        <button
          type="button"
          className="tap-scale flex flex-1 items-center justify-center gap-1 rounded-lg py-2 text-[12px] font-bold transition-colors"
          style={{
            background: wasSale ? 'var(--accent-soft)' : 'transparent',
            color: wasSale ? 'var(--accent)' : 'var(--text-muted)',
            boxShadow: wasSale ? '0 1px 3px rgba(255,149,0,0.15)' : 'none',
            outline: wasSale && highlight ? '2px solid var(--accent)' : 'none',
          }}
          onClick={() => onChange(true)}
          aria-pressed={wasSale}
        >
          <Icon path={ICON_PATHS.flame} size={13} />
          Aktion
        </button>
      </div>
      {wasSale && (
        <p className="mt-1 truncate px-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Separat erfasst{lastSaleHint ? ` · ${lastSaleHint}` : ''}
        </p>
      )}
    </div>
  )
}
