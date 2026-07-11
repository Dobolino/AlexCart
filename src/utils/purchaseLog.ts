import type { PurchaseLogEntry, ShoppingItem } from '@/types'
import { todayKey } from '@/utils/date'

/** Stabile ID – Legacy-Einträge ohne id bekommen einen Index-basierten Schlüssel. */
export function purchaseLogEntryId(entry: PurchaseLogEntry, index = 0): string {
  return entry.id || `legacy:${entry.date}|${entry.name}|${entry.category}|${index}`
}

/** Heutige Einträge mit erfasstem Preis (optional ohne Rechner-ausgeblendete). */
export function todayPricedEntries(
  purchaseLog: PurchaseLogEntry[],
  today: string = todayKey(),
  excludedIds: ReadonlySet<string> = new Set()
): PurchaseLogEntry[] {
  return purchaseLog.filter(
    (e, i) =>
      e.date === today &&
      (e.price ?? 0) > 0 &&
      !excludedIds.has(purchaseLogEntryId(e, i))
  )
}

export function todayPricedTotal(
  purchaseLog: PurchaseLogEntry[],
  today: string = todayKey(),
  excludedIds: ReadonlySet<string> = new Set()
): number {
  return Math.round(
    todayPricedEntries(purchaseLog, today, excludedIds).reduce((sum, e) => sum + (e.price ?? 0), 0) * 100
  ) / 100
}

/** Summe der heute abgehakten Artikel auf einer bestimmten Liste. */
export function todayPricedTotalForList(
  purchaseLog: PurchaseLogEntry[],
  listItems: ShoppingItem[],
  today: string = todayKey(),
  excludedIds: ReadonlySet<string> = new Set()
): number {
  const done = listItems.filter((i) => i.done)
  const total = purchaseLog
    .filter(
      (e, i) =>
        e.date === today &&
        (e.price ?? 0) > 0 &&
        !excludedIds.has(purchaseLogEntryId(e, i)) &&
        done.some((item) => item.name === e.name && item.category === e.category)
    )
    .reduce((sum, e) => sum + (e.price ?? 0), 0)
  return Math.round(total * 100) / 100
}

/** IDs heutiger Preis-Einträge für den Rechner ausblenden (Statistik bleibt erhalten). */
export function idsToExcludeTodayPricedCheckoffs(
  purchaseLog: PurchaseLogEntry[],
  today: string = todayKey()
): string[] {
  return purchaseLog
    .filter((e) => e.date === today && (e.price ?? 0) > 0)
    .map((e, i) => purchaseLogEntryId(e, i))
}

/** IDs heutiger Preis-Einträge einer Liste für den Rechner ausblenden. */
export function idsToExcludeTodayPricedCheckoffsForList(
  purchaseLog: PurchaseLogEntry[],
  listItems: ShoppingItem[],
  today: string = todayKey()
): string[] {
  const done = listItems.filter((i) => i.done)
  return purchaseLog
    .map((e, i) => ({ e, i }))
    .filter(
      ({ e }) =>
        e.date === today &&
        (e.price ?? 0) > 0 &&
        done.some((item) => item.name === e.name && item.category === e.category)
    )
    .map(({ e, i }) => purchaseLogEntryId(e, i))
}

/** Entfernt den heutigen Kauf-Eintrag für name/category (z. B. beim Abhaken rückgängig). */
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
  items: { name: string; category: string; done: boolean }[],
  today: string = todayKey()
): PurchaseLogEntry[] {
  return items.reduce(
    (log, item) => (item.done ? removeTodayPurchaseLogEntry(log, item.name, item.category, today) : log),
    purchaseLog
  )
}
