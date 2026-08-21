import { priceQuantityFromAmount } from './amount'
import {
  isProduceCategory,
  weightGramsFromAmount,
  explicitWeightGrams,
  defaultProducePricingMode,
  estimatedPieceGrams,
} from './producePrice'
import { normalize } from '@/utils/text'
import type {
  CheckoffPriceData,
  Currency,
  ProductPriceProfile,
  ProductVariant,
  PurchaseLogEntry,
  ShoppingItem,
  VariantCurrencyPrices,
} from '@/types'

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

function emptyCurrencyPrices(): VariantCurrencyPrices {
  return {
    purchaseCount: 0,
    lastPurchaseWasSale: false,
    salePurchaseCount: 0,
  }
}

/** Liest die Preisstatistik einer Variante für eine Währung (Legacy-Top-Level = CHF). */
export function pricesForCurrency(variant: ProductVariant, currency: Currency): VariantCurrencyPrices {
  const stored = variant.byCurrency?.[currency]
  if (stored) return { ...emptyCurrencyPrices(), ...stored }

  const hasByCurrency = variant.byCurrency && Object.keys(variant.byCurrency).length > 0
  if (!hasByCurrency && currency === 'CHF') {
    return {
      pricePerKg: variant.pricePerKg,
      lastPrice: variant.lastPrice,
      avgPrice: variant.avgPrice,
      purchaseCount: variant.purchaseCount,
      lastPurchaseDate: variant.lastPurchaseDate,
      lastSalePrice: variant.lastSalePrice,
      lastPurchaseWasSale: variant.lastPurchaseWasSale,
      avgSalePrice: variant.avgSalePrice,
      salePurchaseCount: variant.salePurchaseCount,
    }
  }
  return emptyCurrencyPrices()
}

export function hasPriceForCurrency(variant: ProductVariant, currency: Currency): boolean {
  const p = pricesForCurrency(variant, currency)
  return (
    (p.lastPrice !== undefined && p.lastPrice > 0) ||
    (p.avgPrice !== undefined && p.avgPrice > 0) ||
    (p.pricePerKg !== undefined && p.pricePerKg > 0)
  )
}

/**
 * Schreibt Preise in den Währungs-Bucket.
 * Legacy-Top-Level-Felder spiegeln nur CHF (ältere UI / Migrationen).
 */
export function setPricesForCurrency(
  variant: ProductVariant,
  currency: Currency,
  prices: VariantCurrencyPrices
): ProductVariant {
  const next: ProductVariant = {
    ...variant,
    byCurrency: {
      ...variant.byCurrency,
      [currency]: prices,
    },
  }
  if (currency === 'CHF') {
    next.pricePerKg = prices.pricePerKg
    next.lastPrice = prices.lastPrice
    next.avgPrice = prices.avgPrice
    next.purchaseCount = prices.purchaseCount
    next.lastPurchaseDate = prices.lastPurchaseDate
    next.lastSalePrice = prices.lastSalePrice
    next.lastPurchaseWasSale = prices.lastPurchaseWasSale
    next.avgSalePrice = prices.avgSalePrice
    next.salePurchaseCount = prices.salePurchaseCount
  }
  return next
}

