import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { installStandaloneViewportFix } from './utils/standaloneViewport'
import './index.css'

installStandaloneViewportFix()

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
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
