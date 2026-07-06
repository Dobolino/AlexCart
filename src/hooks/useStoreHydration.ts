import { useEffect, useState } from 'react'
import { useStore } from '@/store/useStore'

export function useStoreHydration(): boolean {
  const [hydrated, setHydrated] = useState(useStore.persist.hasHydrated())

  useEffect(() => {
    return useStore.persist.onFinishHydration(() => setHydrated(true))
  }, [])

  return hydrated
}
