import { useEffect } from 'react'
import { useStore } from '@/store/useStore'

/** Stellt sicher, dass der persistierte Store geladen wird – blockiert die UI nicht. */
export function useEnsureStoreHydration(): void {
  useEffect(() => {
    if (useStore.persist.hasHydrated()) return

    const unsub = useStore.persist.onFinishHydration(() => unsub())

    const rehydrate = useStore.persist.rehydrate()
    if (rehydrate instanceof Promise) {
      void rehydrate.catch((err: unknown) => {
        console.error('AlexShop: Store-Rehydration fehlgeschlagen', err)
      })
    }

    return unsub
  }, [])
}
