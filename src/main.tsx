import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { installIosViewportHeight } from './utils/iosViewportHeight'
import './index.css'

installIosViewportHeight()

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
