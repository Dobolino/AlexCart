import { RETAILERS, findRetailer, retailSelection, retailCurrency } from '@/data/retailCatalog'
import type { RetailCountry } from '@/data/retailCatalog'
import type {
  AppSettings,
  CompletedTrip,
  Currency,
  ProductPriceProfile,
  PurchaseLogEntry,
  ShoppingList,
  ShoppingSession,
} from '@/types'
import type { PriceObservation, RetailStore } from '@/types/catalog'
import { timestampToDateKey } from '@/utils/date'
import { refreshPurchaseProfiles } from '@/utils/priceProfiles'
import { observationFromPurchase } from './catalogPurchase'

export function makeShoppingStore(name: string, country: RetailCountry): RetailStore {
  const trimmed = name.trim()
  const id = `${country}:${trimmed.toLocaleLowerCase('de')}`
  return {
    id,
    name: trimmed,
    country,
    currency: retailCurrency(country),
    retailerId: findRetailer(trimmed, country)?.id ?? id,
  }
}

export function locationForList(
  settings: AppSettings,
  stores: RetailStore[],
  list: Pick<ShoppingList, 'id' | 'name'>
): RetailStore {
  const saved = stores.find((store) => store.id === settings.listStoreIds?.[list.id])
  if (saved) return saved
  const choice = retailSelection(settings, list.name)
  const known = findRetailer(list.name, choice.country)
  if (known) return makeShoppingStore(known.name, known.country)
  // Global preferences are a fallback; an explicit choice for this list always wins.
  const preferred = stores.find(
    (store) => store.retailerId === choice.retailerId && store.country === choice.country
  )
  return (
    preferred ??
    makeShoppingStore(RETAILERS.find((retailer) => retailer.id === choice.retailerId)!.name, choice.country)
  )
}

/** Restrict corrections to this session, never all done items or same-name products. */
export function sessionPurchaseIds(
  session: ShoppingSession | null,
  list: ShoppingList | undefined,
  log: PurchaseLogEntry[],
  trips: CompletedTrip[]
): Set<string> {
  if (!session || !list || session.listId !== list.id) return new Set()
  const completed = new Set(
    trips.flatMap((trip) => trip.items.flatMap((item) => (item.purchaseLogId ? [item.purchaseLogId] : [])))
  )
  const ids = new Set<string>()
  for (const item of list.items.filter((item) => item.done && session.checkedItemIds.includes(item.id))) {
    if (
      item.purchaseLogId &&
      log.some((entry) => entry.id === item.purchaseLogId) &&
      !completed.has(item.purchaseLogId)
    ) {
      ids.add(item.purchaseLogId)
      continue
    }
    const candidates = log.filter(
      (entry) =>
        entry.id &&
        entry.itemId === item.id &&
        !completed.has(entry.id) &&
        entry.date >= timestampToDateKey(session.startedAt)
    )
    if (candidates.length === 1) ids.add(candidates[0]!.id!)
  }
  return ids
}

export function hasRecordedPrices(log: PurchaseLogEntry[]) {
  return log.some(
    (entry) => entry.price !== undefined || entry.profilePrice !== undefined || entry.pricePerKg !== undefined
  )
}

export function correctedShoppingCurrency(
  original: Currency,
  target: Currency,
  hasPrices: boolean,
  correctCurrency = false
): Currency {
  return hasPrices && !correctCurrency ? original : target
}

export function relocatePurchases(
  state: {
    purchaseLog: PurchaseLogEntry[]
    priceObservations: PriceObservation[]
    priceProfiles: ProductPriceProfile[]
  },
  ids: Set<string>,
  store: RetailStore | null,
  currency: Currency,
  correctCurrency = false
) {
  const affected = state.purchaseLog.filter((entry) => entry.id && ids.has(entry.id))
  const purchaseLog = state.purchaseLog.map((entry) => {
    if (!entry.id || !ids.has(entry.id)) return entry
    const nextCurrency = hasRecordedPrices([entry]) && !correctCurrency ? (entry.currency ?? 'CHF') : currency
    return {
      ...entry,
      storeId: store?.id,
      currency: nextCurrency,
      referenceUnitPrice: nextCurrency !== (entry.currency ?? 'CHF') ? undefined : entry.referenceUnitPrice,
    }
  })
  const updated = new Map(
    purchaseLog.filter((entry) => entry.id && ids.has(entry.id)).map((entry) => [entry.id!, entry])
  )
  const observed = new Set<string>()
  const priceObservations = state.priceObservations.flatMap((observation) => {
    const entry = observation.purchaseLogId ? updated.get(observation.purchaseLogId) : undefined
    if (!entry) return [observation]
    observed.add(entry.id!)
    return store
      ? [
          {
            ...observation,
            storeId: store.id,
            price: { ...observation.price, currency: entry.currency ?? 'CHF' },
          },
        ]
      : []
  })
  if (store)
    for (const entry of updated.values()) {
      if (observed.has(entry.id!)) continue
      const observation = observationFromPurchase(entry)
      if (observation) priceObservations.push(observation)
    }
  return {
    purchaseLog,
    priceObservations,
    priceProfiles: refreshPurchaseProfiles(state.priceProfiles, purchaseLog, [
      ...affected,
      ...updated.values(),
    ]),
  }
}
