import { normalize } from './text'
import { PRODUCTS, type Product } from '@/data/products'
import type { CustomProduct } from '@/types'

export interface SearchableProduct {
  name: string
  category: string
  icon?: string
  amount?: string
  isCustom?: boolean
  customId?: string
}

function toSearchable(p: Product): SearchableProduct {
  return { name: p.name, category: p.category, icon: p.icon }
}

function customToSearchable(p: CustomProduct): SearchableProduct {
  return { name: p.name, category: p.category, amount: p.defaultAmount, isCustom: true, customId: p.id }
}

/** Sucht zuerst in eigenen Produkten (Nutzer-Priorität), dann in der Standard-Datenbank.
 *  "startsWith"-Treffer werden vor reinen Teilstring-Treffern einsortiert. */
export function searchProducts(query: string, customProducts: CustomProduct[], limit = 8): SearchableProduct[] {
  const q = normalize(query)
  if (!q) return []

  const pool = [...customProducts.map(customToSearchable), ...PRODUCTS.map(toSearchable)]
  const starts: SearchableProduct[] = []
  const contains: SearchableProduct[] = []
  const seen = new Set<string>()

  for (const p of pool) {
    const key = normalize(p.name)
    if (seen.has(key)) continue
    if (key.startsWith(q)) {
      starts.push(p)
      seen.add(key)
    } else if (key.includes(q)) {
      contains.push(p)
      seen.add(key)
    }
  }

  return [...starts, ...contains].slice(0, limit)
}
