import { normalize } from './text'
import type { CustomProduct, ShoppingList } from '@/types'

export type QuickPickKind = 'favorite' | 'recent' | 'custom'

export interface QuickPick {
  key: string
  name: string
  category: string
  amount: string
  note?: string
  kind: QuickPickKind
}

function openNames(list: ShoppingList): Set<string> {
  return new Set(list.items.filter((i) => !i.done).map((i) => normalize(i.name)))
}

/** Favoriten, zuletzt genutzte und eigene Produkte für die Schnell-Zeile. */
export function buildQuickPicks(
  list: ShoppingList,
  allLists: ShoppingList[],
  customProducts: CustomProduct[],
  limit = 14
): QuickPick[] {
  const onList = openNames(list)
  const picks: QuickPick[] = []
  const seen = new Set<string>()

  function add(pick: QuickPick) {
    const key = normalize(pick.name)
    if (!key || seen.has(key) || onList.has(key)) return
    seen.add(key)
    picks.push(pick)
  }

  for (const item of list.items) {
    if (!item.favorite || item.done) continue
    add({
      key: `fav-${item.id}`,
      name: item.name,
      category: item.category,
      amount: item.amount,
      note: item.note,
      kind: 'favorite',
    })
  }

  const recentCandidates = allLists
    .flatMap((l) => l.items)
    .sort((a, b) => b.addedAt - a.addedAt)

  for (const item of recentCandidates) {
    add({
      key: `recent-${normalize(item.name)}`,
      name: item.name,
      category: item.category,
      amount: item.amount,
      note: item.note,
      kind: 'recent',
    })
  }

  for (const product of [...customProducts].sort((a, b) => b.createdAt - a.createdAt)) {
    add({
      key: `custom-${product.id}`,
      name: product.name,
      category: product.category,
      amount: product.defaultAmount,
      note: product.note,
      kind: 'custom',
    })
  }

  return picks.slice(0, limit)
}
