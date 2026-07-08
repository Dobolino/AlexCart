import { normalize } from './text'
import { uid } from './id'
import type { CustomProduct, PantryItem, PurchaseLogEntry, ShoppingItem, ShoppingList } from '@/types'

/** Montag und Sonntag der vorherigen Kalenderwoche (YYYY-MM-DD, lokale Zeit). */
export function previousWeekRange(reference = new Date()): { start: string; end: string } {
  const day = reference.getDay()
  const diffToMonday = day === 0 ? -6 : 1 - day
  const thisMonday = new Date(reference)
  thisMonday.setHours(0, 0, 0, 0)
  thisMonday.setDate(reference.getDate() + diffToMonday)

  const prevMonday = new Date(thisMonday)
  prevMonday.setDate(thisMonday.getDate() - 7)
  const prevSunday = new Date(thisMonday)
  prevSunday.setDate(thisMonday.getDate() - 1)

  return {
    start: prevMonday.toLocaleDateString('sv-SE'),
    end: prevSunday.toLocaleDateString('sv-SE'),
  }
}

function isInRange(date: string, start: string, end: string): boolean {
  return date >= start && date <= end
}

export interface RepeatCandidate {
  name: string
  category: string
  amount: string
}

/** Eindeutige Artikel aus dem Einkaufslog der Vorwoche, ohne Vorrat. */
export function buildRepeatCandidates(
  purchaseLog: PurchaseLogEntry[],
  lists: ShoppingList[],
  customProducts: CustomProduct[],
  pantry: PantryItem[],
  reference = new Date()
): RepeatCandidate[] {
  const { start, end } = previousWeekRange(reference)
  const weekPurchases = purchaseLog.filter((e) => isInRange(e.date, start, end))
  if (!weekPurchases.length) return []

  const byName = new Map<string, PurchaseLogEntry>()
  for (const entry of weekPurchases) {
    byName.set(normalize(entry.name), entry)
  }

  const pantryKeys = pantry.map((p) => normalize(p.name)).filter(Boolean)
  const amountByName = new Map<string, string>()

  for (const list of lists) {
    for (const item of [...list.items].sort((a, b) => b.addedAt - a.addedAt)) {
      const key = normalize(item.name)
      if (item.amount && !amountByName.has(key)) amountByName.set(key, item.amount)
    }
  }
  for (const product of customProducts) {
    const key = normalize(product.name)
    if (product.defaultAmount) amountByName.set(key, product.defaultAmount)
  }

  const candidates: RepeatCandidate[] = []
  for (const entry of byName.values()) {
    const n = normalize(entry.name)
    const isPantry = pantryKeys.some((pk) => n.includes(pk) || pk.includes(n))
    if (isPantry) continue
    candidates.push({
      name: entry.name,
      category: entry.category,
      amount: amountByName.get(n) || '',
    })
  }

  return candidates.sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

export function candidatesToItems(candidates: RepeatCandidate[]): ShoppingItem[] {
  const now = Date.now()
  return candidates.map((c) => ({
    id: uid(),
    name: c.name,
    amount: c.amount,
    category: c.category,
    done: false,
    favorite: false,
    addedAt: now,
  }))
}
