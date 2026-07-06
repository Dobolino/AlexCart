import { normalize } from './text'
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
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'Ungültiges JSON – bitte Format prüfen.' }
  }
  if (!data || !Array.isArray(data.items)) {
    return { ok: false, error: 'Kein "items"-Array im JSON gefunden.' }
  }

  const merged = mergeItems(data.items)
  const pantryKeys = pantry.map((p) => normalize(p.name)).filter(Boolean)

  const kept: ShoppingItem[] = []
  const filtered: ShoppingItem[] = []
  for (const item of merged) {
    const n = normalize(item.name)
    const isPantry = pantryKeys.some((pk) => n.includes(pk) || pk.includes(n))
    if (isPantry) filtered.push(item)
    else kept.push(item)
  }

  return { ok: true, weekLabel: String(data.week || ''), kept, filtered }
}
