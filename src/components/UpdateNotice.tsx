import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { useLocation } from 'react-router-dom'
import { useStore } from '@/store/useStore'

let update: ((reload?: boolean) => Promise<void>) | undefined
export function UpdateNotice() {
  const [available, setAvailable] = useState(false)
  const session = useStore((s) => s.shoppingSession)
  const { pathname } = useLocation()
  const shopping = session !== null && pathname === '/shop'
  useEffect(() => {
    if (!import.meta.env.PROD) return
    update = registerSW({
      immediate: true,
      onNeedRefresh: () => setAvailable(true),
      onRegisteredSW(_url, registration) {
        if (!registration) return
        const check = () => {
          if (document.visibilityState === 'visible') void registration.update().catch(() => {})
        }
        document.addEventListener('visibilitychange', check)
      },
    })
  }, [])
  if (!available) return null
  return (
    <aside role="status" className="storage-notice">
      {shopping
        ? 'Ein Update ist bereit. Wechsle zur Liste, um es zu laden. Dein Einkauf bleibt gespeichert.'
        : 'Eine neue Version ist bereit.'}
      {!shopping && (
        <button
          className="btn-soft ml-2 min-h-11 px-3"
          onClick={() => {
            if (!document.querySelector('dialog[open]')) void update?.(true)
          }}
        >
          Update laden
        </button>
      )}
    </aside>
  )
}
