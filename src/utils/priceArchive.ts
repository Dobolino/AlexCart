import { z } from 'zod'
import type { CatalogProduct, PriceObservation, RetailStore } from '@/types/catalog'
import { productSchema, priceObservationSchema, retailStoreSchema } from './catalogSchemas'
import { normalize } from './text'
import { normalizeGtin } from './barcode'

export const PRICE_ARCHIVE_MAX_BYTES = 8 * 1024 * 1024

export interface PriceArchive {
  format: 'alexshop-price-archive'
  version: 1
  catalog: CatalogProduct[]
  retailStores: RetailStore[]
  priceObservations: PriceObservation[]
}

export interface PriceArchiveState {
  catalog: CatalogProduct[]
  retailStores: RetailStore[]
  priceObservations: PriceObservation[]
}

const archiveSchema = z.object({
  format: z.literal('alexshop-price-archive'),
  version: z.literal(1),
  catalog: z.array(productSchema).min(1).max(5000),
  retailStores: z.array(retailStoreSchema).min(1).max(500),
  priceObservations: z.array(priceObservationSchema).min(1).max(20000),
})

const nameKey = (name: string) => normalize(name).replace(/\s+/g, ' ')
const identifierKey = (product: CatalogProduct) => {
  const gtins = product.gtins.map(normalizeGtin)
  return gtins.length && gtins.every((gtin) => gtin !== null)
    ? ['gtins', ...[...new Set(gtins)].sort()]
    : ['id', product.id]
}
const productKey = (product: CatalogProduct) =>
  JSON.stringify([
    nameKey(product.name),
    nameKey(product.brand ?? ''),
    product.netQuantity?.unit ?? '',
    product.netQuantity?.value ?? null,
    // A generic receipt label or a "one pack" placeholder does not prove the same
    // physical product/size across retailers, even when a brand is recognizable.
    product.brand?.trim() && product.netQuantity && product.netQuantity.unit !== 'piece'
      ? null
      : identifierKey(product),
  ])
const storeKey = (store: RetailStore) =>
  JSON.stringify([nameKey(store.retailerId), store.country, store.currency, nameKey(store.name)])
const observationKey = (observation: PriceObservation) =>
  JSON.stringify([
    observation.productId,
    observation.storeId,
    new Date(observation.observedAt).toISOString(),
    observation.basis,
    observation.price.currency,
    observation.price.minor,
    !!observation.discounted,
    !!observation.loyaltyRequired,
    observation.minimumQuantity ?? 1,
    observation.deposit?.currency ?? '',
    observation.deposit?.minor ?? 0,
    observation.validUntil ?? '',
  ])

function assertRealDate(value: string) {
  const date = new Date(value)
  // Date.parse can silently roll an impossible calendar date into the next month.
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value.slice(0, 10))
    throw new Error('Das Preisarchiv enthält ein ungültiges Datum.')
}

function checkedArchive(value: unknown): PriceArchive {
  const result = archiveSchema.safeParse(value)
  if (!result.success) throw new Error('Kein gültiges AlexShop-Preisarchiv (Version 1).')
  const archive = result.data
  const products = new Map<string, CatalogProduct>()
  const stores = new Map<string, RetailStore>()
  const observationIds = new Set<string>()
  const today = new Date().toISOString().slice(0, 10)
  for (const product of archive.catalog) {
    if (products.has(product.id)) throw new Error('Doppelte Produkt-IDs im Preisarchiv.')
    if (!product.name.trim() || !product.category.trim())
      throw new Error('Bitte Artikelname und Kategorie prüfen.')
    if (product.gtins.some((gtin) => normalizeGtin(gtin) === null))
      throw new Error('Das Preisarchiv enthält einen ungültigen Produktbarcode.')
    assertRealDate(product.updatedAt)
    if (product.updatedAt.slice(0, 10) > today)
      throw new Error('Produktdaten dürfen nicht in der Zukunft liegen.')
    products.set(product.id, product)
  }
  for (const store of archive.retailStores) {
    if (stores.has(store.id)) throw new Error('Doppelte Geschäfts-IDs im Preisarchiv.')
    if (
      !store.name.trim() ||
      !store.retailerId.trim() ||
      (store.country === 'CH' ? store.currency !== 'CHF' : store.currency !== 'EUR')
    )
      throw new Error('Land, Geschäft und Währung im Preisarchiv passen nicht zusammen.')
    stores.set(store.id, store)
  }
  for (const observation of archive.priceObservations) {
    if (observationIds.has(observation.id)) throw new Error('Doppelte Preis-IDs im Preisarchiv.')
    observationIds.add(observation.id)
    const product = products.get(observation.productId)
    const store = stores.get(observation.storeId)
    if (!product || !store)
      throw new Error('Ein Bonpreis verweist auf ein unbekanntes Produkt oder Geschäft.')
    if (observation.source !== 'receipt' || observation.purchaseLogId !== undefined)
      throw new Error('Das Preisarchiv darf nur Bonpreise ohne Kaufverknüpfung enthalten.')
    if (observation.price.minor <= 0 || observation.price.currency !== store.currency)
      throw new Error('Bitte Betrag und Originalwährung der Bonpreise prüfen.')
    assertRealDate(observation.observedAt)
    if (observation.observedAt.slice(0, 10) > today)
      throw new Error('Historische Bonpreise dürfen nicht in der Zukunft liegen.')
    if (observation.validUntil) assertRealDate(`${observation.validUntil}T12:00:00.000Z`)
    if (observation.deposit && observation.deposit.currency !== observation.price.currency)
      throw new Error('Pfand und Produktpreis müssen dieselbe Währung haben.')
    if (observation.basis === 'package' && !product.netQuantity)
      throw new Error('Ein Packungspreis benötigt eine bekannte Packungsgröße.')
    if (
      product.netQuantity &&
      ((observation.basis === 'kg' && product.netQuantity.unit !== 'g') ||
        (observation.basis === 'l' && product.netQuantity.unit !== 'ml') ||
        (observation.basis === 'piece' && product.netQuantity.unit !== 'piece'))
    )
      throw new Error('Preisgrundlage und Produktmenge haben unterschiedliche Einheiten.')
  }
  return archive
}

