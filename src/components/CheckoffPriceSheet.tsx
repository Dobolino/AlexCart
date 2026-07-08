import { useState } from 'react'
import { Sheet } from './Sheet'
import { formatChf, parseChfInput } from '@/utils/currency'
import type { ShoppingItem } from '@/types'

interface CheckoffPriceSheetProps {
  item: ShoppingItem
  onClose: () => void
  onSave: (price: number) => void
  onSkip: () => void
}

export function CheckoffPriceSheet({ item, onClose, onSave, onSkip }: CheckoffPriceSheetProps) {
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  function handleSave() {
    const price = parseChfInput(input)
    if (price === null) {
      setError('Bitte einen gültigen Preis eingeben.')
      return
    }
    onSave(price)
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-1 text-lg font-bold">Preis erfassen</h2>
      <p className="mb-4 text-[14px]" style={{ color: 'var(--text-muted)' }}>
        Was hat <span className="font-semibold" style={{ color: 'var(--text)' }}>{item.name}</span> gekostet?
      </p>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[15px] font-bold" style={{ color: 'var(--text-muted)' }}>
          CHF
        </span>
        <input
          autoFocus
          type="text"
          inputMode="decimal"
          className="input flex-1 text-[22px] font-bold"
          placeholder="0,00"
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave()
          }}
        />
      </div>
      {input && parseChfInput(input) !== null && (
        <p className="mb-2 text-[13px] font-semibold" style={{ color: 'var(--accent)' }}>
          {formatChf(parseChfInput(input)!)}
        </p>
      )}
      {error && (
        <p className="mb-2 text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2.5">
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
