import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'

interface OnboardingSheetProps {
  onDone: () => void
}

const STEPS = [
  { icon: ICON_PATHS.plus, title: 'Artikel hinzufügen', text: 'Tippe unten auf + oder suche Produkte per Name.' },
  { icon: ICON_PATHS.check, title: 'Abhaken', text: 'Tippe eine Zeile oder wisch nach rechts, um Artikel abzuhaken.' },
  { icon: ICON_PATHS.drag, title: 'Sortieren', text: 'Halte das Griff-Symbol und ziehe, um die Reihenfolge zu ändern.' },
  { icon: ICON_PATHS.palette, title: 'Ansicht wechseln', text: 'Zwischen Listen- und Kachel-Ansicht oben rechts umschalten.' },
]

export function OnboardingSheet({ onDone }: OnboardingSheetProps) {
  return (
    <Sheet onClose={onDone}>
      <h2 className="font-display mb-1 text-xl font-bold">So funktioniert&apos;s</h2>
      <p className="mb-4 text-[14px]" style={{ color: 'var(--text-muted)' }}>
        AlexShop in vier Schritten – danach kannst du direkt loslegen.
      </p>
      <div className="flex flex-col gap-3">
        {STEPS.map((step) => (
          <div key={step.title} className="glass-card flex items-start gap-3.5 px-3.5 py-3.5">
            <div
              className="flex h-10 w-10 flex-none items-center justify-center rounded-full"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Icon path={step.icon} size={20} />
            </div>
            <div>
              <div className="text-[15px] font-bold">{step.title}</div>
              <div className="mt-0.5 text-[13px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                {step.text}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-primary tap-scale mt-5 w-full rounded-xl py-3.5 text-[15px]" onClick={onDone}>
        Los geht&apos;s
      </button>
    </Sheet>
  )
}
