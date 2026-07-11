import type { GlobalBrand, ProductVariant } from '@/types'

export function brandNameById(brands: GlobalBrand[], brandId?: string): string | undefined {
  if (!brandId) return undefined
  return brands.find((b) => b.id === brandId)?.name
}

/** Anzeigename: „Migros · 400 ml“ oder nur Variantenname. */
export function formatVariantLabel(variant: ProductVariant, brands: GlobalBrand[]): string {
  const brand = brandNameById(brands, variant.brandId)
  const parts = [brand, variant.name.trim()].filter(Boolean)
  return parts.join(' · ') || 'Standard'
}
