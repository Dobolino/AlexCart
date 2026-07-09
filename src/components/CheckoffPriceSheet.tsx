import { useEffect, useMemo, useState } from 'react'
import { Sheet } from './Sheet'
import { MoneyNumpad } from './MoneyNumpad'
import { centsToAmount } from '@/utils/numpadInput'
import { amountToCents, findVariant, pickVariantForEstimate } from '@/utils/priceProfiles'
import { formatMoney } from '@/utils/currency'
import type { CheckoffPriceData, Currency, ProductPriceProfile, ShoppingItem } from '@/types'

const NEW_VARIANT = '__new__'

interface CheckoffPriceSheetProps {
  item: ShoppingItem
  profile: ProductPriceProfile | null
  currency: Currency
  onClose: () => void
  onSave: (data: CheckoffPriceData) => void
  onSkip: () => void
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
}: CheckoffPriceSheetProps) {
  const variants = profile?.variants ?? []
  const hasVariants = variants.length > 0
  const initialVariant = pickVariantForEstimate(profile ?? undefined, item)

  const [selection, setSelection] = useState<string>(
    hasVariants ? initialVariant?.id ?? NEW_VARIANT : NEW_VARIANT
  )
  const [variantName, setVariantName] = useState('')
  const [cents, setCents] = useState(0)
  const [wasSale, setWasSale] = useState(false)
  const [error, setError] = useState('')

  const selectedVariant = useMemo(() => {
    if (selection === NEW_VARIANT) return undefined
    return profile ? findVariant(profile, selection) : undefined
  }, [profile, selection])

  useEffect(() => {
    if (selectedVariant?.lastPrice && selectedVariant.lastPrice > 0) {
      setCents(amountToCents(selectedVariant.lastPrice))
    }
  }, [selectedVariant?.id])

  function handleSave() {
    const price = centsToAmount(cents)
    if (price === null) {
      setError('Bitte einen gültigen Preis eingeben.')
      return
    }

    if (selection === NEW_VARIANT) {
      const name = variantName.trim()
      if (!name) {
        setError('Bitte einen Variantennamen eingeben.')
        return
      }
      onSave({ price, variantName: name, wasSale })
      return
    }

    if (!selectedVariant) {
      setError('Bitte eine Variante wählen.')
      return
    }

    onSave({ price, variantId: selectedVariant.id, wasSale })
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-1 text-lg font-bold">Preis erfassen</h2>
      <p className="mb-3 text-[14px]" style={{ color: 'var(--text-muted)' }}>
        <span className="font-semibold" style={{ color: 'var(--text)' }}>{item.name}</span>
        {item.amount ? ` · ${item.amount}` : ''}
      </p>

      {hasVariants ? (
        <div className="mb-3">
          <label className="mb-1.5 block px-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
            Variante auswählen
          </label>
          <select
            className="input w-full py-3 text-[15px]"
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
        <div className="mb-3">
          <label className="mb-1.5 block px-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
            Variante (Marke / Grösse)
          </label>
          <input
            type="text"
            className="input w-full py-3 text-[15px]"
            placeholder="z. B. Coop Naturaplan Bio 1L"
            value={variantName}
            onChange={(e) => {
              setVariantName(e.target.value)
              setError('')
            }}
          />
        </div>
      )}

      {selection === NEW_VARIANT && hasVariants && (
        <div className="mb-3">
          <label className="mb-1.5 block px-0.5 text-[12px] font-bold uppercase tracking-wide" style={{ color: 'var(--category-fg)' }}>
            Name der neuen Variante
          </label>
          <input
            type="text"
            className="input w-full py-3 text-[15px]"
            placeholder="z. B. Emmi Vollmilch 1L"
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
          className="mb-3 grid grid-cols-3 gap-2 rounded-2xl px-3 py-2.5 text-center text-[12px]"
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
            <div style={{ color: 'var(--text-muted)' }}>Zuletzt gekauft</div>
            <div className="font-bold">{formatShortDate(selectedVariant.lastPurchaseDate)}</div>
          </div>
        </div>
      )}

      <MoneyNumpad cents={cents} onChange={(value) => { setCents(value); setError('') }} currency={currency} compact />

      <button
        type="button"
        className="tap-scale mt-3 flex w-full items-center justify-between rounded-2xl px-4 py-3"
        style={{
          background: wasSale ? 'var(--accent-soft)' : 'var(--chip-bg)',
          color: wasSale ? 'var(--accent)' : 'var(--text)',
        }}
        onClick={() => setWasSale((v) => !v)}
      >
        <span className="text-[14px] font-semibold">Aktion</span>
        <span
          className="relative h-7 w-12 rounded-full transition-colors"
          style={{ background: wasSale ? 'var(--accent)' : 'var(--border)' }}
        >
          <span
            className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
            style={{ transform: wasSale ? 'translateX(22px)' : 'translateX(2px)' }}
          />
        </span>
      </button>
      {wasSale && (
        <p className="mt-1.5 px-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
          Aktionspreise werden separat erfasst und verfälschen nicht den Normal-Durchschnitt.
        </p>
      )}

      {error && (
        <p className="mb-2 mt-2 text-center text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2.5">
        <button className="btn-soft flex-1 py-3.5 text-[15px]" onClick={onSkip}>
          Überspringen
        </button>
        <button className="btn-primary flex-1 py-3.5 text-[15px]" onClick={handleSave}>
          Speichern
        </button>
      </div>
    </Sheet>
  )
}
