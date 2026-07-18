import { normalize } from './text'
import { uid } from './id'
import { normalizeCategory } from './icon'
import type { ImportItemPayload, ShoppingItem } from '@/types'

export interface ParsedAmount {
  value: number
  unit: string
}

/** Mehrere gleich grosse Packungen, z. B. „2 × 400 g“ (2 Dosen à 400 g). */
export interface PackAmount {
  count: number
  packValue: number
  packUnit: string
}

const PACK_AMOUNT_RE = /^(\d+)\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*([a-zA-ZäöüÄÖÜµμ%]+)\s*$/iu

export function parsePackAmount(str: string | undefined | null): PackAmount | null {
  if (!str) return null
  const m = String(str).trim().match(PACK_AMOUNT_RE)
  if (!m) return null
  const count = Number(m[1])
  const packValue = parseFloat(m[2]!.replace(',', '.'))
  const packUnit = m[3]!.trim()
  if (!Number.isFinite(count) || count < 1 || !Number.isFinite(packValue) || packValue <= 0 || !packUnit) {
    return null
  }
  return { count: Math.round(count), packValue, packUnit }
}

export function formatPackAmount(count: number, packValue: number, packUnit: string): string {
  const n = Math.max(1, Math.round(count))
  return `${n} × ${joinAmount(formatNumber(packValue), packUnit.trim())}`
}

/** Baut „N × 400 g“ aus Anzahl und Grössen-Preset („400 g“ / „400 ml“). */
export function formatPackAmountFromPreset(count: number, preset: string): string | null {
  const parsed = parseAmount(preset)
  if (!parsed || !parsed.unit) return null
  return formatPackAmount(count, parsed.value, parsed.unit)
}

/**
 * Leitet die Packungsanzahl ab, wenn die aktuelle Menge ein Vielfaches der Packungsgrösse ist
 * (z. B. „800 g“ + Preset „400 g“ → 2). Sonst bestehende Pack-Anzahl oder 1.
 */
export function inferPackCount(amount: string, preset: string): number {
  const existing = parsePackAmount(amount)
  if (existing) return existing.count

  const presetParsed = parseAmount(preset)
  if (!presetParsed || presetParsed.value <= 0) return 1

  const amountParsed = parseAmount(amount)
  if (!amountParsed || amountParsed.value <= 0) return 1

  const presetUnit = normalizeUnit(presetParsed.unit)
  const amountUnit = normalizeUnit(amountParsed.unit)
  const compatible =
    presetUnit === amountUnit ||
    ((presetUnit === 'g' || presetUnit === 'ml') && (amountUnit === 'g' || amountUnit === 'ml'))
  if (!compatible) return 1

  const ratio = amountParsed.value / presetParsed.value
  if (ratio >= 1 && Math.abs(ratio - Math.round(ratio)) < 0.001) {
    return Math.max(1, Math.round(ratio))
  }
  return 1
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
 *  man den Artikel). Nicht parsebare Mengen bleiben unverändert.
 *  Bei Pack-Mengen („2 × 400 g“) ändert nur die Anzahl, die Packungsgrösse bleibt. */
export function adjustAmount(amount: string, direction: 1 | -1): string {
  const pack = parsePackAmount(amount)
  if (pack) {
    const next = direction > 0 ? pack.count + 1 : Math.max(1, pack.count - 1)
    return formatPackAmount(next, pack.packValue, pack.packUnit)
  }
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

/** Anzahl für Preisberechnung – z. B. „2 Stk“ → 2, „2 × 400 g“ → 2, „500 g“ → 1. */
export function priceQuantityFromAmount(amount: string): number {
  const pack = parsePackAmount(amount)
  if (pack) return pack.count

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
  const packA = parsePackAmount(a)
  const packB = parsePackAmount(b)
  if (
    packA &&
    packB &&
    packA.packUnit.toLowerCase() === packB.packUnit.toLowerCase() &&
    packA.packValue === packB.packValue
  ) {
    return formatPackAmount(packA.count + packB.count, packA.packValue, packA.packUnit)
  }

  const pa = parseAmount(a)
  const pb = parseAmount(b)
  if (pa && pb && !packA && !packB && pa.unit.toLowerCase() === pb.unit.toLowerCase()) {
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
