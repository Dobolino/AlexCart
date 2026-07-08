import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

const HYDRATION_TIMEOUT_MS = 5000

/** Stellt sicher, dass der persistierte Store geladen wird – blockiert die UI nicht. */
export function useEnsureStoreHydration(): void {
  useEffect(() => {
    if (useStore.persist.hasHydrated()) return

    const unsub = useStore.persist.onFinishHydration(() => {
      useStore.getState().ensureCalculatorDay()
      unsub()
    })

    const timeout = window.setTimeout(() => {
      if (useStore.persist.hasHydrated()) return
      console.warn('AlexShop: Store-Rehydration dauert ungewöhnlich lange – UI läuft weiter')
      void useStore.persist.rehydrate()
    }, HYDRATION_TIMEOUT_MS)

    const rehydrate = useStore.persist.rehydrate()
    if (rehydrate instanceof Promise) {
      void rehydrate.catch((err: unknown) => {
        console.error('AlexShop: Store-Rehydration fehlgeschlagen', err)
      })
    }

    return () => {
      unsub()
      window.clearTimeout(timeout)
    }
  }, [])
}
