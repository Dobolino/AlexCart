import Decimal from 'decimal.js'
import type { Currency, ProductVariant, PurchaseLogEntry, ShoppingItem } from '@/types'
import type { CatalogProduct, PriceObservation, RetailStore } from '@/types/catalog'
import { findRetailer } from '@/data/retailCatalog'
import { normalize } from './text'
import { baseQuantity } from './quantity'
import { isCountUnit, parseAmount, parsePackAmount } from './amount'
import { estimatedPieceGrams, isProduceCategory, weightGramsFromAmount } from './producePrice'

export interface PriceEstimateContext {
  catalog: CatalogProduct[]
  observations: PriceObservation[]
  stores: RetailStore[]
  storeId?: string
  storeName?: string
  now?: Date
  purchaseLog?: PurchaseLogEntry[]
}

const key = (name: string) => normalize(name)
const positive = (value: number) => Number.isFinite(value) && value > 0

/** A missing amount must never silently mean one package in a reference estimate. */
export function hasEstimateQuantity(amount: string): boolean {
  const quantity = baseQuantity(amount)
  if (quantity) return positive(quantity.value)
  const parsed = parseAmount(amount)
  return !!parsed && positive(parsed.value) && isCountUnit(parsed.unit)
}

function estimateStore(context: PriceEstimateContext, currency: Currency) {
  const store = context.stores.find((entry) => entry.id === context.storeId)
  const name = store?.name ?? context.storeName
  const country = currency === 'CHF' ? 'CH' : 'DE'
  return {
    id: context.storeId,
    name,
    retailer: store?.retailerId ?? (name ? findRetailer(name, country)?.id : undefined),
    selected: !!(context.storeId || context.storeName),
    compatible: !store || store.currency === currency,
  }
}

/** A named brand is not evidence of which retailer supplied a profile price. */
export function variantMatchesEstimateStore(
  variant: ProductVariant,
  currency: Currency,
  context: PriceEstimateContext
): boolean {
  const selected = estimateStore(context, currency)
  if (!selected.compatible) return false
  if (!selected.selected) return true
  if (variant.store && (variant.store === selected.id || key(variant.store) === key(selected.name ?? '')))
    return true
  const known = context.stores.find((store) => store.id === variant.store)
  const retailer =
    known?.retailerId ?? findRetailer(variant.store ?? variant.name, currency === 'CHF' ? 'CH' : 'DE')?.id
  return !!selected.retailer && retailer === selected.retailer && (!known || known.currency === currency)
}

function observationMatchesStore(
  observation: Pick<PriceObservation, 'storeId'>,
  currency: Currency,
  context: PriceEstimateContext
) {
  const selected = estimateStore(context, currency)
  if (!selected.compatible) return false
  const store = context.stores.find((entry) => entry.id === observation.storeId)
  if (!store || store.currency !== currency) return false
  if (!selected.selected) return true
  if (selected.id === store.id) return true
  return selected.retailer
    ? selected.retailer === store.retailerId
    : !!selected.name && key(selected.name) === key(store.name)
}

function packageCount(item: ShoppingItem, product: CatalogProduct): number | null {
  const size = product.netQuantity
  if (!size || !positive(size.value)) return null
  const pack = parsePackAmount(item.amount)
  if (pack) {
    const one = baseQuantity(`${pack.packValue} ${pack.packUnit}`)
    return one && one.unit === size.unit && one.value === size.value ? pack.count : null
  }
  const amount = parseAmount(item.amount)
  if (amount && isCountUnit(amount.unit))
    return positive(amount.value) && Number.isInteger(amount.value) ? amount.value : null
  const quantity = baseQuantity(item.amount)
  if (!quantity || !positive(quantity.value) || quantity.unit !== size.unit) return null
  return Math.ceil(quantity.value / size.value)
}

function observationPrice(item: ShoppingItem, product: CatalogProduct, observation: PriceObservation) {
  const amount = new Decimal(observation.price.minor).div(100)
  if (observation.basis === 'package') {
    const count = packageCount(item, product)
    return count ? amount.times(count).toDecimalPlaces(2).toNumber() : null
  }
  const quantity = baseQuantity(item.amount)
  if (observation.basis === 'piece') {
    const count = parseAmount(item.amount)
    return count && isCountUnit(count.unit) && positive(count.value) && Number.isInteger(count.value)
      ? amount.times(count.value).toDecimalPlaces(2).toNumber()
      : null
  }
  const unit = observation.basis === 'kg' ? 'g' : 'ml'
  if (product.netQuantity && product.netQuantity.unit !== unit) return null
  return quantity && quantity.unit === unit && positive(quantity.value)
    ? amount.times(quantity.value).div(1000).toDecimalPlaces(2).toNumber()
    : null
}

export interface ReferencePriceEstimate {
  price: number
  observedAt: string
}

