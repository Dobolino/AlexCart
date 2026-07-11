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

/** Fügt einen Mengenwert und eine Einheit zu einem Anzeige-String zusammen, z.B. ("500", "g") -> "500 g".
 *  Ohne Mengenwert wird nichts angezeigt - eine nackte Einheit ohne Zahl ("g") wäre irreführend. */
export function joinAmount(value: string, unit: string): string {
  const v = value.trim()
  const u = unit.trim()
  if (!v) return ''
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

const COUNT_UNITS = new Set([
  '',
  'stk',
  'stück',
  'stuck',
  'st',
  'x',
  'paar',
  'pack',
  'packung',
  'packungen',
  'pkg',
  'dose',
  'dosen',
  'becher',
  'rolle',
  'rollen',
  'flasche',
  'flaschen',
])

function normalizeUnit(unit: string): string {
  return unit
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/** Anzahl für Preisberechnung – z. B. „2 Stk“ → 2, „500 g“ → 1 (Packungspreis). */
export function priceQuantityFromAmount(amount: string): number {
  const parsed = parseAmount(amount)
  if (!parsed) {
    const bare = String(amount).trim().match(/^(\d+)$/)
    if (bare) return Math.max(1, Number(bare[1]))
    return 1
  }
  const unit = normalizeUnit(parsed.unit)
  if (COUNT_UNITS.has(unit)) return Math.max(1, Math.round(parsed.value))
  return 1
}

export type CheckoffPriceMode = 'unit' | 'total'

/** Berechnet den Gesamtpreis für Kaufprotokoll und Budget. */
export function resolveCheckoffTotalPrice(
  enteredPrice: number,
  amount: string,
  mode: CheckoffPriceMode
): { total: number; unitPrice: number; quantity: number } {
  const quantity = priceQuantityFromAmount(amount)
  if (mode === 'total' || quantity <= 1) {
    const total = Math.round(enteredPrice * 100) / 100
    const unitPrice = quantity > 1 ? Math.round((total / quantity) * 100) / 100 : total
    return { total, unitPrice, quantity }
  }
  const unitPrice = Math.round(enteredPrice * 100) / 100
  const total = Math.round(unitPrice * quantity * 100) / 100
  return { total, unitPrice, quantity }
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
