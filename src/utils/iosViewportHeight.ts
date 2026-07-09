/**
 * iOS Standalone: WebKit malt oft nur bis innerHeight/vv.height (z. B. 894pt),
 * obwohl screen.height größer ist (956pt). Layout GRÖSSER als dieser paintbare
 * Bereich schneidet die Nav unten ab – auch wenn getBoundingClientRect stimmt.
 *
 * Lösung: --app-h = gemeldete Viewport-Höhe (innerhalb des paintbaren Frames).
 * Der evtl. sichtbare Streifen darunter ist System-Letterboxing; status-bar-style
 * "default" + Neu-Installation kann innerHeight auf volle Höhe bringen.
 */

function isStandalonePwa(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

function paintableHeight(): number {
  return Math.round(window.visualViewport?.height ?? window.innerHeight)
}

export function applyIosViewportHeight(): void {
  const root = document.documentElement

  if (!isStandalonePwa()) {
    root.style.removeProperty('--app-h')
    return
  }

  root.style.setProperty('--app-h', `${paintableHeight()}px`)
}

export function installIosViewportHeight(): () => void {
  applyIosViewportHeight()

  const refresh = () => applyIosViewportHeight()
  window.addEventListener('resize', refresh)
  window.addEventListener('orientationchange', refresh)
  window.visualViewport?.addEventListener('resize', refresh)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refresh()
  })

  const timers = [50, 150, 300, 500, 800, 1200].map((ms) => window.setTimeout(refresh, ms))

  return () => {
    window.removeEventListener('resize', refresh)
    window.removeEventListener('orientationchange', refresh)
    window.visualViewport?.removeEventListener('resize', refresh)
    timers.forEach(clearTimeout)
  }
}
