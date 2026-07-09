import type { PurchaseLogEntry, ShoppingItem } from '@/types'
import { todayKey } from '@/utils/date'

/** Heutige Einträge mit erfasstem Preis. */
export function todayPricedEntries(
  purchaseLog: PurchaseLogEntry[],
  today: string = todayKey()
): PurchaseLogEntry[] {
  return purchaseLog.filter((e) => e.date === today && (e.price ?? 0) > 0)
}

export function todayPricedTotal(
  purchaseLog: PurchaseLogEntry[],
  today: string = todayKey()
): number {
  return Math.round(todayPricedEntries(purchaseLog, today).reduce((sum, e) => sum + (e.price ?? 0), 0) * 100) / 100
}

/** Summe der heute abgehakten Artikel auf einer bestimmten Liste. */
export function todayPricedTotalForList(
  purchaseLog: PurchaseLogEntry[],
  listItems: ShoppingItem[],
  today: string = todayKey()
): number {
  const done = listItems.filter((i) => i.done)
  const total = purchaseLog
    .filter(
      (e) =>
        e.date === today &&
        (e.price ?? 0) > 0 &&
        done.some((i) => i.name === e.name && i.category === e.category)
    )
    .reduce((sum, e) => sum + (e.price ?? 0), 0)
  return Math.round(total * 100) / 100
}

/** Entfernt alle heutigen Preis-Einträge (Rechner „Aus Liste abgehakt“). */
export function removeAllTodayPricedCheckoffs(
  purchaseLog: PurchaseLogEntry[],
  today: string = todayKey()
): PurchaseLogEntry[] {
  return purchaseLog.filter((e) => !(e.date === today && (e.price ?? 0) > 0))
}

/** Entfernt heutige Preis-Einträge nur für erledigte Artikel einer Liste. */
export function removeTodayPricedCheckoffsForList(
  purchaseLog: PurchaseLogEntry[],
  listItems: ShoppingItem[],
  today: string = todayKey()
): PurchaseLogEntry[] {
  const done = listItems.filter((i) => i.done)
  return purchaseLog.filter((e) => {
    if (e.date !== today || !(e.price && e.price > 0)) return true
    return !done.some((i) => i.name === e.name && i.category === e.category)
  })
}

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
