import type { PurchaseLogEntry } from '@/types'
import { todayKey } from '@/utils/date'

/** Entfernt den heutigen Kauf-Eintrag für name/category (z. B. beim Löschen abgehakter Artikel). */
export function removeTodayPurchaseLogEntry(
  purchaseLog: PurchaseLogEntry[],
  name: string,
  category: string,
  today: string = todayKey()
): PurchaseLogEntry[] {
  let idx = -1
  for (let i = purchaseLog.length - 1; i >= 0; i--) {
    const e = purchaseLog[i]!
    if (e.name === name && e.category === category && e.date === today) {
      idx = i
      break
    }
  }
  if (idx < 0) return purchaseLog
  return purchaseLog.filter((_, i) => i !== idx)
}

/** Entfernt heutige Kauf-Einträge für mehrere abgehakte Artikel. */
export function removeTodayPurchaseLogEntriesForItems(
  purchaseLog: PurchaseLogEntry[],
  items: { name: string; category: string; done: boolean }[]
): PurchaseLogEntry[] {
  return items.reduce(
    (log, item) => (item.done ? removeTodayPurchaseLogEntry(log, item.name, item.category) : log),
    purchaseLog
  )
}
