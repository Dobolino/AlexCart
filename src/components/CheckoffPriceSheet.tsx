import { useEffect, useMemo, useState } from 'react'
import { Sheet } from './Sheet'
import { MoneyNumpad } from './MoneyNumpad'
import { ItemAmountColumn } from './ItemAmountColumn'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { centsToAmount } from '@/utils/numpadInput'
import { adjustAmount, priceQuantityFromAmount, resolveCheckoffTotalPrice, type CheckoffPriceMode } from '@/utils/amount'
import { amountToCents, findVariant, pickVariantForEstimate } from '@/utils/priceProfiles'
import { formatMoney } from '@/utils/currency'
import type { CheckoffPriceData, Currency, ProductPriceProfile, ProductVariant, ShoppingItem } from '@/types'

const NEW_VARIANT = '__new__'

interface CheckoffPriceSheetProps {
  item: ShoppingItem
  profile: ProductPriceProfile | null
  currency: Currency
  onClose: () => void
  onSave: (data: CheckoffPriceData) => void
  onSkip: () => void
  onAmountChange?: (amount: string) => void
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
  currency,
  onClose,
  onSave,
  onSkip,
  onAmountChange,
}: CheckoffPriceSheetProps) {
  const variants = profile?.variants ?? []
  const hasVariants = variants.length > 0
  const initialVariant = pickVariantForEstimate(profile ?? undefined, item)
  const quantity = priceQuantityFromAmount(item.amount)

  const [selection, setSelection] = useState<string>(
    hasVariants ? initialVariant?.id ?? NEW_VARIANT : NEW_VARIANT
  )
  const [variantName, setVariantName] = useState('')
  const [cents, setCents] = useState(0)
  const [wasSale, setWasSale] = useState(false)
  const [priceMode, setPriceMode] = useState<CheckoffPriceMode>(quantity > 1 ? 'unit' : 'total')
  const [error, setError] = useState('')

  const selectedVariant = useMemo(() => {
    if (selection === NEW_VARIANT) return undefined
    return profile ? findVariant(profile, selection) : undefined
  }, [profile, selection])

  const showNewVariantName = selection === NEW_VARIANT

  useEffect(() => {
    if (!selectedVariant) return
    if (wasSale) {
      if (selectedVariant.lastSalePrice && selectedVariant.lastSalePrice > 0) {
        setCents(amountToCents(selectedVariant.lastSalePrice))
      }
      return
    }
    if (selectedVariant.lastPrice && selectedVariant.lastPrice > 0) {
      setCents(amountToCents(selectedVariant.lastPrice))
    }
  }, [selectedVariant?.id, wasSale])

  useEffect(() => {
    if (quantity > 1) setPriceMode('unit')
  }, [quantity])

  const enteredAmount = centsToAmount(cents) ?? 0
  const resolved = useMemo(
    () => (enteredAmount > 0 ? resolveCheckoffTotalPrice(enteredAmount, item.amount, priceMode) : null),
    [enteredAmount, item.amount, priceMode]
  )

  function handleAdjustAmount(direction: 1 | -1) {
    if (!onAmountChange) return
    if (!item.amount.trim() && direction > 0) {
      onAmountChange('1 Stk')
      return
    }
    onAmountChange(adjustAmount(item.amount, direction))
  }

  function handleSave() {
    const price = centsToAmount(cents)
    if (price === null) {
      setError('Bitte einen gültigen Preis eingeben.')
      return
    }

    const { total, unitPrice } = resolveCheckoffTotalPrice(price, item.amount, priceMode)
    const payload: CheckoffPriceData = {
      price: total,
      unitPrice: quantity > 1 || priceMode === 'unit' ? unitPrice : undefined,
      wasSale,
    }

    if (showNewVariantName) {
      const name = variantName.trim()
      if (!name) {
        setError('Bitte einen Variantennamen eingeben.')
        return
      }
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

          {onAmountChange && (
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

          {quantity > 1 && (
            <div className="mb-2 flex gap-1 rounded-xl p-0.5" style={{ background: 'var(--chip-bg)' }}>
              <button
                type="button"
                className="tap-scale flex-1 rounded-lg py-2 text-[12px] font-bold"
                style={{
                  background: priceMode === 'unit' ? 'var(--surface)' : 'transparent',
                  color: priceMode === 'unit' ? 'var(--text)' : 'var(--text-muted)',
                }}
                onClick={() => setPriceMode('unit')}
                aria-pressed={priceMode === 'unit'}
              >
                Pro Stück
              </button>
              <button
                type="button"
                className="tap-scale flex-1 rounded-lg py-2 text-[12px] font-bold"
                style={{
                  background: priceMode === 'total' ? 'var(--surface)' : 'transparent',
                  color: priceMode === 'total' ? 'var(--text)' : 'var(--text-muted)',
                }}
                onClick={() => setPriceMode('total')}
                aria-pressed={priceMode === 'total'}
              >
                Gesamt
              </button>
            </div>
          )}

          {quantity > 1 && (
            <p className="mb-2 px-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {priceMode === 'unit'
                ? `Stückpreis eingeben – wird mit ${quantity} multipliziert`
                : 'Gesamtpreis aller Packungen am Kassenbon'}
            </p>
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
                    {v.name}
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
                <div style={{ color: 'var(--text-muted)' }}>Zuletzt</div>
                <div className="font-bold tabular-nums">
                  {selectedVariant.lastPrice ? formatMoney(selectedVariant.lastPrice, currency) : '–'}
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
            label={quantity > 1 && priceMode === 'unit' ? 'Preis pro Stück' : 'Preis'}
          />
          {resolved && resolved.total > 0 && quantity > 1 && (
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

function PriceTypePicker({
  wasSale,
  onChange,
  variant,
  currency,
}: {
  wasSale: boolean
  onChange: (sale: boolean) => void
  variant?: ProductVariant
  currency: Currency
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
            background: !wasSale ? 'var(--surface)' : 'transparent',
            color: !wasSale ? 'var(--text)' : 'var(--text-muted)',
            boxShadow: !wasSale ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
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
