import { normalize } from './text'
import type { PurchaseLogEntry } from '@/types'

export interface ProductPriceStats {
  name: string
  category: string
  count: number
  avgPrice: number
  lastPrice: number
  lastDate: string
  minPrice: number
  maxPrice: number
}

/** Preisstatistik pro Produkt aus dem Einkaufslog (nur Einträge mit Preis). */
export function productPriceHistory(log: PurchaseLogEntry[]): ProductPriceStats[] {
  const byName = new Map<
    string,
    { label: string; category: string; prices: { price: number; date: string }[] }
  >()

  for (const entry of log) {
    if (!entry.price || entry.price <= 0) continue
    const key = normalize(entry.name)
    const existing = byName.get(key)
    const point = { price: entry.price, date: entry.date }
    if (existing) {
      existing.prices.push(point)
    } else {
      byName.set(key, { label: entry.name, category: entry.category, prices: [point] })
    }
  }

  const result: ProductPriceStats[] = []
  for (const data of byName.values()) {
    const sorted = [...data.prices].sort((a, b) => a.date.localeCompare(b.date))
    const prices = sorted.map((p) => p.price)
    const last = sorted[sorted.length - 1]!
    const sum = prices.reduce((a, b) => a + b, 0)
    result.push({
      name: data.label,
      category: data.category,
      count: prices.length,
      avgPrice: Math.round((sum / prices.length) * 100) / 100,
      lastPrice: last.price,
      lastDate: last.date,
      minPrice: Math.min(...prices),
      maxPrice: Math.max(...prices),
    })
  }

  return result.sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}

function isoWeekStart(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d.toLocaleDateString('sv-SE')
}

export interface SpendWeekBucket {
  weekStart: string
  amount: number
}

/** Ausgaben pro Woche (nur erfasste Preise), letzte `weeks` Wochen. */
export function spendPerWeek(log: PurchaseLogEntry[], weeks = 8): SpendWeekBucket[] {
  const buckets = new Map<string, number>()
  for (const entry of log) {
    if (!entry.price || entry.price <= 0) continue
    const key = isoWeekStart(entry.date)
    buckets.set(key, Math.round(((buckets.get(key) || 0) + entry.price) * 100) / 100)
  }

  const result: SpendWeekBucket[] = []
  const now = new Date()
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const weekStart = isoWeekStart(d.toLocaleDateString('sv-SE'))
    result.push({ weekStart, amount: buckets.get(weekStart) || 0 })
  }
  return result
}
