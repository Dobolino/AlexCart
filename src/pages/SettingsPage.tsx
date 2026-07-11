import { useRef, useState } from 'react'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { EditCustomProductSheet } from '@/components/EditCustomProductSheet'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'
import { getIconKey } from '@/utils/icon'
import { ProductIcon } from '@/components/product-icons/ProductIcon'
import { getCategoryColor } from '@/utils/categoryColor'
import { parseMoneyInput, currencySymbol } from '@/utils/currency'
import { readBackupJSON, restoreBackupJSON, backupFilename, shareOrDownloadBackup } from '@/utils/backup'
import { getStorageInfo } from '@/utils/storageInfo'
import { PriceProfilesSettingsSection } from '@/components/PriceProfilesSettingsSection'
import type { Currency, CustomProduct, Theme } from '@/types'

type SettingsTab = 'general' | 'prices'

const SETTINGS_TABS: { value: SettingsTab; label: string }[] = [
  { value: 'general', label: 'Allgemein' },
  { value: 'prices', label: 'Preise & Marken' },
]

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'System' },
]

const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'CHF', label: 'CHF (Schweiz)' },
  { value: 'EUR', label: 'EUR (Deutschland)' },
]

export function SettingsPage() {
  const theme = useStore((s) => s.settings.theme)
  const askPriceOnCheckoff = useStore((s) => s.settings.askPriceOnCheckoff)
  const weeklyBudget = useStore((s) => s.settings.weeklyBudget)
  const currency = useStore((s) => s.settings.currency)
  const setTheme = useStore((s) => s.setTheme)
  const setAskPriceOnCheckoff = useStore((s) => s.setAskPriceOnCheckoff)
  const setWeeklyBudget = useStore((s) => s.setWeeklyBudget)
  const setCurrency = useStore((s) => s.setCurrency)
  const resetAll = useStore((s) => s.resetAll)
  const customProducts = useStore((s) => s.customProducts)
  const removeCustomProduct = useStore((s) => s.removeCustomProduct)
  const [editing, setEditing] = useState<CustomProduct | null>(null)
  const [backupMessage, setBackupMessage] = useState('')
  const [budgetInput, setBudgetInput] = useState(weeklyBudget > 0 ? String(weeklyBudget) : '')
  const [storageCopied, setStorageCopied] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab>('general')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const storageInfo = getStorageInfo()

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

  function saveBudgetInput() {
    const parsed = parseMoneyInput(budgetInput)
    setWeeklyBudget(parsed ?? 0)
    setBudgetInput(parsed ? String(parsed) : '')
  }

  async function copyStoragePath() {
    const text = storageInfo.storagePath
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      setStorageCopied(true)
      setTimeout(() => setStorageCopied(false), 2000)
    } catch {
      setBackupMessage('Pfad konnte nicht kopiert werden.')
    }
  }

  const BUDGET_PRESETS = [100, 150, 200, 250]

  return (
    <>
      <PageHeader title="Einstellungen" subtitle="Design, Preise & Daten" />
      <main className="scroll-behind-nav min-h-0 flex-1 overflow-y-auto px-3 pt-3">
        <div className="glass-card mb-4.5 flex p-1.5">
          {SETTINGS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className="tap-scale flex-1 rounded-xl py-2.5 text-[13px] font-bold"
              style={{
                background: settingsTab === tab.value ? 'var(--accent)' : 'transparent',
                color: settingsTab === tab.value ? 'var(--accent-fg)' : 'var(--text)',
              }}
              onClick={() => setSettingsTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {settingsTab === 'prices' ? (
          <PriceProfilesSettingsSection />
        ) : (
          <>
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
          Einkauf
        </div>
        <div className="card-surface mb-4.5 px-3.5 py-3.5">
          <span className="block text-[15px] font-semibold">Währung</span>
          <span className="mb-3 block text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Für Preise, Budget und Rechner – z. B. CHF in der Schweiz, EUR in Deutschland
          </span>
          <div className="flex gap-2">
            {CURRENCY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="tap-scale flex-1 rounded-xl py-2.5 text-[13px] font-bold"
                style={{
                  background: currency === opt.value ? 'var(--accent-soft)' : 'var(--chip-bg)',
                  color: currency === opt.value ? 'var(--accent)' : 'var(--text)',
                  outline: currency === opt.value ? '2px solid var(--accent)' : 'none',
                }}
                onClick={() => setCurrency(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <label className="mt-4 flex items-center justify-between gap-3 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <span>
              <span className="block text-[15px] font-semibold">Preis beim Abhaken</span>
              <span className="block text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Preis direkt erfassen – sonst über den Toast nachträglich
              </span>
            </span>
            <button
              type="button"
              className="tap-scale relative h-7 w-12 flex-none rounded-full transition-colors"
              style={{ background: askPriceOnCheckoff ? 'var(--accent)' : 'var(--chip-bg)' }}
              onClick={() => setAskPriceOnCheckoff(!askPriceOnCheckoff)}
              aria-label="Preis beim Abhaken umschalten"
              aria-pressed={askPriceOnCheckoff}
            >
              <span
                className="absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform"
                style={{ left: askPriceOnCheckoff ? '22px' : '2px' }}
              />
            </button>
          </label>
          <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--border)' }}>
            <span className="block text-[15px] font-semibold">Wochenbudget</span>
            <span className="mb-2 block text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Ausgaben der aktuellen Kalenderwoche (Montag–Sonntag) im Listen-Header verfolgen
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold" style={{ color: 'var(--text-muted)' }}>
                {currencySymbol(currency)}
              </span>
              <input
                type="text"
                inputMode="decimal"
                className="input flex-1 py-2 text-[15px]"
                placeholder="z. B. 150"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                onBlur={saveBudgetInput}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveBudgetInput()
                }}
              />
            </div>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {BUDGET_PRESETS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className="tap-scale rounded-full px-3 py-1.5 text-[12px] font-bold"
                  style={{
                    background: weeklyBudget === amount ? 'var(--accent-soft)' : 'var(--chip-bg)',
                    color: weeklyBudget === amount ? 'var(--accent)' : 'var(--text)',
                    outline: weeklyBudget === amount ? '2px solid var(--accent)' : 'none',
                  }}
                  onClick={() => {
                    setWeeklyBudget(amount)
                    setBudgetInput(String(amount))
                  }}
                >
                  {amount}
                </button>
              ))}
              {weeklyBudget > 0 && (
                <button
                  type="button"
                  className="tap-scale rounded-full px-3 py-1.5 text-[12px] font-bold"
                  style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}
                  onClick={() => {
                    setWeeklyBudget(0)
                    setBudgetInput('')
                  }}
                >
                  Aus
                </button>
              )}
            </div>
          </div>
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
                    <ProductIcon iconKey={iconKey} size={20} />
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
        <div className="card-surface mb-3 px-3.5 py-3.5">
          <span className="block text-[15px] font-semibold">Speicherort</span>
          <span className="mb-2 block text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Die App speichert alles lokal im Browser – kein Server, kein echter Dateipfad auf dem Gerät.
          </span>
          <div
            className="mb-2 rounded-xl px-3 py-2.5 font-mono text-[11px] leading-relaxed break-all"
            style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
          >
            {storageInfo.storagePath}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            <span>Belegung: {storageInfo.sizeLabel}</span>
            {storageInfo.legacyKeysPresent.length > 0 && (
              <span>· Legacy: {storageInfo.legacyKeysPresent.join(', ')}</span>
            )}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              type="button"
              className="tap-scale rounded-full px-3 py-1.5 text-[12px] font-bold"
              style={{ background: 'var(--chip-bg)', color: 'var(--text)' }}
              onClick={() => void copyStoragePath()}
            >
              {storageCopied ? 'Kopiert' : 'Pfad kopieren'}
            </button>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Export-Dateiname: {storageInfo.exportFilenamePattern} (z. B. {backupFilename()})
          </p>
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
          </>
        )}
      </main>

      {editing && <EditCustomProductSheet product={editing} onClose={() => setEditing(null)} />}
    </>
  )
}