/** A price archive supplements estimates; it is deliberately not a full app backup. */
export function parsePriceArchive(text: string): PriceArchive {
  if (new TextEncoder().encode(text).byteLength > PRICE_ARCHIVE_MAX_BYTES)
    throw new Error('Das Preisarchiv ist zu groß (maximal 8 MB).')
  let value: unknown
  try {
    value = JSON.parse(text.replace(/^\uFEFF/, ''))
  } catch {
    throw new Error('Das Preisarchiv ist keine lesbare JSON-Datei.')
  }
  return checkedArchive(value)
}

/** Validate the complete draft again, then plan a purely additive, atomic import. */
export function preparePriceArchiveImport(
  current: PriceArchiveState,
  input: PriceArchive,
  selectedProductIds?: string[]
) {
  const archive = checkedArchive(input)
  const selected = new Set(selectedProductIds ?? archive.catalog.map((product) => product.id))
  if ([...selected].some((id) => !archive.catalog.some((product) => product.id === id)))
    throw new Error('Die Produktauswahl gehört nicht zu diesem Preisarchiv.')
  const selectedObservations = archive.priceObservations.filter((row) => selected.has(row.productId))
  const requiredProducts = new Set(selectedObservations.map((row) => row.productId))
  const requiredStores = new Set(selectedObservations.map((row) => row.storeId))
  const catalog = [...current.catalog]
  const retailStores = [...current.retailStores]
  const priceObservations = [...current.priceObservations]
  const productById = new Map(catalog.map((product) => [product.id, product]))
  const storeById = new Map(retailStores.map((store) => [store.id, store]))
  const productIdentities = new Map(catalog.map((product) => [productKey(product), product.id]))
  const storeIdentities = new Map(retailStores.map((store) => [storeKey(store), store.id]))
  const productIds = new Map<string, string>()
  const storeIds = new Map<string, string>()
  for (const product of archive.catalog.filter((product) => requiredProducts.has(product.id))) {
    const key = productKey(product)
    const existing = productById.get(product.id)
    if (existing && productKey(existing) !== key)
      throw new Error('Eine Produkt-ID ist bereits anders belegt. Bitte die Zuordnung prüfen.')
    const matchingId = existing?.id ?? productIdentities.get(key)
    if (matchingId) productIds.set(product.id, matchingId)
    else {
      catalog.push(product)
      productById.set(product.id, product)
      productIdentities.set(key, product.id)
      productIds.set(product.id, product.id)
    }
  }
  for (const store of archive.retailStores.filter((store) => requiredStores.has(store.id))) {
    const key = storeKey(store)
    const existing = storeById.get(store.id)
    if (existing && storeKey(existing) !== key)
      throw new Error('Eine Geschäfts-ID ist bereits anders belegt. Bitte das Geschäft prüfen.')
    const matchingId = existing?.id ?? storeIdentities.get(key)
    if (matchingId) storeIds.set(store.id, matchingId)
    else {
      retailStores.push(store)
      storeById.set(store.id, store)
      storeIdentities.set(key, store.id)
      storeIds.set(store.id, store.id)
    }
  }
  const existingObservations = new Map(priceObservations.map((row) => [row.id, row]))
  const observed = new Set(priceObservations.map(observationKey))
  let addedObservations = 0
  for (const observation of selectedObservations) {
    const next: PriceObservation = {
      ...observation,
      productId: productIds.get(observation.productId)!,
      storeId: storeIds.get(observation.storeId)!,
    }
    const key = observationKey(next)
    const existing = existingObservations.get(next.id)
    if (existing && observationKey(existing) !== key)
      throw new Error('Eine Preis-ID ist bereits anders belegt. Bestehende Preise werden nicht ersetzt.')
    if (existing || observed.has(key)) continue
    priceObservations.push(next)
    existingObservations.set(next.id, next)
    observed.add(key)
    addedObservations++
  }
  if (catalog.length > 5000 || retailStores.length > 500 || priceObservations.length > 20000)
    throw new Error('Zu viele Produkte oder Preisbeobachtungen. Bitte eine kleinere Auswahl importieren.')
  return {
    catalog,
    retailStores,
    priceObservations,
    addedProducts: catalog.length - current.catalog.length,
    addedObservations,
    skippedObservations: selectedObservations.length - addedObservations,
  }
}
