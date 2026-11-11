import { normalize } from './text'
import { PRODUCTS, type Product } from '@/data/products'
import type { CustomProduct } from '@/types'
import type { CatalogProduct } from '@/types/catalog'
import { quantityText } from './quantity'

export interface SearchableProduct {
  name: string
  category: string
  icon?: string
  amount?: string
  note?: string
  isCustom?: boolean
  customId?: string
  productId?: string
  brand?: string
}

function toSearchable(p: Product): SearchableProduct {
  return { name: p.name, category: p.category, icon: p.icon }
}

function customToSearchable(p: CustomProduct): SearchableProduct {
  return {
    name: p.name,
    category: p.category,
    amount: p.defaultAmount,
    note: p.note,
    isCustom: true,
    customId: p.id,
  }
}

/** Sucht zuerst in eigenen Produkten (Nutzer-Priorität), dann in der Standard-Datenbank.
 *  "startsWith"-Treffer werden vor reinen Teilstring-Treffern einsortiert. */
export function searchProducts(
  query: string,
  customProducts: CustomProduct[],
  limit = 8,
  catalog: CatalogProduct[] = []
): SearchableProduct[] {
  const q = normalize(query)
  if (!q) return []

  const pool: SearchableProduct[] = [
    ...customProducts.map(customToSearchable),
    ...PRODUCTS.map(toSearchable),
    ...catalog.map((product) => ({
      name: product.name,
      category: product.category,
      brand: product.brand,
      productId: product.id,
      amount: product.netQuantity ? quantityText(product.netQuantity) : undefined,
    })),
  ]
  const starts: SearchableProduct[] = []
  const contains: SearchableProduct[] = []
  const seen = new Set<string>()

  for (const p of pool) {
    // Katalog-Produkte tragen Marke/Packungsgrösse und bleiben deshalb von gleichnamigen
    // Standard-/eigenen Produkten unberührt; sie werden nur gegen exakt identische Katalog-
    // Einträge (gleicher Name+Marke+Menge, z. B. aus zwei Bon-Scans) dedupliziert.
    const key = p.productId
      ? `catalog:${normalize(p.name)}|${normalize(p.brand ?? '')}|${p.amount ?? ''}`
      : normalize(p.name)
    if (seen.has(key)) continue
    const searchable = normalize([p.brand, p.name].filter(Boolean).join(' '))
    if (normalize(p.name).startsWith(q) || searchable.startsWith(q)) {
      starts.push(p)
      seen.add(key)
    } else if (searchable.includes(q)) {
      contains.push(p)
      seen.add(key)
    }
  }

  return [...starts, ...contains].slice(0, limit)
}
