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
        done.some((item) => matchesListItem(e, item))
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
        done.some((item) => matchesListItem(e, item))
    )
    .map(({ e, i }) => purchaseLogEntryId(e, i))
}

export function matchesListItem(
  entry: PurchaseLogEntry,
  item: { id: string; name: string; category: string }
): boolean {
  if (entry.itemId) return entry.itemId === item.id
  return entry.name === item.name && entry.category === item.category
}

/** Quittungs-Zeilen für die in DIESER Einkaufssitzung abgehakten Artikel (nach IDs), für
 *  CompletedTrip beim Abschluss. Dedupliziert, ignoriert gelöschte Artikel, Preis optional.
 *  So landen keine Reste früherer Einkäufe (alte „done"-Artikel) in der Quittung. */
export function receiptItemsForSession(
  purchaseLog: PurchaseLogEntry[],
  listItems: ShoppingItem[],
  checkedItemIds: string[],
  today: string = todayKey()
): { id: string; name: string; amount: string; price?: number }[] {
  const byId = new Map(listItems.map((i) => [i.id, i]))
  const seen = new Set<string>()
  const out: { id: string; name: string; amount: string; price?: number }[] = []
  for (const id of checkedItemIds) {
    if (seen.has(id)) continue
    seen.add(id)
    const item = byId.get(id)
    if (!item) continue
    const entry = purchaseLog.find((e) => e.date === today && matchesListItem(e, item))
    const price = entry?.price && entry.price > 0 ? entry.price : undefined
    out.push({ id: item.id, name: item.name, amount: item.amount, price })
  }
  return out
}

/** Entfernt den heutigen Kauf-Eintrag für name/category (z. B. beim Abhaken rückgängig). */
export function removeTodayPurchaseLogEntry(
  purchaseLog: PurchaseLogEntry[],
  name: string,
  category: string,
  today: string = todayKey(),
  itemId?: string
): PurchaseLogEntry[] {
  let idx = -1
  for (let i = purchaseLog.length - 1; i >= 0; i--) {
    const e = purchaseLog[i]!
    if (e.date !== today) continue
    if (itemId && e.itemId === itemId) {
      idx = i
      break
    }
    if (!itemId && e.name === name && e.category === category && !e.itemId) {
      idx = i
      break
    }
  }
  if (idx < 0) return purchaseLog
  return purchaseLog.filter((_, i) => i !== idx)
}

/** Passt Kauf-Einträge an, wenn ein Listen-Artikel umbenannt oder umkategorisiert wird. */
export function syncPurchaseLogForItemRename(
  purchaseLog: PurchaseLogEntry[],
  itemId: string,
  oldName: string,
  oldCategory: string,
  patch: { name?: string; category?: string },
  today: string = todayKey()
): PurchaseLogEntry[] {
  const newName = patch.name?.trim() || oldName
  const newCategory = patch.category || oldCategory
  if (newName === oldName && newCategory === oldCategory) return purchaseLog

  return purchaseLog.map((entry) => {
    const linked =
      entry.itemId === itemId ||
      (!entry.itemId &&
        entry.date === today &&
        entry.name === oldName &&
        entry.category === oldCategory)
    if (!linked) return entry
    return { ...entry, itemId, name: newName, category: newCategory }
  })
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
