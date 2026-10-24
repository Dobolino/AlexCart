import { useEffect, useState } from 'react'
import type { ShoppingSession } from '@/types'
import { activeShoppingDurationMs, formatShoppingDuration } from '@/utils/shoppingDuration'

export function ShoppingClock({ session }: { session: ShoppingSession }) {
  const [now, setNow] = useState(Date.now)
  const paused = session.pausedAt !== undefined
  useEffect(() => {
    if (paused) return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [paused])
  return <>{formatShoppingDuration(activeShoppingDurationMs(session, now))}</>
}
