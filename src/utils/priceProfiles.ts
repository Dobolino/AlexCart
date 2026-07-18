import { priceQuantityFromAmount } from './amount'
import {
  isProduceCategory,
  weightGramsFromAmount,
  explicitWeightGrams,
  defaultProducePricingMode,
} from './producePrice'
import { normalize } from '@/utils/text'
import type { CheckoffPriceData, ProductPriceProfile, ProductVariant, PurchaseLogEntry, ShoppingItem } from '@/types'

export function profileBaseKey(itemName: string, category: string): string {
  return `${normalize(itemName)}|${normalize(category)}`
}

export function findPriceProfile(
  profiles: ProductPriceProfile[],
  itemName: string,
  category: string
): ProductPriceProfile | undefined {
  const key = profileBaseKey(itemName, category)
  return profiles.find((p) => p.baseKey === key)
}

export function findVariant(profile: ProductPriceProfile, variantId: string): ProductVariant | undefined {
  return profile.variants.find((v) => v.id === variantId)
}

export function createEmptyVariant(name: string, id: string): ProductVariant {
  return {
    id,
    name: name.trim(),
    purchaseCount: 0,
    lastPurchaseWasSale: false,
    salePurchaseCount: 0,
  }
}

export function createPriceProfile(itemName: string, category: string, id: string, now = Date.now()): ProductPriceProfile {
  const trimmed = itemName.trim()
  return {
    id,
    itemName: trimmed,
    category,
    baseKey: profileBaseKey(trimmed, category),
    variants: [],
    createdAt: now,
    updatedAt: now,
  }
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

/** Normal-Durchschnitt nur aus Nicht-Aktionskäufen. */
function nextNormalAverage(current: ProductVariant, price: number): number {
  const normalCount = current.purchaseCount - current.salePurchaseCount
  const nextCount = normalCount + 1
  if (normalCount <= 0 || current.avgPrice === undefined) return price
  return roundMoney((current.avgPrice * normalCount + price) / nextCount)
}

function nextSaleAverage(current: ProductVariant, price: number): number {
  const nextCount = current.salePurchaseCount + 1
  if (current.salePurchaseCount <= 0 || current.avgSalePrice === undefined) return price
  return roundMoney((current.avgSalePrice * current.salePurchaseCount + price) / nextCount)
}

/** Wendet einen Kauf auf eine Variante an und gibt die aktualisierte Variante zurück. */
export function applyPurchaseToVariant(
  variant: ProductVariant,
  price: number,
  date: string,
  wasSale: boolean
): ProductVariant {
  const next: ProductVariant = {
    ...variant,
    purchaseCount: variant.purchaseCount + 1,
    lastPurchaseDate: date,
    lastPurchaseWasSale: wasSale,
  }

  if (wasSale) {
    next.lastSalePrice = price
    next.avgSalePrice = nextSaleAverage(variant, price)
    next.salePurchaseCount = variant.salePurchaseCount + 1
    return next
  }

  next.lastPrice = price
  next.avgPrice = nextNormalAverage(variant, price)
  return next
}

/** Entfernt den letzten Kauf einer Variante (beim Abhaken rückgängig) – vereinfachte Rücknahme. */
export function revertLastPurchaseOnVariant(variant: ProductVariant, wasSale: boolean): ProductVariant {
  const next: ProductVariant = {
    ...variant,
    purchaseCount: Math.max(0, variant.purchaseCount - 1),
    lastPurchaseWasSale: false,
  }

  if (wasSale) {
    next.salePurchaseCount = Math.max(0, variant.salePurchaseCount - 1)
    if (next.salePurchaseCount === 0) {
      next.lastSalePrice = undefined
      next.avgSalePrice = undefined
    }
    return next
  }

  if (next.purchaseCount - next.salePurchaseCount <= 0) {
    next.lastPrice = undefined
    next.avgPrice = undefined
  }
  return next
}

export interface ResolvedVariantPurchase {
  profile: ProductPriceProfile
  variant: ProductVariant
  variantId: string
  variantName: string
  createdNewVariant: boolean
  createdNewProfile: boolean
}

function withVariantMeta(variant: ProductVariant, data: CheckoffPriceData): ProductVariant {
  const next = { ...variant }
  if (data.brandId) next.brandId = data.brandId
  if (data.pricePerKg !== undefined) next.pricePerKg = data.pricePerKg
  return next
}

/** Legt bei Bedarf Profil/Variante an und wendet den Kauf an. */
export function recordVariantPurchase(
  profiles: ProductPriceProfile[],
  itemName: string,
  category: string,
  data: CheckoffPriceData,
  date: string,
  createId: () => string
): ResolvedVariantPurchase {
  const now = Date.now()
  let profile = findPriceProfile(profiles, itemName, category)
  let createdNewProfile = false

  if (!profile) {
    profile = createPriceProfile(itemName, category, createId(), now)
    createdNewProfile = true
  }

  const profileCopy: ProductPriceProfile = {
    ...profile,
    variants: [...profile.variants],
    updatedAt: now,
  }

  const wasSale = !!data.wasSale
  const profilePrice = data.pricePerKg ?? data.unitPrice ?? data.price
  let variant: ProductVariant | undefined
  let createdNewVariant = false

  if (data.variantId) {
    const idx = profileCopy.variants.findIndex((v) => v.id === data.variantId)
    if (idx >= 0) {
      variant = withVariantMeta(
        applyPurchaseToVariant(profileCopy.variants[idx]!, profilePrice, date, wasSale),
        data
      )
      profileCopy.variants[idx] = variant
    }
  }

  if (!variant) {
    const name = (data.variantName || itemName).trim()
    if (!name) throw new Error('Variantenname fehlt')
    const newVariant = withVariantMeta(
      applyPurchaseToVariant(createEmptyVariant(name, createId()), profilePrice, date, wasSale),
      data
    )
    profileCopy.variants.push(newVariant)
    variant = newVariant
    createdNewVariant = true
  }

  profileCopy.preferredVariantId = variant.id

  return {
    profile: profileCopy,
    variant,
    variantId: variant.id,
    variantName: variant.name,
    createdNewVariant,
    createdNewProfile,
  }
}

export function upsertPriceProfile(profiles: ProductPriceProfile[], updated: ProductPriceProfile): ProductPriceProfile[] {
  const idx = profiles.findIndex((p) => p.id === updated.id)
  if (idx < 0) return [...profiles, updated]
  const next = [...profiles]
  next[idx] = updated
  return next
}

export interface EnsuredBrandVariant {
  profiles: ProductPriceProfile[]
  variantId: string
}

/** Findet oder legt eine markengebundene Variante an, ohne Kaufhistorie zu verändern -
 *  für "Marke direkt beim Anlegen/Bearbeiten eines Artikels wählen", unabhängig vom
 *  Preis-Checkoff-Flow (der Varianten automatisch erst beim Abhaken anlegt). */
export function ensureBrandVariant(
  profiles: ProductPriceProfile[],
  itemName: string,
  category: string,
  brandId: string,
  brandName: string,
  createId: () => string
): EnsuredBrandVariant {
  const now = Date.now()
  let profile = findPriceProfile(profiles, itemName, category)
  let nextProfiles = profiles

  if (!profile) {
    profile = createPriceProfile(itemName, category, createId(), now)
    nextProfiles = [...nextProfiles, profile]
  }

  const existing = profile.variants.find((v) => v.brandId === brandId)
  if (existing) return { profiles: nextProfiles, variantId: existing.id }

  const variant: ProductVariant = { ...createEmptyVariant(brandName, createId()), brandId }
  const updatedProfile: ProductPriceProfile = {
    ...profile,
    variants: [...profile.variants, variant],
    updatedAt: now,
  }
  return { profiles: upsertPriceProfile(nextProfiles, updatedProfile), variantId: variant.id }
}

/** Schätzpreis für eine Variante: letzter Normalpreis → Durchschnitt → nichts. */
export function estimateVariantPrice(variant: ProductVariant): number | null {
  if (variant.lastPrice !== undefined && variant.lastPrice > 0) return variant.lastPrice
  if (variant.avgPrice !== undefined && variant.avgPrice > 0) return variant.avgPrice
  return null
}

/** Wählt die passende Variante für Schätzung. */
export function pickVariantForEstimate(
  profile: ProductPriceProfile | undefined,
  item: ShoppingItem
): ProductVariant | undefined {
  if (!profile?.variants.length) return undefined
  if (item.variantId) {
    const chosen = findVariant(profile, item.variantId)
    if (chosen) return chosen
  }
  if (profile.preferredVariantId) {
    const preferred = findVariant(profile, profile.preferredVariantId)
    if (preferred) return preferred
  }
  const withPrice = profile.variants
    .filter((v) => estimateVariantPrice(v) !== null)
    .sort((a, b) => (b.lastPurchaseDate || '').localeCompare(a.lastPurchaseDate || ''))
  if (withPrice[0]) return withPrice[0]
  return profile.variants[0]
}

export function estimateItemPrice(
  profiles: ProductPriceProfile[],
  item: ShoppingItem
): number | null {
  const profile = findPriceProfile(profiles, item.name, item.category)
  const variant = pickVariantForEstimate(profile, item)
  if (!variant) return null

  if (isProduceCategory(item.category)) {
    const mode = defaultProducePricingMode(item.name, item.category, item.amount, variant)
    if (mode === 'weight') {
      const grams = weightGramsFromAmount(item.amount)
      const perKg = variant.pricePerKg ?? variant.lastPrice ?? variant.avgPrice
      if (grams && perKg) return roundMoney(perKg * (grams / 1000))
      // Stück auf der Liste, aber Kilopreis-Historie: kein Gramm → nur Richtwert pro kg
      if (perKg) return perKg
      return null
    }
    // Stückpreis-Obst (Kiwi etc.)
    const unit = estimateVariantPrice(variant)
    if (unit === null) return null
    return roundMoney(unit * priceQuantityFromAmount(item.amount))
  }

  // Nicht-Obst/Gemüse mit g/kg-Menge: nur skalieren, wenn ein echter Kilopreis erfasst wurde
  // (sonst würde ein alter Gesamtpreis fälschlich als Kilopreis interpretiert).
  const grams = explicitWeightGrams(item.amount)
  if (grams && grams > 0 && variant.pricePerKg && variant.pricePerKg > 0) {
    return roundMoney(variant.pricePerKg * (grams / 1000))
  }

  const unit = estimateVariantPrice(variant)
  if (unit === null) return null
  return roundMoney(unit * priceQuantityFromAmount(item.amount))
}

export interface ListCostEstimate {
  total: number
  pricedItemCount: number
  openItemCount: number
}

export function estimateOpenListCost(
  items: ShoppingItem[],
  profiles: ProductPriceProfile[]
): ListCostEstimate {
  const open = items.filter((i) => !i.done)
  let total = 0
  let pricedItemCount = 0
  for (const item of open) {
    const price = estimateItemPrice(profiles, item)
    if (price !== null) {
      total += price
      pricedItemCount += 1
    }
  }
  return {
    total: roundMoney(total),
    pricedItemCount,
    openItemCount: open.length,
  }
}

/** Baut Profile aus bestehendem purchaseLog (Migration). */
export function buildProfilesFromPurchaseLog(
  log: PurchaseLogEntry[],
  createId: () => string
): ProductPriceProfile[] {
  const byKey = new Map<string, ProductPriceProfile>()

  for (const entry of log) {
    if (!entry.price || entry.price <= 0) continue
    const key = profileBaseKey(entry.name, entry.category)
    let profile = byKey.get(key)
    if (!profile) {
      profile = createPriceProfile(entry.name, entry.category, createId())
      byKey.set(key, profile)
    }

    const variantName = entry.variantName?.trim() || 'Standard'
    let variant = entry.variantId
      ? profile.variants.find((v) => v.id === entry.variantId)
      : profile.variants.find((v) => normalize(v.name) === normalize(variantName))
    if (!variant) {
      variant = createEmptyVariant(variantName, entry.variantId || createId())
      profile.variants.push(variant)
    }

    const idx = profile.variants.findIndex((v) => v.id === variant!.id)
    profile.variants[idx] = applyPurchaseToVariant(variant, entry.price, entry.date, !!entry.wasSale)
    profile.preferredVariantId = variant.id
    profile.updatedAt = Date.now()
  }

  return [...byKey.values()]
}

export function amountToCents(amount: number): number {
  return Math.round(amount * 100)
}
