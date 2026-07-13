import { normalize } from './text'
import { todayKey } from './date'
import type { CompletedTrip } from '@/types'

/** Normalisierter Produktname → Zeitstempel des letzten Kaufs (completedAt). */
export function buildLastPurchaseIndex(trips: CompletedTrip[]): Map<string, number> {
  const index = new Map<string, number>()
  for (const trip of trips) {
    const at = trip.completedAt
    for (const item of trip.items) {
      const key = normalize(item.name)
      if (!key) continue
      const existing = index.get(key)
      if (existing === undefined || at > existing) {
        index.set(key, at)
      }
    }
  }
  return index
}

function dateKeyFromTimestamp(ts: number): string {
  return new Date(ts).toLocaleDateString('sv-SE')
}

/** Kalendertage zwischen Kaufdatum und heute (0 = heute). */
export function daysSincePurchase(completedAt: number, today = todayKey()): number {
  const purchaseDay = dateKeyFromTimestamp(completedAt)
  const from = new Date(`${purchaseDay}T12:00:00`)
  const to = new Date(`${today}T12:00:00`)
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 86_400_000))
}

export function formatLastPurchasedHint(daysAgo: number): string {
  if (daysAgo <= 0) return 'Heute bereits gekauft'
  if (daysAgo === 1) return 'Zuletzt gekauft: gestern'
  return `Zuletzt gekauft: vor ${daysAgo} Tagen`
}

/** Liefert den Anzeige-Hinweis oder `null`, wenn das Produkt noch nie gekauft wurde. */
export function lastPurchasedHintForName(
  name: string,
  index: Map<string, number>,
  today = todayKey()
): string | null {
  const completedAt = index.get(normalize(name))
  if (completedAt === undefined) return null
  return formatLastPurchasedHint(daysSincePurchase(completedAt, today))
}
