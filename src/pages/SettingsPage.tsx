import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/PageHeader'
import type { Theme } from '@/types'

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Hell' },
  { value: 'dark', label: 'Dunkel' },
  { value: 'system', label: 'System' },
]

export function SettingsPage() {
  const theme = useStore((s) => s.settings.theme)
  const setTheme = useStore((s) => s.setTheme)
  const resetAll = useStore((s) => s.resetAll)

  return (
    <>
      <PageHeader title="Einstellungen" subtitle="Design & Daten" />
      <main className="flex-1 px-3 pt-3" style={{ paddingBottom: 'calc(90px + var(--safe-bottom))' }}>
        <div
          className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
          style={{ color: 'var(--category-fg)' }}
        >
          Design
        </div>
        <div className="card-surface mb-4.5 flex p-1.5">
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className="flex-1 rounded-xl py-2.5 text-[14px] font-bold"
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
          Daten
        </div>
        <button
          className="w-full rounded-2xl py-3.5 text-[14px] font-bold"
          style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
          onClick={() => {
            if (window.confirm('Wirklich alle Daten (Listen, Vorrat, Statistik, Einstellungen) löschen?')) {
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
    </>
  )
}
