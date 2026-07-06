import { groupByCategory } from './group'
import type { ShoppingList } from '@/types'

/** Baut eine einfache Textdarstellung der offenen Artikel einer Liste, nach
 *  Kategorie gruppiert - zum Teilen (navigator.share) oder Kopieren. */
export function buildShareText(list: ShoppingList): string {
  const activeItems = list.items.filter((i) => !i.done)
  const groups = groupByCategory(activeItems)

  const lines: string[] = [`🛒 ${list.name}`, '']
  for (const g of groups) {
    lines.push(g.category.toUpperCase())
    for (const item of g.items) {
      lines.push(`• ${item.name}${item.amount ? ` – ${item.amount}` : ''}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}
