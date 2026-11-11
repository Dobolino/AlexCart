import type { CompletedTrip, CompletedTripItem, Currency, GlobalBrand, ProductPriceProfile, PurchaseLogEntry } from '@/types'
import type { CatalogProduct, PriceObservation } from '@/types/catalog'
import type { ReceiptCheckRow } from '@/utils/receiptCheck'
import { receiptBrandKey as brandSearchKey } from '@/data/receiptVocabulary'
import { uid } from '@/utils/id'
import { baseQuantity, quantityText } from '@/utils/quantity'
import { parsePackAmount } from '@/utils/amount'
import { quantityMismatch, receiptQuantity } from '@/utils/receiptCheck'
import {
  recordVariantPurchase,
  ensureBrandVariant,
  refreshPurchaseProfiles,
  upsertPriceProfile,
} from '@/utils/priceProfiles'
import { observationFromPurchase } from './catalogPurchase'

/** Trip-Positionen, die ein Bon-Abgleich tatsächlich verändert - Preis/Menge/Marke je Zeile,
 *  Entfernungen, oder jede Position, wenn das Bon-Datum rückwirkend auf den Einkauf übernommen wird. */
export function receiptChangingItems(
  trip: CompletedTrip,
  comparisonRows: ReceiptCheckRow[],
  removedIds: Set<string>,
  dateUpdated: boolean
): CompletedTripItem[] {
  const changes = new Set(comparisonRows.filter((row) => row.apply).map((row) => row.targetId))
  const amounts = new Set(comparisonRows.filter((row) => row.applyAmount).map((row) => row.targetId))
  const brandChanges = comparisonRows.filter((row) => row.applyBrand)
  return trip.items.filter(
    (item) =>
      changes.has(item.id) ||
      amounts.has(item.id) ||
      removedIds.has(item.id) ||
      brandChanges.some((row) => row.targetId === item.id) ||
      dateUpdated
  )
}

/** Ob das Übernehmen der Bon-Zeile für diese Trip-Position mit der verknüpften Kaufhistorie
 *  kollidiert (Marke, Menge oder Währung weicht ab) - einzige Quelle für diese Prüfung, von
 *  Commit-Guard (useStore.ts) und Speichern-Button-Sperre (ReceiptCheckSheet.tsx) gleichermassen
 *  genutzt, damit die UI nie etwas als unbedenklich zeigt, das der Commit ablehnt. */
export function findReceiptCommitConflict(
  state: {
    purchaseLog: PurchaseLogEntry[]
    priceProfiles: ProductPriceProfile[]
    catalog: CatalogProduct[]
    brands: GlobalBrand[]
  },
  item: CompletedTripItem,
  row: ReceiptCheckRow | undefined,
  evidenceCurrency: Currency
): boolean {
  const entry = state.purchaseLog.find((entry) => entry.id === item.purchaseLogId)
  if (!entry) return false
  const variant = state.priceProfiles
    .flatMap((profile) => profile.variants)
    .find((variant) => variant.id === entry.variantId)
  const knownBrand =
    item.brandName ??
    state.catalog.find((product) => product.id === entry.productId)?.brand ??
    state.brands.find((brand) => brand.id === variant?.brandId)?.name
  const wrongBrand =
    !!row &&
    (row.apply || row.applyAmount) &&
    !!knownBrand &&
    !!row.brandName &&
    brandSearchKey(knownBrand) !== brandSearchKey(row.brandName) &&
    !row.applyBrand
  const nextQuantity = row ? receiptQuantity(row.amount) : null
  const previousQuantity = receiptQuantity(entry.amount ?? '')
  return (
    (entry.currency ?? 'CHF') !== evidenceCurrency ||
    wrongBrand ||
    !!(row?.apply && !row.applyAmount && quantityMismatch(row.amount, entry.amount ?? '')) ||
    !!(row?.applyAmount && entry.pricePerKg !== undefined && nextQuantity?.unit !== 'g') ||
    !!(row?.applyAmount && previousQuantity && nextQuantity?.unit !== previousQuantity.unit)
  )
}

export function receiptTripWithBrands(
  state: {
    purchaseLog: PurchaseLogEntry[]
    priceProfiles: ProductPriceProfile[]
    catalog: CatalogProduct[]
    brands: GlobalBrand[]
  },
  trip: CompletedTrip
): CompletedTrip {
  const logs = new Map(state.purchaseLog.flatMap((entry) => (entry.id ? [[entry.id, entry] as const] : [])))
  const variants = new Map(
    state.priceProfiles.flatMap((profile) => profile.variants).map((variant) => [variant.id, variant])
  )
  const products = new Map(state.catalog.map((product) => [product.id, product]))
  const brands = new Map(state.brands.map((brand) => [brand.id, brand]))
  return {
    ...trip,
    items: trip.items.map((item) => {
      const entry = logs.get(item.purchaseLogId ?? ''),
        variant = variants.get(entry?.variantId ?? '')
      return {
        ...item,
        brandName:
          item.brandName ??
          products.get(entry?.productId ?? '')?.brand ??
          brands.get(variant?.brandId ?? '')?.name,
      }
    }),
  }
}

