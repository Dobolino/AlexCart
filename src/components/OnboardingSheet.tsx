import { Sheet } from './Sheet'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'

interface OnboardingSheetProps {
  onDone: () => void
}

const STEPS = [
  { icon: ICON_PATHS.plus, title: 'Artikel & Rezepte', text: 'Suche Produkte, importiere Wochenpläne oder füge Rezept-Zutaten ein.' },
  { icon: ICON_PATHS.shopping, title: 'Einkaufsmodus', text: 'Tippe die Einkaufstasche für grosse Karten – ideal im Supermarkt.' },
  { icon: ICON_PATHS.check, title: 'Abhaken & Preise', text: 'Wisch oder tippe zum Abhaken. Optional Preis erfassen für Budget & Statistik.' },
  { icon: ICON_PATHS.pantry, title: 'Vorrat', text: 'Mindestbestände pflegen – die App schlägt Nachkauf vor.' },
  { icon: ICON_PATHS.calculator, title: 'Budget', text: 'Wochenbudget in den Einstellungen – Fortschritt live in der Liste.' },
  { icon: ICON_PATHS.chart, title: 'Gewohnheiten', text: 'Wiederkehrende Artikel und Statistiken lernen dein Einkaufsverhalten.' },
]

export function OnboardingSheet({ onDone }: OnboardingSheetProps) {
  return (
    <Sheet onClose={onDone}>
      <h2 className="font-display mb-1 text-xl font-bold">Willkommen bei AlexShop</h2>
      <p className="mb-4 text-[14px]" style={{ color: 'var(--text-muted)' }}>
        Dein persönlicher Einkaufsassistent – die wichtigsten Funktionen auf einen Blick.
      </p>
      <div className="flex max-h-[50vh] flex-col gap-2.5 overflow-y-auto overscroll-contain">
        {STEPS.map((step) => (
          <div key={step.title} className="glass-card flex items-start gap-3 px-3.5 py-3">
            <div
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full"
              style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
            >
              <Icon path={step.icon} size={18} />
            </div>
            <div>
              <div className="text-[14px] font-bold">{step.title}</div>
              <div className="mt-0.5 text-[12px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                {step.text}
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-primary tap-scale mt-4 w-full rounded-xl py-3.5 text-[15px]" onClick={onDone}>
        Los geht&apos;s
      </button>
    </Sheet>
  )
}
