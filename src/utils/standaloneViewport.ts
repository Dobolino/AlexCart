/** Erkennt iOS/macOS Standalone-PWA (Add to Home Screen). */
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

/**
 * iOS Standalone meldet 100dvh / innerHeight zu kurz (minus safe-area-inset-top).
 * 100vh entspricht dort der echten Bildschirmhöhe – siehe iOS-PWA-Viewport-Bug.
 */
export function applyStandaloneViewportFix(): void {
  if (!isStandalonePwa()) return
  document.documentElement.style.setProperty('--app-height', '100vh')
}

/** Hält --app-height nach Resume/Rotation auf dem korrekten Wert. */
export function installStandaloneViewportFix(): () => void {
  applyStandaloneViewportFix()

  const refresh = () => applyStandaloneViewportFix()
  window.addEventListener('resize', refresh)
  window.visualViewport?.addEventListener('resize', refresh)
  document.addEventListener('visibilitychange', refresh)

  return () => {
    window.removeEventListener('resize', refresh)
    window.visualViewport?.removeEventListener('resize', refresh)
    document.removeEventListener('visibilitychange', refresh)
  }
}
