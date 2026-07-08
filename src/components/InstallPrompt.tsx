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

/** Dezenter Hinweis zum Installieren der PWA (vor allem iOS). */
export function InstallPrompt() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('alexshop-install-dismissed') === '1'
    } catch {
      return true
    }
  })

  if (dismissed || isStandalone() || !isIos()) return null

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
      className="mx-3 mb-2 flex items-start gap-3 rounded-2xl px-3.5 py-3"
      style={{ background: 'var(--accent-soft)' }}
    >
      <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full" style={{ background: 'var(--surface)' }}>
        <Icon path={ICON_PATHS.plus} size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-bold">App installieren</div>
        <p className="mt-0.5 text-[12px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          Tippe in Safari auf Teilen und dann „Zum Home-Bildschirm“, für Vollbild und Offline-Nutzung.
        </p>
      </div>
      <button
        className="tap-scale flex-none text-[12px] font-bold"
        style={{ color: 'var(--text-muted)' }}
        onClick={dismiss}
        aria-label="Hinweis schliessen"
      >
        <Icon path={ICON_PATHS.close} size={16} />
      </button>
    </div>
  )
}
