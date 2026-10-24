import { normalize } from './text'
import { importPayloadSchema } from './validation'
import { baseQuantity, subtractQuantity } from './quantity'
import { mergeItems } from './amount'
import type { ImportPayload, PantryItem, ShoppingItem } from '@/types'

export interface ImportOutcome {
  ok: boolean
  error?: string
  weekLabel?: string
  kept?: ShoppingItem[]
  filtered?: ShoppingItem[]
}

export function importFromJSON(text: string, pantry: PantryItem[]): ImportOutcome {
  let data: ImportPayload
  try {
    if (text.length > 1024 * 1024) return { ok: false, error: 'Import ist zu groß (maximal 1 MB).' }
    data = importPayloadSchema.parse(JSON.parse(text))
  } catch {
    return { ok: false, error: 'Ungültiges JSON – bitte Format prüfen.' }
  }
  if (!data || !Array.isArray(data.items)) {
    return { ok: false, error: 'Kein "items"-Array im JSON gefunden.' }
  }

  const merged = mergeItems(data.items)

  const kept: ShoppingItem[] = []
  const filtered: ShoppingItem[] = []
  for (const item of merged) {
    const n = normalize(item.name)
    const stock = pantry.find((p) => normalize(p.name) === n)
    const requested = baseQuantity(item.amount)
    const available = stock?.amount ? baseQuantity(stock.amount) : null
    if (requested && available && requested.unit === available.unit && available.value > 0) {
      if (available.value >= requested.value) filtered.push(item)
      else kept.push({ ...item, amount: subtractQuantity(item.amount, stock!.amount!) ?? item.amount })
    } else kept.push(item)
  }

  return { ok: true, weekLabel: String(data.week || ''), kept, filtered }
}
