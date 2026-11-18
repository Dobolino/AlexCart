import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'

export function MorePage() {
  return (
    <>
      <PageHeader title="Mehr" subtitle="Dein Alltag, deine Einstellungen" />
      <main className="scroll-behind-nav min-h-0 flex-1 overflow-y-auto px-4 pt-3">
        <div className="card-surface more-links">
          {(
            [
              ['/pantry', 'Vorrat', 'Bestände, Haltbarkeit und Rezeptideen', 'pantry'],
              ['/calculator', 'Rechner', 'Einkaufssumme und manuelle Notizen', 'calculator'],
              ['/settings', 'Optionen', 'Preise & Marken, Bonpreis-Archiv, Sicherung und Server', 'settings'],
            ] as const
          ).map(([to, label, detail, icon]) => (
            <Link key={to} to={to} aria-label={label} aria-describedby={`${icon}-detail`}>
              <Icon path={ICON_PATHS[icon]} size={24} />
              <span>
                <strong>{label}</strong>
                <small id={`${icon}-detail`}>{detail}</small>
              </span>
              <Icon path={ICON_PATHS.chevron} size={18} />
            </Link>
          ))}
        </div>
        <p className="mt-4 px-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          Gespeicherte Bons findest du unter Stats. Dort kannst du Preise, Mengen und Datum mit einem Foto
          oder PDF prüfen und korrigieren.
        </p>
        <Link className="btn-soft mt-3 flex min-h-12 items-center justify-center" to="/stats">
          Einkaufsverlauf & Bon-Prüfung
        </Link>
      </main>
    </>
  )
}
