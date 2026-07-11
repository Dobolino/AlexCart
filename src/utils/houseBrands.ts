import { HOUSE_BRAND_PRESETS } from '@/constants/houseBrands'
import type { GlobalBrand } from '@/types'
import { normalize } from '@/utils/text'

export function isBrandNameTaken(brands: GlobalBrand[], name: string): boolean {
  const key = normalize(name)
  return brands.some((b) => normalize(b.name) === key)
}

/** Fehlende Hausmarken zur globalen Markenliste hinzufügen. */
export function mergeHouseBrandPresets(
  brands: GlobalBrand[],
  createId: () => string,
  presets: readonly string[] = HOUSE_BRAND_PRESETS
): GlobalBrand[] {
  const next = [...brands]
  const now = Date.now()

  for (const name of presets) {
    if (isBrandNameTaken(next, name)) continue
    next.push({ id: createId(), name, createdAt: now })
  }

  return next
}
