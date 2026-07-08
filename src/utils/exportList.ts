import type { ShoppingList } from '@/types'

export interface ListExportPayload {
  name: string
  weekLabel: string
  exportedAt: string
  items: Array<{
    name: string
    amount: string
    category: string
    done: boolean
    note?: string
    favorite?: boolean
  }>
}

export function buildListExport(list: ShoppingList): ListExportPayload {
  return {
    name: list.name,
    weekLabel: list.weekLabel,
    exportedAt: new Date().toISOString(),
    items: list.items.map((item) => ({
      name: item.name,
      amount: item.amount,
      category: item.category,
      done: item.done,
      ...(item.note ? { note: item.note } : {}),
      ...(item.favorite ? { favorite: true } : {}),
    })),
  }
}

export function exportListJson(list: ShoppingList): string {
  return JSON.stringify(buildListExport(list), null, 2)
}

export function listExportFilename(list: ShoppingList): string {
  const safe = list.name.replace(/[^\wäöüÄÖÜß-]+/gi, '-').replace(/-+/g, '-')
  return `alexshop-${safe || 'liste'}.json`
}
