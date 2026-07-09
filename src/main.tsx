import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'
import { nudgeViewport } from './utils/nudgeViewport'

nudgeViewport()
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') nudgeViewport()
})

if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return
      // As an installed iOS PWA, the app can stay suspended in memory for a long
      // time and reopening it from the home screen doesn't always trigger a fresh
      // network check - so a new deploy can go unnoticed for a while. Re-check for
      // an update whenever the app regains focus, not just on cold start.
      const checkForUpdate = () => registration.update().catch(() => {})
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      })
      window.addEventListener('pageshow', checkForUpdate)
    },
  })
}

/** HTML-Boot-Loader sofort entfernen – sonst bleibt er bei JS-Fehlern ewig sichtbar. */
function dismissBootSkeleton(): void {
  document.getElementById('boot-skeleton')?.remove()
  document.getElementById('boot-fallback')?.remove()
}

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element #root not found')

dismissBootSkeleton()

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
)