export function createEmptyVariant(name: string, id: string): ProductVariant {
  return {
    id,
    name: name.trim(),
    purchaseCount: 0,
    lastPurchaseWasSale: false,
    salePurchaseCount: 0,
    byCurrency: {},
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
function nextNormalAverage(current: VariantCurrencyPrices, price: number): number {
  const normalCount = current.purchaseCount - current.salePurchaseCount
  const nextCount = normalCount + 1
  if (normalCount <= 0 || current.avgPrice === undefined) return price
  return roundMoney((current.avgPrice * normalCount + price) / nextCount)
}

function nextSaleAverage(current: VariantCurrencyPrices, price: number): number {
  const nextCount = current.salePurchaseCount + 1
  if (current.salePurchaseCount <= 0 || current.avgSalePrice === undefined) return price
  return roundMoney((current.avgSalePrice * current.salePurchaseCount + price) / nextCount)
}

/** Wendet einen Kauf auf eine Variante in der gegebenen Währung an. */
export function applyPurchaseToVariant(
  variant: ProductVariant,
  price: number,
  date: string,
  wasSale: boolean,
  currency: Currency = 'CHF'
): ProductVariant {
  const current = pricesForCurrency(variant, currency)
  const next: VariantCurrencyPrices = {
    ...current,
    purchaseCount: current.purchaseCount + 1,
    lastPurchaseDate: date,
    lastPurchaseWasSale: wasSale,
  }

  if (wasSale) {
    next.lastSalePrice = price
    next.avgSalePrice = nextSaleAverage(current, price)
    next.salePurchaseCount = current.salePurchaseCount + 1
    return setPricesForCurrency(variant, currency, next)
  }

  next.lastPrice = price
  next.avgPrice = nextNormalAverage(current, price)
  return setPricesForCurrency(variant, currency, next)
}

/** Entfernt den letzten Kauf einer Variante (beim Abhaken rückgängig) – vereinfachte Rücknahme. */
export function revertLastPurchaseOnVariant(
  variant: ProductVariant,
  wasSale: boolean,
  currency: Currency = 'CHF'
): ProductVariant {
  const current = pricesForCurrency(variant, currency)
  const next: VariantCurrencyPrices = {
    ...current,
    purchaseCount: Math.max(0, current.purchaseCount - 1),
    lastPurchaseWasSale: false,
  }

  if (wasSale) {
    next.salePurchaseCount = Math.max(0, current.salePurchaseCount - 1)
    if (next.salePurchaseCount === 0) {
      next.lastSalePrice = undefined
      next.avgSalePrice = undefined
    }
    return setPricesForCurrency(variant, currency, next)
  }

  if (next.purchaseCount - next.salePurchaseCount <= 0) {
    next.lastPrice = undefined
    next.avgPrice = undefined
  }
  return setPricesForCurrency(variant, currency, next)
}

export interface ResolvedVariantPurchase {
  profile: ProductPriceProfile
  variant: ProductVariant
  variantId: string
  variantName: string
  createdNewVariant: boolean
  createdNewProfile: boolean
}

function withVariantMeta(variant: ProductVariant, data: CheckoffPriceData, currency: Currency): ProductVariant {
  let next = { ...variant }
  if (data.brandId) next.brandId = data.brandId
  if (data.pricePerKg !== undefined) {
    const prices = pricesForCurrency(next, currency)
    next = setPricesForCurrency(next, currency, { ...prices, pricePerKg: data.pricePerKg })
  }
  return next
}

/** Legt bei Bedarf Profil/Variante an und wendet den Kauf an. */
export function recordVariantPurchase(
  profiles: ProductPriceProfile[],
  itemName: string,
  category: string,
  data: CheckoffPriceData,
  date: string,
  createId: () => string,
  currency: Currency = 'CHF'
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
        applyPurchaseToVariant(profileCopy.variants[idx]!, profilePrice, date, wasSale, currency),
        data,
        currency
      )
      profileCopy.variants[idx] = variant
    }
  }

  if (!variant) {
    const name = (data.variantName || itemName).trim()
    if (!name) throw new Error('Variantenname fehlt')
    const newVariant = withVariantMeta(
      applyPurchaseToVariant(createEmptyVariant(name, createId()), profilePrice, date, wasSale, currency),
      data,
      currency
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

/** Schätzpreis für eine Variante in der aktiven Währung. */
export function estimateVariantPrice(variant: ProductVariant, currency: Currency = 'CHF'): number | null {
  const prices = pricesForCurrency(variant, currency)
  if (prices.lastPrice !== undefined && prices.lastPrice > 0) return prices.lastPrice
  if (prices.avgPrice !== undefined && prices.avgPrice > 0) return prices.avgPrice
  return null
}

/** Wählt die passende Variante für Schätzung (bevorzugt Varianten mit Preis in der aktiven Währung). */
export function pickVariantForEstimate(
  profile: ProductPriceProfile | undefined,
  item: ShoppingItem,
  currency: Currency = 'CHF'
): ProductVariant | undefined {
  if (!profile?.variants.length) return undefined
  if (item.variantId) {
    const chosen = findVariant(profile, item.variantId)
    if (chosen && hasPriceForCurrency(chosen, currency)) return chosen
    if (chosen) return chosen
  }
  if (profile.preferredVariantId) {
    const preferred = findVariant(profile, profile.preferredVariantId)
    if (preferred && hasPriceForCurrency(preferred, currency)) return preferred
  }
  const withPrice = profile.variants
    .filter((v) => hasPriceForCurrency(v, currency))
    .sort((a, b) =>
      (pricesForCurrency(b, currency).lastPurchaseDate || '').localeCompare(
        pricesForCurrency(a, currency).lastPurchaseDate || ''
      )
    )
  if (withPrice[0]) return withPrice[0]
  return profile.variants[0]
}

/** Zuletzt erfasster Kilopreis eines Produkts in der aktiven Währung. */
export function productPricePerKg(
  profiles: ProductPriceProfile[],
  name: string,
  category: string,
  currency: Currency = 'CHF'
): number | null {
  const profile = findPriceProfile(profiles, name, category)
  if (!profile) return null
  const withPerKg = profile.variants
    .map((v) => ({ v, prices: pricesForCurrency(v, currency) }))
    .filter(({ prices }) => prices.pricePerKg !== undefined && prices.pricePerKg > 0)
    .sort((a, b) => (b.prices.lastPurchaseDate || '').localeCompare(a.prices.lastPurchaseDate || ''))
  return withPerKg[0]?.prices.pricePerKg ?? null
}

export function estimateItemPrice(
  profiles: ProductPriceProfile[],
  item: ShoppingItem,
  currency: Currency = 'CHF'
): number | null {
  const profile = findPriceProfile(profiles, item.name, item.category)
  const variant = pickVariantForEstimate(profile, item, currency)
  if (!variant || !hasPriceForCurrency(variant, currency)) return null

  const prices = pricesForCurrency(variant, currency)

  if (isProduceCategory(item.category)) {
    const mode = defaultProducePricingMode(item.name, item.category, item.amount, prices)
    if (mode === 'weight') {
      const perKg = prices.pricePerKg ?? prices.lastPrice ?? prices.avgPrice
      const grams = weightGramsFromAmount(item.amount) ?? estimatedPieceGrams(item.name, item.category, item.amount)
      if (grams && perKg) return roundMoney(perKg * (grams / 1000))
      if (perKg) return perKg
      return null
    }
    const unit = estimateVariantPrice(variant, currency)
    if (unit === null) return null
    return roundMoney(unit * priceQuantityFromAmount(item.amount))
  }

  const grams = explicitWeightGrams(item.amount)
  if (grams && grams > 0 && prices.pricePerKg && prices.pricePerKg > 0) {
    return roundMoney(prices.pricePerKg * (grams / 1000))
  }

  const unit = estimateVariantPrice(variant, currency)
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
  profiles: ProductPriceProfile[],
  currency: Currency = 'CHF'
): ListCostEstimate {
  const open = items.filter((i) => !i.done)
  let total = 0
  let pricedItemCount = 0
  for (const item of open) {
    const price = estimateItemPrice(profiles, item, currency)
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
    const currency = entry.currency ?? 'CHF'
    profile.variants[idx] = applyPurchaseToVariant(variant, entry.price, entry.date, !!entry.wasSale, currency)
    profile.preferredVariantId = variant.id
    profile.updatedAt = Date.now()
  }

  return [...byKey.values()]
}

export function amountToCents(amount: number): number {
  return Math.round(amount * 100)
}