export function resolveReceiptBrands(brands: GlobalBrand[], rows: ReceiptCheckRow[]): GlobalBrand[] {
  const next = [...brands]
  for (const row of rows) {
    const name = row.brandName?.trim()
    if (
      (row.add || row.applyBrand) &&
      name &&
      !next.some((brand) => brandSearchKey(brand.name) === brandSearchKey(name))
    )
      next.push({ id: uid(), name, createdAt: Date.now() })
  }
  return next
}
export function receiptPackageSize(amount: string, weighted: boolean) {
  if (weighted) return undefined
  const pack = parsePackAmount(amount),
    quantity = baseQuantity(amount)
  return pack
    ? (baseQuantity(`${pack.packValue} ${pack.packUnit}`) ?? undefined)
    : quantity?.unit === 'piece'
      ? { value: 1, unit: 'piece' as const }
      : (quantity ?? undefined)
}
export function receiptVariantName(
  store: string,
  brand: string | undefined,
  size: CatalogProduct['netQuantity'],
  weighted: boolean
) {
  return `${store} · ${brand ? `${brand} · ` : ''}${weighted ? 'pro kg' : size ? quantityText(size) : 'pro Stück'}`
}

/** Move only this purchase to its confirmed brand; never retag a variant shared by older purchases. */
export function correctReceiptBrands(
  state: {
    completedTrips: CompletedTrip[]
    purchaseLog: PurchaseLogEntry[]
    priceProfiles: ProductPriceProfile[]
    priceObservations: PriceObservation[]
    brands: GlobalBrand[]
    catalog: CatalogProduct[]
  },
  tripId: string,
  rows: ReceiptCheckRow[]
) {
  const trip = state.completedTrips.find((trip) => trip.id === tripId)!
  const selected = new Map(rows.filter((row) => row.applyBrand).map((row) => [row.targetId, row]))
  const byLog = new Map(
    trip.items
      .filter((item) => item.purchaseLogId && selected.has(item.id))
      .map((item) => [item.purchaseLogId!, selected.get(item.id)!])
  )
  const catalog = [...state.catalog]
  let profiles = state.priceProfiles
  const affected: PurchaseLogEntry[] = []
  const purchaseLog = state.purchaseLog.map((entry) => {
    const row = entry.id ? byLog.get(entry.id) : undefined
    if (!row) return entry
    affected.push(entry)
    const brandName = row.brandName?.trim() || undefined
    const brand = state.brands.find((brand) => brandSearchKey(brand.name) === brandSearchKey(brandName ?? ''))
    const oldProduct = catalog.find((product) => product.id === entry.productId)
    const size =
      oldProduct?.netQuantity ?? receiptPackageSize(entry.amount ?? '', entry.pricePerKg !== undefined)
    let product =
      oldProduct && brandSearchKey(oldProduct.brand ?? '') === brandSearchKey(brandName ?? '')
        ? oldProduct
        : undefined
    if (!product)
      product = catalog.find(
        (candidate) =>
          brandSearchKey(candidate.name) === brandSearchKey(entry.name) &&
          brandSearchKey(candidate.brand ?? '') === brandSearchKey(brandName ?? '') &&
          JSON.stringify(candidate.netQuantity) === JSON.stringify(size)
      )
    if (!product) {
      product = {
        id: uid(),
        name: entry.name,
        brand: brandName,
        category: entry.category,
        gtins: [],
        netQuantity: size,
        source: 'manual',
        updatedAt: new Date().toISOString(),
      }
      catalog.push(product)
    }
    const variantName = receiptVariantName(
      trip.store ?? 'Bon',
      brandName,
      size,
      entry.pricePerKg !== undefined
    )
    let variantId = entry.variantId
    if (entry.price !== undefined && entry.price > 0) {
      const purchase = recordVariantPurchase(
        profiles,
        entry.name,
        entry.category,
        {
          price: entry.price,
          unitPrice: entry.profilePrice ?? entry.price,
          pricePerKg: entry.pricePerKg,
          brandId: brand?.id,
          variantName,
          wasSale: !!entry.wasSale,
        },
        entry.date,
        uid,
        entry.currency ?? trip.currency ?? 'CHF'
      )
      profiles = upsertPriceProfile(profiles, purchase.profile)
      variantId = purchase.variantId
    } else if (brand) {
      const ensured = ensureBrandVariant(profiles, entry.name, entry.category, brand.id, brand.name, uid)
      profiles = ensured.profiles
      variantId = ensured.variantId
    }
    const updated = {
      ...entry,
      productId: product.id,
      variantId: !brand && !(entry.price && entry.price > 0) ? undefined : variantId,
      variantName,
    }
    affected.push(updated)
    return updated
  })
  const updatedLogs = new Map(
    purchaseLog.filter((entry) => entry.id && byLog.has(entry.id)).map((entry) => [entry.id!, entry])
  )
  const seen = new Set<string>()
  const priceObservations = state.priceObservations.flatMap((observation) => {
    const entry = observation.purchaseLogId ? updatedLogs.get(observation.purchaseLogId) : undefined
    if (!entry) return [observation]
    seen.add(entry.id!)
    const updated = observationFromPurchase(entry)
    return updated ? [{ ...observation, ...updated }] : []
  })
  for (const entry of updatedLogs.values())
    if (!seen.has(entry.id!)) {
      const observation = observationFromPurchase(entry)
      if (observation) priceObservations.push(observation)
    }
  return {
    catalog,
    purchaseLog,
    priceObservations,
    priceProfiles: refreshPurchaseProfiles(profiles, purchaseLog, affected),
    completedTrips: state.completedTrips.map((entry) =>
      entry.id !== tripId
        ? entry
        : {
            ...entry,
            items: entry.items.map((item) =>
              selected.has(item.id)
                ? { ...item, brandName: selected.get(item.id)!.brandName?.trim() || undefined }
                : item
            ),
          }
    ),
  }
}
