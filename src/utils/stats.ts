import { normalize } from './text'
import type { PurchaseLogEntry } from '@/types'

export interface CountEntry {
  label: string
  count: number
}

export function topItems(log: PurchaseLogEntry[], limit = 10): CountEntry[] {
  const counts = new Map<string, CountEntry>()
  for (const entry of log) {
    const key = normalize(entry.name)
    const existing = counts.get(key)
    if (existing) existing.count += 1
    else counts.set(key, { label: entry.name, count: 1 })
  }
  return Array.from(counts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function categoryBreakdown(log: PurchaseLogEntry[]): CountEntry[] {
  const counts = new Map<string, CountEntry>()
  for (const entry of log) {
    const existing = counts.get(entry.category)
    if (existing) existing.count += 1
    else counts.set(entry.category, { label: entry.category, count: 1 })
  }
  return Array.from(counts.values()).sort((a, b) => b.count - a.count)
}

/** Montag der ISO-Woche für ein YYYY-MM-DD Datum, als YYYY-MM-DD. */
function isoWeekStart(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const day = (d.getDay() + 6) % 7 // Montag = 0
  d.setDate(d.getDate() - day)
  return d.toLocaleDateString('sv-SE')
}

export interface WeekBucket {
  weekStart: string
  count: number
}

/** Anzahl abgehakter Artikel pro Woche, für die letzten `weeks` Wochen (älteste zuerst). */
export function productsPerWeek(log: PurchaseLogEntry[], weeks = 8): WeekBucket[] {
  const buckets = new Map<string, number>()
  for (const entry of log) {
    const key = isoWeekStart(entry.date)
    buckets.set(key, (buckets.get(key) || 0) + 1)
  }

  const result: WeekBucket[] = []
  const now = new Date()
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i * 7)
    const weekStart = isoWeekStart(d.toLocaleDateString('sv-SE'))
    result.push({ weekStart, count: buckets.get(weekStart) || 0 })
  }
  return result
}

/** Ø abgehakte Artikel pro Einkaufstag (ein "Einkauf" = ein Kalendertag mit mind. einem abgehakten Artikel). */
export function avgItemsPerTrip(log: PurchaseLogEntry[]): number {
  if (!log.length) return 0
  const distinctDays = new Set(log.map((e) => e.date)).size
  return distinctDays ? log.length / distinctDays : 0
}

export function distinctShoppingDays(log: PurchaseLogEntry[]): number {
  return new Set(log.map((e) => e.date)).size
}
