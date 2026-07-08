import { normalize } from './text'
import { combineAmounts } from './amount'
import type { ShoppingItem } from '@/types'

export type ImportMode = 'replace' | 'append' | 'merge'

/** Importierte Artikel mit bestehender Liste kombinieren. Erledigte bleiben immer erhalten. */
export function applyImportMode(
  existing: ShoppingItem[],
  imported: ShoppingItem[],
  mode: ImportMode
): ShoppingItem[] {
  const done = existing.filter((i) => i.done)
  const open = existing.filter((i) => !i.done)

  if (mode === 'replace') {
    return [...imported.map((i) => ({ ...i, done: false })), ...done]
  }

  if (mode === 'append') {
    return [...open, ...imported.map((i) => ({ ...i, done: false })), ...done]
  }

  const map = new Map<string, ShoppingItem>()
  for (const item of open) {
    map.set(normalize(item.name), { ...item })
  }
  for (const item of imported) {
    const key = normalize(item.name)
    const prev = map.get(key)
    if (prev) {
      map.set(key, { ...prev, amount: combineAmounts(prev.amount, item.amount) })
    } else {
      map.set(key, { ...item, done: false })
    }
  }
  return [...map.values(), ...done]
}
