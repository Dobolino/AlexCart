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
