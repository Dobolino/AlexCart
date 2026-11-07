import Decimal from 'decimal.js'
import type { CompletedTrip, PurchaseLogEntry, ProductPriceProfile } from '@/types'
import type { CatalogProduct, PriceObservation, RetailStore } from '@/types/catalog'
import { receiptRowKey, type ReceiptCheckRow } from '@/utils/receiptCheck'
import { uid } from '@/utils/id'
import { timestampToDateKey } from '@/utils/date'
import { parsePackAmount, priceQuantityFromAmount } from '@/utils/amount'
import { baseQuantity, quantityText } from '@/utils/quantity'
import { recordVariantPurchase, upsertPriceProfile, refreshPurchaseProfiles } from '@/utils/priceProfiles'
import { observationFromPurchase } from './catalogPurchase'

/** Append only explicitly selected rows to the historical trip. No current-list or stock movements. */
export function appendReceiptCheckItems(
  state: {
    completedTrips: CompletedTrip[]
    purchaseLog: PurchaseLogEntry[]
    priceProfiles: ProductPriceProfile[]
    priceObservations: PriceObservation[]
    catalog: CatalogProduct[]
    retailStores: RetailStore[]
  },
  tripId: string,
  rows: ReceiptCheckRow[],
  store: RetailStore
) {
  const trip = state.completedTrips.find((trip) => trip.id === tripId)!
  const catalog = [...state.catalog],
    purchaseLog = [...state.purchaseLog],
    priceObservations = [...state.priceObservations]
  let priceProfiles = state.priceProfiles
  const addedItems = rows.map((row) => {
    const name = row.newName!.trim(),
      amount = row.amount.trim(),
      category = row.category!
    const pack = parsePackAmount(amount),
      quantity = baseQuantity(amount)
    const netQuantity = row.addAsWeight
      ? undefined
      : pack
        ? (baseQuantity(`${pack.packValue} ${pack.packUnit}`) ?? undefined)
        : quantity?.unit === 'piece'
          ? { value: 1, unit: 'piece' as const }
          : (quantity ?? undefined)
    let product = row.productId ? catalog.find((product) => product.id === row.productId) : undefined
    if (!product) {
      product = {
        id: uid(),
        name,
        category,
        gtins: [],
        netQuantity,
        source: 'manual',
        updatedAt: new Date().toISOString(),
      }
      catalog.push(product)
    }
    const price = row.minor / 100
    const divisor = row.addAsWeight ? quantity!.value / 1000 : priceQuantityFromAmount(amount)
    const unitPrice = new Decimal(price).div(divisor).toDecimalPlaces(8).toNumber()
    const packageSize = product.netQuantity ?? netQuantity
    const variantName = `${trip.store ?? store.name} · ${row.addAsWeight ? 'pro kg' : packageSize ? quantityText(packageSize) : 'pro Stück'}`
    const purchase = recordVariantPurchase(
      priceProfiles,
      name,
      category,
      {
        price,
        unitPrice,
        pricePerKg: row.addAsWeight ? unitPrice : undefined,
        wasSale: (row.discountMinor ?? 0) < 0,
        variantName,
      },
      timestampToDateKey(trip.completedAt),
      uid,
      trip.currency ?? 'CHF'
    )
    priceProfiles = upsertPriceProfile(priceProfiles, purchase.profile)
    const entry: PurchaseLogEntry = {
      id: uid(),
      itemId: uid(),
      name,
      category,
      amount,
      price,
      profilePrice: unitPrice,
      pricePerKg: row.addAsWeight ? unitPrice : undefined,
      productId: product.id,
      storeId: store.id,
      currency: trip.currency ?? 'CHF',
      date: timestampToDateKey(trip.completedAt),
      variantId: purchase.variantId,
      variantName: purchase.variantName,
      wasSale: (row.discountMinor ?? 0) < 0,
    }
    purchaseLog.push(entry)
    const observation = observationFromPurchase(entry)
    if (observation) priceObservations.push(observation)
    return {
      id: entry.itemId!,
      purchaseLogId: entry.id!,
      name,
      amount,
      price,
      receiptKey: receiptRowKey(row),
    }
  })
  return {
    catalog,
    purchaseLog,
    priceObservations,
    priceProfiles: refreshPurchaseProfiles(
      priceProfiles,
      purchaseLog,
      purchaseLog.slice(state.purchaseLog.length)
    ),
    retailStores: state.retailStores.some((entry) => entry.id === store.id)
      ? state.retailStores
      : [...state.retailStores, store],
    completedTrips: state.completedTrips.map((entry) =>
      entry.id === tripId
        ? { ...entry, storeId: store.id, country: store.country, items: [...entry.items, ...addedItems] }
        : entry
    ),
    addedItems,
  }
}
