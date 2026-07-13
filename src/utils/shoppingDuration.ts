import type { ShoppingSession } from '@/types'

/** Aktive Einkaufszeit in ms – während Pause steht die Uhr (pausedAt als Referenz). */
export function activeShoppingDurationMs(session: ShoppingSession, now = Date.now()): number {
  const end = session.pausedAt ?? now
  return Math.max(0, end - session.startedAt - session.totalPausedMs)
}

export function isShoppingPaused(session: ShoppingSession | null | undefined): boolean {
  return session?.pausedAt != null
}

/** Anzeige z. B. „23 Min.“ oder „1 Std. 5 Min.“ */
export function formatShoppingDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000)
  if (totalMinutes < 1) return 'unter 1 Min.'
  if (totalMinutes < 60) return `${totalMinutes} Min.`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes > 0 ? `${hours} Std. ${minutes} Min.` : `${hours} Std.`
}
