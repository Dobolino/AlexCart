import { useState } from 'react'
import { gramsToAmount, parseGramsInput, weightGramsFromAmount } from '@/utils/producePrice'

interface ProduceWeightInputProps {
  amount: string
  onChange: (amount: string) => void
  compact?: boolean
}

/** Exakte Gramm-Eingabe fürs Abwiegen – keine festen 50-g-Schritte. */
export function ProduceWeightInput({ amount, onChange, compact = false }: ProduceWeightInputProps) {
  const grams = weightGramsFromAmount(amount)
  const [draft, setDraft] = useState(grams !== null ? String(grams) : '')
  // Draft neu von `amount` übernehmen, wenn es sich von aussen ändert (z. B. Reset) - während
  // des Renderns statt in einem Effect, damit ein Tastendruck nicht erst einen Extra-Render
  // durchläuft, bevor die Eingabe sichtbar wird.
  const [syncedAmount, setSyncedAmount] = useState(amount)
  if (amount !== syncedAmount) {
    setSyncedAmount(amount)
    setDraft(grams !== null ? String(grams) : '')
  }

  function commit(value: string) {
    const parsed = parseGramsInput(value)
    if (parsed === null) {
      if (!value.trim()) onChange('')
      return
    }
    onChange(gramsToAmount(parsed))
  }

  return (
    <div
      className="flex flex-none items-center gap-1"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        type="text"
        inputMode="decimal"
        className={`rounded-xl border-0 text-right font-semibold tabular-nums outline-none focus:ring-2 focus:ring-[var(--accent)] ${
          compact ? 'w-[4.5rem] px-2 py-1.5 text-[14px]' : 'w-full px-3 py-2.5 text-[15px]'
        }`}
        style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
        placeholder="z. B. 347"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            commit(draft)
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        aria-label="Gewicht in Gramm"
      />
      <span className={`font-semibold ${compact ? 'text-[13px]' : 'text-[14px]'}`} style={{ color: 'var(--text-muted)' }}>
        g
      </span>
    </div>
  )
}