/** Read individual normal purchases, never an aggregate that may mix several retailers. */
export function estimatePersonalPrice(
  item: ShoppingItem,
  currency: Currency,
  context: PriceEstimateContext,
  preferredVariantId?: string
): ReferencePriceEstimate | null {
  const now = (context.now ?? new Date()).getTime()
  let entries = (context.purchaseLog ?? [])
    .filter(
      (entry) =>
        key(entry.name) === key(item.name) &&
        key(entry.category) === key(item.category) &&
        (entry.currency ?? 'CHF') === currency &&
        !entry.wasSale &&
        positive(entry.price ?? 0) &&
        (!item.variantId || entry.variantId === item.variantId) &&
        (!item.productId || entry.productId === item.productId) &&
        Number.isFinite(Date.parse(entry.date)) &&
        Date.parse(entry.date) <= now &&
        !!entry.storeId &&
        observationMatchesStore({ storeId: entry.storeId }, currency, context)
    )
    .reverse()
    .sort((a, b) => b.date.localeCompare(a.date))
  const branch = entries.filter((entry) => entry.storeId === context.storeId)
  if (branch.length) entries = branch
  if (!estimateStore(context, currency).selected && new Set(entries.map((entry) => entry.storeId)).size > 1)
    return null
  const preferred =
    !item.variantId && preferredVariantId
      ? entries.filter((entry) => entry.variantId === preferredVariantId)
      : []
  if (preferred.length) entries = preferred
  for (const entry of entries) {
    if (entry.pricePerKg !== undefined) {
      if (!positive(entry.pricePerKg)) continue
      const grams =
        weightGramsFromAmount(item.amount) ??
        (isProduceCategory(item.category) ? estimatedPieceGrams(item.name, item.category, item.amount) : null)
      if (grams && positive(grams))
        return {
          price: new Decimal(entry.pricePerKg).times(grams).div(1000).toDecimalPlaces(2).toNumber(),
          observedAt: entry.date,
        }
      continue
    }
    const pack = parsePackAmount(entry.amount)
    const quantity = baseQuantity(entry.amount ?? '')
    const count = parseAmount(entry.amount)
    const catalogProduct = item.productId
      ? context.catalog.find((product) => product.id === item.productId)
      : undefined
    const size =
      catalogProduct?.netQuantity ??
      (pack
        ? baseQuantity(`${pack.packValue} ${pack.packUnit}`)
        : quantity?.unit !== 'piece'
          ? quantity
          : null) ??
      ((count && isCountUnit(count.unit)) ||
      (parseAmount(item.amount) && isCountUnit(parseAmount(item.amount)!.unit))
        ? { value: 1, unit: 'piece' as const }
        : null)
    if (!size) continue
    const product: CatalogProduct = {
      id: item.productId ?? 'personal',
      gtins: [],
      name: item.name,
      category: item.category,
      netQuantity: size,
      source: 'manual',
      updatedAt: entry.date,
    }
    const needed = packageCount(item, product)
    const purchased = entry.amount ? packageCount({ ...item, amount: entry.amount }, product) : null
    const unitPrice =
      entry.profilePrice ?? (purchased ? new Decimal(entry.price!).div(purchased).toNumber() : undefined)
    if (needed && unitPrice !== undefined && positive(unitPrice))
      return {
        price: new Decimal(unitPrice).times(needed).toDecimalPlaces(2).toNumber(),
        observedAt: entry.date,
      }
  }
  return null
}

/** Historical references supplement personal profiles; they never create purchases. */
export function estimateReferencePrice(
  item: ShoppingItem,
  currency: Currency,
  context: PriceEstimateContext
): ReferencePriceEstimate | null {
  if (!hasEstimateQuantity(item.amount) || (item.variantId && !item.productId)) return null
  const now = (context.now ?? new Date()).getTime()
  if (!Number.isFinite(now)) return null
  const products = context.catalog.filter((product) =>
    item.productId
      ? product.id === item.productId
      : key(product.name) === key(item.name) && key(product.category) === key(item.category)
  )
  let candidates = context.observations.flatMap((observation) => {
    const product = products.find((entry) => entry.id === observation.productId)
    const date = Date.parse(observation.observedAt)
    const validUntil = observation.validUntil
      ? Date.parse(observation.validUntil + 'T23:59:59.999Z')
      : undefined
    if (
      !product ||
      observation.source !== 'receipt' ||
      observation.price.currency !== currency ||
      !Number.isSafeInteger(observation.price.minor) ||
      observation.price.minor <= 0 ||
      observation.discounted ||
      observation.loyaltyRequired ||
      observation.minimumQuantity !== undefined ||
      !Number.isFinite(date) ||
      date > now ||
      (validUntil !== undefined && (!Number.isFinite(validUntil) || validUntil < now)) ||
      !observationMatchesStore(observation, currency, context)
    )
      return []
    const price = observationPrice(item, product, observation)
    return price !== null && positive(price) ? [{ product, observation, price }] : []
  })
  if (!candidates.length) return null
  const exactStore = context.storeId
    ? candidates.filter(({ observation }) => observation.storeId === context.storeId)
    : []
  if (exactStore.length) candidates = exactStore
  // A physical quantity can identify an exact package; a generic "2 Packungen" cannot.
  if (!item.productId && !parsePackAmount(item.amount)) {
    const requested = baseQuantity(item.amount)
    if (requested && requested.unit !== 'piece') {
      const exact = candidates.filter(
        ({ product, observation }) =>
          observation.basis !== 'package' ||
          (product.netQuantity?.unit === requested.unit && product.netQuantity.value === requested.value)
      )
      if (exact.length) candidates = exact
    }
  }
  const identities = new Set(
    candidates.map(({ product, observation }) =>
      JSON.stringify([
        !product.gtins.length && (!product.brand?.trim() || product.netQuantity?.unit === 'piece')
          ? product.id
          : undefined,
        key(product.brand ?? ''),
        observation.basis,
        observation.basis === 'package'
          ? `${product.netQuantity?.unit}:${product.netQuantity?.value}`
          : undefined,
      ])
    )
  )
  if (identities.size !== 1) return null
  if (
    !estimateStore(context, currency).selected &&
    new Set(candidates.map(({ observation }) => observation.storeId)).size > 1
  )
    return null
  candidates.sort((a, b) => b.observation.observedAt.localeCompare(a.observation.observedAt))
  return { price: candidates[0]!.price, observedAt: candidates[0]!.observation.observedAt }
}
