import { useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { EditCustomProductSheet } from '@/components/EditCustomProductSheet'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey, getIconSvgPath } from '@/utils/icon'
import { getCategoryColor } from '@/utils/categoryColor'
import { readBackupJSON, restoreBackupJSON, backupFilename, shareOrDownloadBackup } from '@/utils/backup'
import type { CustomProduct, Theme } from '@/types'

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'System' },
]

export function SettingsPage() {
  const theme = useStore((s) => s.settings.theme)
  const setTheme = useStore((s) => s.setTheme)
  const resetAll = useStore((s) => s.resetAll)
  const customProducts = useStore((s) => s.customProducts)
  const removeCustomProduct = useStore((s) => s.removeCustomProduct)
  const [editing, setEditing] = useState<CustomProduct | null>(null)
  const [backupMessage, setBackupMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExportBackup() {
    const json = readBackupJSON()
    if (!json) {
      setBackupMessage('Keine Daten zum Sichern gefunden.')
      return
    }
    await shareOrDownloadBackup(json, backupFilename())
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!window.confirm('Sicherung einspielen? Das ersetzt alle aktuellen Daten in dieser App.')) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = restoreBackupJSON(String(reader.result || ''))
      if (result.ok) {
        window.location.reload()
      } else {
        setBackupMessage(result.error || 'Sicherung konnte nicht geladen werden.')
      }
    }
    reader.readAsText(file)
  }

  return (
    <>
      <PageHeader title="Einstellungen" subtitle="Design, Produkte & Daten" />
      <main className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-6">
        <div
          className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
          style={{ color: 'var(--category-fg)' }}
        >
          Design
        </div>
        <div className="glass-card mb-4.5 flex p-1.5">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className="tap-scale flex-1 rounded-xl py-2.5 text-[14px] font-bold"
              style={{
                background: theme === opt.value ? 'var(--accent)' : 'transparent',
                color: theme === opt.value ? 'var(--accent-fg)' : 'var(--text)',
              }}
              onClick={() => setTheme(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div
          className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
          style={{ color: 'var(--category-fg)' }}
        >
          Eigene Produkte
        </div>
        {!customProducts.length ? (
          <div className="card-surface mb-4.5">
            <EmptyState
              icon={ICON_PATHS.cart}
              title="Noch keine eigenen Produkte"
              hint="Lege beim Hinzufügen eines Artikels ein neues Produkt an – es erscheint dann hier."
            />
          </div>
        ) : (
          <div className="card-surface mb-4.5">
            {customProducts.map((p) => {
              const iconKey = getIconKey(p.name, p.category)
              const color = getCategoryColor(p.category)
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-3 border-b px-3.5 py-3"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <span
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
                    style={{ background: color.bg, color: color.fg }}
                  >
                    <Icon path={getIconSvgPath(iconKey)} size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{p.name}</span>
                    <span className="block text-[12px]" style={{ color: 'var(--text-muted)' }}>
                      {p.category}
                      {p.defaultAmount ? ` · ${p.defaultAmount}` : ''}
                    </span>
                  </span>
                  <button
                    className="tap-scale p-1.5"
                    style={{ color: 'var(--text-muted)' }}
                    onClick={() => setEditing(p)}
                    aria-label={`${p.name} bearbeiten`}
                  >
                    <Icon path={ICON_PATHS.edit} size={18} />
                  </button>
                  <button
                    className="tap-scale p-1.5"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => removeCustomProduct(p.id)}
                    aria-label={`${p.name} löschen`}
                  >
                    <Icon path={ICON_PATHS.trash} size={18} />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        <div
          className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
          style={{ color: 'var(--category-fg)' }}
        >
          Daten
        </div>
        <div className="card-surface mb-3 flex flex-col">
          <button
            className="tap-scale flex items-center gap-3 border-b px-3.5 py-3.5 text-left text-[14px] font-semibold"
            style={{ borderColor: 'var(--border)' }}
            onClick={handleExportBackup}
          >
            <Icon path={ICON_PATHS.share} size={18} />
            Sicherung exportieren
          </button>
          <button
            className="tap-scale flex items-center gap-3 px-3.5 py-3.5 text-left text-[14px] font-semibold"
            onClick={handleImportClick}
          >
            <Icon path={ICON_PATHS.import} size={18} />
            Sicherung einspielen
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />
        {backupMessage && (
          <p className="mb-3 px-1.5 text-[12px]" style={{ color: 'var(--danger)' }}>
            {backupMessage}
          </p>
        )}
        <button
          className="btn-soft w-full py-3.5 text-[14px]"
          style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
          onClick={() => {
            if (window.confirm('Wirklich alle Daten (Listen, Vorrat, Produkte, Statistik) löschen?')) {
              resetAll()
            }
          }}
        >
          Alle Daten zurücksetzen
        </button>

        <p className="mt-6 text-center text-[12px]" style={{ color: 'var(--text-muted)' }}>
          AlexShop · alle Daten bleiben lokal auf deinem Gerät gespeichert
        </p>
      </main>

      {editing && <EditCustomProductSheet product={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
