import { useState } from 'react'
import { Sheet } from './Sheet'
import { useStore } from '@/store/useStore'

interface ImportSheetProps {
  onClose: () => void
  onImported: (message: string) => void
}

export function ImportSheet({ onClose, onImported }: ImportSheetProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const importIntoActiveList = useStore((s) => s.importIntoActiveList)

  function handleImport() {
    if (!text.trim()) {
      setError('Bitte JSON einfügen.')
      return
    }
    const result = importIntoActiveList(text.trim())
    if (!result.ok) {
      setError(result.error || 'Import fehlgeschlagen.')
      return
    }
    onClose()
    const suffix = result.filteredCount ? `, ${result.filteredCount} aus Vorrat gefiltert` : ''
    onImported(`${result.keptCount} Artikel importiert${suffix}`)
  }

  return (
    <Sheet onClose={onClose}>
      <h2 className="mb-1 text-lg font-bold">Wochenplan importieren</h2>
      <p className="mb-3 text-[13px]" style={{ color: 'var(--text-muted)' }}>
        JSON aus deinem Essensplan-Chat hier einfügen.
      </p>
      <textarea
        className="w-full min-h-[180px] rounded-[14px] border p-3 font-mono text-[14px]"
        style={{ borderColor: 'var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
        placeholder='{"week":"2026-07-06","items":[{"name":"Tomaten","amount":"500g","category":"Obst & Gemüse"}]}'
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="min-h-[16px] mt-2 text-[13px] font-bold" style={{ color: 'var(--danger)' }}>
        {error}
      </div>
      <div className="mt-3 flex gap-2.5">
        <button
          className="flex-1 rounded-[14px] py-3.5 text-[15px] font-bold"
          style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
          onClick={onClose}
        >
          Abbrechen
        </button>
        <button className="btn-duo flex-1 rounded-[14px] py-3.5 text-[15px]" onClick={handleImport}>
          Importieren
        </button>
      </div>
    </Sheet>
  )
}
