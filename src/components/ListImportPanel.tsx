import { useMemo, useState } from 'react'
import { useStore } from '@/store/useStore'
import { importFromJSON } from '@/utils/import'
import { normalizeListInput } from '@/utils/listInput'
import { buildClaudeImportPrompt } from '@/utils/claudeImportPrompt'
import type { ImportMode } from '@/types'

export function ListImportPanel({
  onClose,
  onImported,
  onReceipt,
}: {
  onClose: () => void
  onImported: (message: string) => void
  onReceipt?: () => void
}) {
  const pantry = useStore((s) => s.pantry)
  const custom = useStore((s) => s.customProducts)
  const openCount = useStore((s) => s.activeList()?.items.filter((i) => !i.done).length ?? 0)
  const [text, setText] = useState('')
  const [mode, setMode] = useState<ImportMode>('merge')
  const [message, setMessage] = useState('')
  const [replaceConfirmed, setReplaceConfirmed] = useState(false)
  const [filename, setFilename] = useState('')
  const preview = useMemo(() => {
    try {
      return importFromJSON(normalizeListInput(text, custom), pantry)
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : 'Liste nicht lesbar.' }
    }
  }, [text, custom, pantry])
  const count = preview.kept?.length ?? 0
  function finish() {
    try {
      const result = useStore.getState().importIntoActiveList(normalizeListInput(text, custom), mode)
      if (!result.ok) {
        setMessage(result.error ?? 'Import fehlgeschlagen.')
        return
      }
      onClose()
      onImported(
        `${result.keptCount ?? count} Artikel importiert${result.filteredCount ? ` · ${result.filteredCount} im Vorrat` : ''}`
      )
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Import fehlgeschlagen.')
    }
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <h2 className="mb-1 text-xl font-bold">Liste importieren</h2>
      <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Text, JSON oder Datei – vor dem Übernehmen siehst du eine Vorschau.
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <label className="btn-soft flex min-h-12 cursor-pointer items-center justify-center px-2 text-center text-sm">
            JSON-Datei auswählen
            <input
              type="file"
              className="sr-only"
              aria-label="JSON-Datei importieren"
              accept=".json,.txt,application/json,text/plain"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                if (file.size > 1024 * 1024) {
                  setMessage('Datei zu groß (maximal 1 MB).')
                  return
                }
                try {
                  setText(await file.text())
                  setFilename(file.name)
                  setMessage('')
                } catch {
                  setMessage('Die Datei konnte nicht gelesen werden. Bitte erneut auswählen.')
                }
              }}
            />
          </label>
          {onReceipt && (
            <button
              className="btn-soft min-h-12 px-2 text-sm"
              onClick={() => {
                onClose()
                onReceipt()
              }}
            >
              Kassenbon · Foto / PDF
            </button>
          )}
          <button
            className="btn-soft col-span-2 min-h-11 text-sm"
            onClick={() => {
              const result = useStore.getState().repeatLastWeekToActiveList()
              if (!result.ok) setMessage(result.error ?? 'Keine vorherige Liste vorhanden.')
              else {
                onClose()
                onImported(`${result.addedCount} Artikel übernommen`)
              }
            }}
          >
            Letzte Woche wiederholen
          </button>
        </div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <label htmlFor="list-import-text" className="text-sm font-semibold">
            Liste oder JSON einfügen
          </label>
          {text && (
            <button
              className="min-h-11 text-xs font-semibold"
              onClick={() => {
                setText('')
                setFilename('')
                setMessage('')
              }}
            >
              Leeren
            </button>
          )}
        </div>
        {filename && (
          <p className="mb-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {filename}
          </p>
        )}
        <textarea
          id="list-import-text"
          aria-label="Liste oder JSON"
          className="input min-h-[136px] w-full resize-y"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={'Zum Beispiel:\n500 g Tomaten\n2 Stück Eier\n1 l Milch'}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setMessage('')
          }}
        />
        {text && !preview.ok && (
          <p role="alert" className="my-2 text-sm" style={{ color: 'var(--danger)' }}>
            {preview.error}
          </p>
        )}
        {preview.ok && (
          <section className="card-surface my-3 p-3">
            <h3 className="mb-2 text-sm font-bold">Vorschau · {count} Artikel</h3>
            {preview.kept?.slice(0, 8).map((item) => (
              <div className="flex justify-between gap-2 py-1 text-sm" key={item.id}>
                <span className="min-w-0 truncate">{item.name}</span>
                <span className="shrink-0 tabular-nums" style={{ color: 'var(--text-muted)' }}>
                  {item.amount}
                </span>
              </div>
            ))}
            {count > 8 && <p className="mt-2 text-xs">… und {count - 8} weitere</p>}
            {!!preview.filtered?.length && (
              <p className="mt-2 text-xs">{preview.filtered.length} Artikel sind bereits im Vorrat.</p>
            )}
          </section>
        )}
        {!!openCount && (
          <div className="my-3">
            <label className="text-sm font-semibold">
              Mit der vorhandenen Liste
              <select
                className="input mt-1 w-full"
                value={mode}
                onChange={(e) => {
                  setMode(e.target.value as ImportMode)
                  setReplaceConfirmed(false)
                }}
              >
                <option value="merge">Zusammenführen · Mengen addieren</option>
                <option value="append">Anhängen · getrennt übernehmen</option>
                <option value="replace">Offene Artikel ersetzen</option>
              </select>
            </label>
            {mode === 'replace' && (
              <label className="mt-2 flex min-h-11 items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={replaceConfirmed}
                  onChange={(e) => setReplaceConfirmed(e.target.checked)}
                />
                Die {openCount} offenen Artikel ersetzen; erledigte bleiben erhalten.
              </label>
            )}
          </div>
        )}
        <details className="my-3 text-xs">
          <summary className="min-h-11 cursor-pointer font-semibold">
            Liste von einer KI vorbereiten lassen
          </summary>
          <button
            className="btn-soft my-2 min-h-11 w-full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(buildClaudeImportPrompt())
                setMessage('KI-Vorlage kopiert.')
              } catch {
                setMessage('Kopieren ist hier nicht verfügbar.')
              }
            }}
          >
            KI-Vorlage kopieren
          </button>
        </details>
      </div>
      {message && (
        <p role="status" className="my-2 text-sm">
          {message}
        </p>
      )}
      <button
        className="btn-primary mt-3 min-h-12 shrink-0"
        disabled={!preview.ok || (mode === 'replace' && !!openCount && !replaceConfirmed)}
        onClick={finish}
      >
        {preview.ok ? `${count} Artikel übernehmen` : 'Liste zum Importieren einfügen'}
      </button>
    </div>
  )
}
