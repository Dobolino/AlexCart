import { useState } from 'react'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

const VISITS_KEY = 'alexshop-visits'
/** Erst ab dem dritten App-Start zeigen – beim ersten Kennenlernen stört der Hinweis nur. */
const MIN_VISITS = 3

/** Zählt App-Starts (einmal pro Browser-Sitzung) und liefert den aktuellen Stand. */
function countVisit(): number {
  try {
    let visits = Number(localStorage.getItem(VISITS_KEY)) || 0
    if (!sessionStorage.getItem(VISITS_KEY)) {
      visits += 1
      localStorage.setItem(VISITS_KEY, String(visits))
      sessionStorage.setItem(VISITS_KEY, '1')
    }
    return visits
  } catch {
    return 0
  }
}

/** Dezenter, einzeiliger Hinweis zum Installieren der PWA (nur iOS-Safari, ab dem 3. Start). */
export function InstallPrompt() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('alexshop-install-dismissed') === '1'
    } catch {
      return true
    }
  })
  const [visits] = useState(countVisit)

  if (dismissed || visits < MIN_VISITS || isStandalone() || !isIos()) return null

  function dismiss() {
    try {
      localStorage.setItem('alexshop-install-dismissed', '1')
    } catch {
      /* ignore */
    }
    setDismissed(true)
  }

  return (
    <div
      className="mx-3 mb-2 flex items-center gap-2 rounded-xl py-1 pl-3 pr-1"
      style={{ background: 'var(--accent-soft)' }}
    >
      <Icon path={ICON_PATHS.plus} size={14} />
      <p className="min-w-0 flex-1 text-[12px] leading-snug">
        <span className="font-bold">Als App installieren:</span>{' '}
        <span style={{ color: 'var(--text-muted)' }}>Teilen → „Zum Home-Bildschirm“</span>
      </p>
      <button
        className="tap-scale flex h-11 w-11 flex-none items-center justify-center"
        style={{ color: 'var(--text-muted)' }}
        onClick={dismiss}
        aria-label="Hinweis schliessen"
      >
        <Icon path={ICON_PATHS.close} size={16} />
      </button>
    </div>
  )
}
