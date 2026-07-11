import { useEffect, useRef, useState } from 'react'

/** Hält den Bildschirm während des Einkaufsmodus an (Screen Wake Lock API). */
export function useWakeLock(enabled: boolean): boolean {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)
  const [active, setActive] = useState(false)

  useEffect(() => {
    // `active` is already false initially, and any prior lock was already released (and
    // `active` reset to false) by this effect's own cleanup when `enabled` last changed -
    // so there's nothing to reset here, just nothing to acquire.
    if (!enabled || !('wakeLock' in navigator)) return

    let cancelled = false

    async function acquire() {
      if (cancelled || document.visibilityState !== 'visible') return
      if (sentinelRef.current) return
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await lock.release()
          return
        }
        sentinelRef.current = lock
        setActive(true)
        lock.addEventListener('release', () => {
          if (sentinelRef.current === lock) {
            sentinelRef.current = null
            setActive(false)
          }
        })
      } catch {
        setActive(false)
        /* Nicht unterstützt, Low Power Mode oder keine User-Geste */
      }
    }

    function release() {
      const lock = sentinelRef.current
      sentinelRef.current = null
      setActive(false)
      lock?.release().catch(() => {})
    }

    void acquire()

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') void acquire()
    }

    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      release()
    }
  }, [enabled])

  return active
}
