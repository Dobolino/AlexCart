import { normalize } from './text'
import { searchProducts } from './search'
import { normalizeCategory } from './icon'
import type { CustomProduct, PurchaseLogEntry, ShoppingList } from '@/types'

const MIN_PURCHASES = 2
const MIN_INTERVAL_DAYS = 3
const DEFAULT_INTERVAL_DAYS = 7

export interface RecurringSuggestion {
  key: string
  name: string
  category: string
  amount: string
  intervalDays: number
  daysSince: number
}

function daysBetween(a: string, b: string): number {
  const start = new Date(a + 'T00:00:00').getTime()
  const end = new Date(b + 'T00:00:00').getTime()
  return Math.round((end - start) / 86_400_000)
}

function averageInterval(dates: string[]): number | null {
  if (dates.length < MIN_PURCHASES) return null
  const sorted = [...dates].sort()
  let totalGap = 0
  for (let i = 1; i < sorted.length; i++) {
    totalGap += daysBetween(sorted[i - 1]!, sorted[i]!)
  }
  const avg = totalGap / (sorted.length - 1)
  return Math.max(MIN_INTERVAL_DAYS, Math.round(avg))
}

function amountForName(name: string, customProducts: CustomProduct[], list: ShoppingList): string {
  const custom = customProducts.find((p) => normalize(p.name) === normalize(name))
  if (custom?.defaultAmount) return custom.defaultAmount

  for (const item of [...list.items].sort((a, b) => b.addedAt - a.addedAt)) {
    if (normalize(item.name) === normalize(name) && item.amount) return item.amount
  }

  const hit = searchProducts(name, customProducts, 1)[0]
  return hit?.amount || ''
}

/** Artikel, deren typisches Einkaufsintervall überschritten ist. */
export function buildRecurringSuggestions(
  purchaseLog: PurchaseLogEntry[],
  list: ShoppingList,
  customProducts: CustomProduct[],
  reference = new Date()
): RecurringSuggestion[] {
  const today = reference.toLocaleDateString('sv-SE')
  const openNames = new Set(list.items.filter((i) => !i.done).map((i) => normalize(i.name)))
  const byName = new Map<string, { label: string; category: string; dates: string[] }>()

  for (const entry of purchaseLog) {
    const key = normalize(entry.name)
    if (!key) continue
    const existing = byName.get(key)
    if (existing) {
      existing.dates.push(entry.date)
    } else {
      byName.set(key, { label: entry.name, category: entry.category, dates: [entry.date] })
    }
  }

  const suggestions: RecurringSuggestion[] = []

  for (const [key, data] of byName) {
    if (openNames.has(key)) continue

    const uniqueDates = [...new Set(data.dates)].sort()
    const interval =
      averageInterval(uniqueDates) ??
      (uniqueDates.length === 1 ? DEFAULT_INTERVAL_DAYS : null)
    if (!interval) continue

    const lastDate = uniqueDates[uniqueDates.length - 1]!
    const daysSince = daysBetween(lastDate, today)
    if (daysSince < interval) continue

    suggestions.push({
      key,
      name: data.label,
      category: normalizeCategory(data.category),
      amount: amountForName(data.label, customProducts, list),
      intervalDays: interval,
      daysSince,
    })
  }

  return suggestions.sort((a, b) => b.daysSince - a.daysSince).slice(0, 8)
}
