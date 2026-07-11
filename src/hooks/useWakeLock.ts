import { useEffect, useRef } from 'react'

/** Hält den Bildschirm während des Einkaufsmodus an (Screen Wake Lock API). */
export function useWakeLock(enabled: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
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
        lock.addEventListener('release', () => {
          if (sentinelRef.current === lock) sentinelRef.current = null
        })
      } catch {
        /* Nicht unterstützt, Low Power Mode oder keine User-Geste */
      }
    }

    function release() {
      const lock = sentinelRef.current
      sentinelRef.current = null
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
}
