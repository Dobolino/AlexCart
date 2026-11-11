import { HOUSE_BRAND_PRESETS } from '@/constants/houseBrands'
import type { GlobalBrand } from '@/types'
import { receiptBrandKey } from '@/data/receiptVocabulary'

/** Einzige Quelle für Marken-Gleichheit (gleiche Faltung wie beim Bon-Abgleich), damit eine
 *  manuell angelegte Marke nie von einer aus einem Kassenbon erkannten abweicht. */
export function isBrandNameTaken(brands: GlobalBrand[], name: string): boolean {
  const key = receiptBrandKey(name)
  return brands.some((b) => receiptBrandKey(b.name) === key)
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
