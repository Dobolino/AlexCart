import { useState } from 'react'
import { Sheet } from './Sheet'
import { MoneyNumpad } from './MoneyNumpad'
import { centsToAmount } from '@/utils/numpadInput'
import type { Currency, ShoppingItem } from '@/types'

interface CheckoffPriceSheetProps {
  item: ShoppingItem
  currency: Currency
  onClose: () => void
  onSave: (price: number) => void
  onSkip: () => void
}

export function CheckoffPriceSheet({ item, currency, onClose, onSave, onSkip }: CheckoffPriceSheetProps) {
  const [cents, setCents] = useState(0)
  const [error, setError] = useState('')

  function handleSave() {
    const price = centsToAmount(cents)
    if (price === null) {
      setError('Bitte einen gültigen Preis eingeben.')
      return
    }
    onSave(price)
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-1 text-lg font-bold">Preis erfassen</h2>
      <p className="mb-3 text-[14px]" style={{ color: 'var(--text-muted)' }}>
        Was hat <span className="font-semibold" style={{ color: 'var(--text)' }}>{item.name}</span> gekostet?
        Ziffern nacheinander tippen – die Cent-Stellen füllen sich automatisch.
      </p>

      <MoneyNumpad cents={cents} onChange={(value) => { setCents(value); setError('') }} currency={currency} compact />

      {error && (
        <p className="mb-2 text-center text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
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
