import { useEffect, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'
import { useStore } from '@/store/useStore'

let update: ((reload?: boolean) => Promise<void>) | undefined
export function UpdateNotice() {
  const [available, setAvailable] = useState(false)
  const shopping = useStore((s) => s.shoppingSession !== null)
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
        ? 'Ein Update ist bereit. Du kannst es nach dem Einkauf laden.'
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
