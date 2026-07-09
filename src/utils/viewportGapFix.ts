/**
 * On this iOS standalone PWA (confirmed via on-device diagnostics), the reported
 * layout viewport (window.visualViewport.height / window.innerHeight) is up to
 * ~60pt shorter than the device's true screen height, while WebKit still paints
 * the full screen. .app-shell's `position:fixed; inset:0` binds to the short,
 * reported viewport, so the extra height at the bottom is left unpainted (black).
 * window.screen.height/width, by contrast, correctly reports the true device
 * size - we measure the gap against that and stretch .app-shell past the
 * reported viewport bottom by exactly that amount to cover it.
 */
export function installViewportGapFix(): void {
  const root = document.documentElement

  const update = () => {
    const vv = window.visualViewport
    const layoutHeight = vv?.height ?? window.innerHeight
    const isPortrait = window.matchMedia('(orientation: portrait)').matches
    const trueHeight = isPortrait
      ? Math.max(window.screen.width, window.screen.height)
      : Math.min(window.screen.width, window.screen.height)
    const gap = Math.max(0, Math.round(trueHeight - layoutHeight))
    root.style.setProperty('--bottom-viewport-gap', `${gap}px`)
  }

  update()
  window.addEventListener('resize', update)
  window.addEventListener('orientationchange', update)
  window.visualViewport?.addEventListener('resize', update)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') update()
  })
}
