import { normalize } from './text'
import { uid } from './id'
import { normalizeCategory } from './icon'
import type { ImportItemPayload, ShoppingItem } from '@/types'

export interface ParsedAmount {
  value: number
  unit: string
}

export function parseAmount(str: string | undefined | null): ParsedAmount | null {
  if (!str) return null
  const m = String(str).trim().match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/)
  if (!m) return null
  return { value: parseFloat(m[1].replace(',', '.')), unit: m[2].trim() }
}

export function formatNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',')
}

export function combineAmounts(a: string, b: string): string {
  const pa = parseAmount(a)
  const pb = parseAmount(b)
  if (pa && pb && pa.unit.toLowerCase() === pb.unit.toLowerCase()) {
    const sum = formatNumber(pa.value + pb.value)
    return pa.unit ? `${sum} ${pa.unit}` : sum
  }
  if (!a) return b
  if (!b) return a
  return `${a} + ${b}`
}

export function mergeItems(items: ImportItemPayload[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>()
  for (const raw of items) {
    const name = String(raw.name || '').trim()
    if (!name) continue
    const category = normalizeCategory(String(raw.category || 'Sonstiges').trim())
    const key = normalize(name)
    const existing = map.get(key)
    if (existing) {
      existing.amount = combineAmounts(existing.amount, String(raw.amount || '').trim())
    } else {
      map.set(key, {
        id: uid(),
        name,
        amount: String(raw.amount || '').trim(),
        category,
        done: false,
        addedAt: Date.now(),
      })
    }
  }
  return Array.from(map.values())
}
