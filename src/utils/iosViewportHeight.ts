/**
 * iOS Standalone-PWA: WebKit meldet layout/viewport-Höhe oft ~safe-area-inset-top
 * zu kurz (z. B. innerHeight 894 bei screen.height 956). Mit black-translucent
 * liegt der fehlende Streifen außerhalb des paintbaren Viewports – CSS-Stretch
 * reicht nicht, position:fixed am Root clippt zusätzlich.
 *
 * Fix: --app-h auf die physische Höhe setzen (innerHeight + safe-top, bzw.
 * screen.height als Fallback). Zusätzlich apple-mobile-web-app-status-bar-style
 * auf "default" (wird erst bei Neu-Installation wirksam).
 */

let safeTopProbe: HTMLDivElement | null = null

function isStandalonePwa(): boolean {
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return nav.standalone === true || window.matchMedia('(display-mode: standalone)').matches
}

function measureSafeAreaTop(): number {
  if (!safeTopProbe) {
    safeTopProbe = document.createElement('div')
    safeTopProbe.id = 'ios-safe-top-probe'
    safeTopProbe.setAttribute('aria-hidden', 'true')
    safeTopProbe.style.cssText =
      'position:fixed;top:0;left:0;padding-top:env(safe-area-inset-top);visibility:hidden;pointer-events:none'
    document.documentElement.appendChild(safeTopProbe)
  }
  return parseFloat(getComputedStyle(safeTopProbe).paddingTop) || 0
}

function portraitScreenHeight(): number {
  return Math.max(window.screen.width, window.screen.height)
}

export function applyIosViewportHeight(): void {
  const root = document.documentElement

  if (!isStandalonePwa()) {
    root.style.removeProperty('--app-h')
    return
  }

  const layoutHeight = window.visualViewport?.height ?? window.innerHeight
  const trueHeight = portraitScreenHeight()
  const safeTop = measureSafeAreaTop()
  const gap = Math.max(0, Math.round(trueHeight - layoutHeight))

  // Signatur des WebKit-Bugs: fehlende Höhe ≈ safe-area-inset-top
  if (gap > 8 && safeTop > 0 && Math.abs(gap - safeTop) <= 8) {
    root.style.setProperty('--app-h', `${Math.round(layoutHeight + safeTop)}px`)
    return
  }

  if (gap > 8) {
    root.style.setProperty('--app-h', `${trueHeight}px`)
    return
  }

  root.style.setProperty('--app-h', `${Math.round(layoutHeight)}px`)
}

/** Versucht WebKit-„Docking“ (wie beim manuellen Scrollen/Drehen) zu triggern. */
function tryViewportDocking(): void {
  if (!isStandalonePwa()) return

  const html = document.documentElement
  const prevOverflow = html.style.overflow
  const prevHeight = html.style.height

  html.style.overflow = 'auto'
  html.style.height = 'calc(100% + 1px)'

  window.scrollTo(0, 1)
  requestAnimationFrame(() => {
    window.scrollTo(0, 0)
    html.style.overflow = prevOverflow
    html.style.height = prevHeight
    applyIosViewportHeight()
  })
}

export function installIosViewportHeight(): () => void {
  applyIosViewportHeight()
  tryViewportDocking()

  const refresh = () => applyIosViewportHeight()
  window.addEventListener('resize', refresh)
  window.addEventListener('orientationchange', refresh)
  window.visualViewport?.addEventListener('resize', refresh)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      applyIosViewportHeight()
      tryViewportDocking()
    }
  })

  const retryMs = [50, 150, 300, 500, 800, 1200]
  const timers = retryMs.map((ms) => window.setTimeout(refresh, ms))

  return () => {
    window.removeEventListener('resize', refresh)
    window.removeEventListener('orientationchange', refresh)
    window.visualViewport?.removeEventListener('resize', refresh)
    timers.forEach(clearTimeout)
    safeTopProbe?.remove()
    safeTopProbe = null
  }
}
