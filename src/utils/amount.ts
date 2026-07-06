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

/** Fügt einen Mengenwert und eine Einheit zu einem Anzeige-String zusammen, z.B. ("500", "g") -> "500 g". */
export function joinAmount(value: string, unit: string): string {
  const v = value.trim()
  const u = unit.trim()
  if (!v) return u
  return u ? `${v} ${u}` : v
}

/** Sinnvolle Schrittgröße pro Einheit für den +/- Stepper (Stückgut in 1er-Schritten,
 *  Gewicht/Volumen in gröberen Schritten, da 1g/1ml kaum je relevant ist). */
export function stepForUnit(unit: string): number {
  const u = unit.trim().toLowerCase()
  if (u === 'kg' || u === 'l') return 0.5
  if (u === 'g' || u === 'ml') return 50
  return 1
}

/** Erhöht/verringert eine Mengenangabe um einen sinnvollen Schritt; nicht unter
 *  einen Schritt sinken (0 oder negative Mengen ergeben keinen Sinn - dafür löscht
 *  man den Artikel). Nicht parsebare Mengen bleiben unverändert. */
export function adjustAmount(amount: string, direction: 1 | -1): string {
  const parsed = parseAmount(amount)
  if (!parsed) return amount
  const step = stepForUnit(parsed.unit)
  const next = direction > 0 ? parsed.value + step : Math.max(step, parsed.value - step)
  return joinAmount(formatNumber(next), parsed.unit)
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
