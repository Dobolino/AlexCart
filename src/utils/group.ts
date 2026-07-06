import { CATEGORIES } from '@/data/products'

export interface CategoryGroup<T> {
  category: string
  items: T[]
}

export function groupByCategory<T extends { category: string }>(items: T[]): CategoryGroup<T>[] {
  const groups: Record<string, T[]> = {}
  for (const item of items) {
    const cat = item.category || 'Sonstiges'
    ;(groups[cat] ??= []).push(item)
  }
  const ordered = CATEGORIES.filter((c) => groups[c])
  const extra = Object.keys(groups)
    .filter((c) => !CATEGORIES.includes(c))
    .sort()
  return [...ordered, ...extra].map((category) => ({ category, items: groups[category] }))
}
