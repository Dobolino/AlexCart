import Decimal from 'decimal.js'
import type { CompletedTrip, PurchaseLogEntry, ProductPriceProfile } from '@/types'
import type { PriceObservation } from '@/types/catalog'
import { baseQuantity } from '@/utils/quantity'
import { priceQuantityFromAmount } from '@/utils/amount'
import { refreshPurchaseProfiles } from '@/utils/priceProfiles'
import { observationFromPurchase } from './catalogPurchase'

export function repriceReceiptItems(
  state: {
    completedTrips: CompletedTrip[]
    purchaseLog: PurchaseLogEntry[]
    priceProfiles: ProductPriceProfile[]
    priceObservations: PriceObservation[]
  },
  tripId: string,
  changes: ReadonlyMap<string, number | undefined>
) {
  const trip = state.completedTrips.find((trip) => trip.id === tripId)!
  const logChanges = new Map(
    trip.items
      .filter((item) => changes.has(item.id) && item.purchaseLogId)
      .map((item) => [item.purchaseLogId!, changes.get(item.id)])
  )
  const affected = state.purchaseLog.filter((entry) => entry.id && logChanges.has(entry.id))
  const purchaseLog = state.purchaseLog.map((entry) => {
    if (!entry.id || !logChanges.has(entry.id)) return entry
    const price = logChanges.get(entry.id)
    const quantity = entry.amount ? baseQuantity(entry.amount) : null
    const ratio =
      entry.pricePerKg !== undefined && quantity?.unit === 'g' && quantity.value > 0
        ? quantity.value / 1000
        : entry.profilePrice && entry.price
          ? new Decimal(entry.price).div(entry.profilePrice).toNumber()
          : priceQuantityFromAmount(entry.amount ?? '')
    const profilePrice =
      price === undefined
        ? undefined
        : new Decimal(price)
            .div(ratio > 0 ? ratio : 1)
            .toDecimalPlaces(8)
            .toNumber()
    return {
      ...entry,
      price,
      profilePrice,
      pricePerKg: entry.pricePerKg === undefined ? undefined : profilePrice,
    }
  })
  const updated = new Map(
    purchaseLog.filter((entry) => entry.id && logChanges.has(entry.id)).map((entry) => [entry.id!, entry])
  )
  const observed = new Set<string>()
  const priceObservations = state.priceObservations.flatMap((observation) => {
    const entry = observation.purchaseLogId ? updated.get(observation.purchaseLogId) : undefined
    if (!entry) return [observation]
    observed.add(entry.id!)
    const next = observationFromPurchase(entry)
    return next ? [{ ...observation, ...next }] : []
  })
  for (const entry of updated.values())
    if (!observed.has(entry.id!)) {
      const next = observationFromPurchase(entry)
      if (next) priceObservations.push(next)
    }
  return {
    purchaseLog,
    priceObservations,
    priceProfiles: refreshPurchaseProfiles(state.priceProfiles, purchaseLog, affected),
    completedTrips: state.completedTrips.map((entry) =>
      entry.id !== tripId
        ? entry
        : {
            ...entry,
            items: entry.items.map((item) =>
              changes.has(item.id) ? { ...item, price: changes.get(item.id) } : item
            ),
          }
    ),
  }
}
