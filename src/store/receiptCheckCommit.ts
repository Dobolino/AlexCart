import Decimal from 'decimal.js'
import type { CompletedTrip, PurchaseLogEntry, ProductPriceProfile } from '@/types'
import type { PriceObservation } from '@/types/catalog'
import { baseQuantity } from '@/utils/quantity'
import { priceQuantityFromAmount } from '@/utils/amount'
import { refreshPurchaseProfiles } from '@/utils/priceProfiles'
import { observationFromPurchase } from './catalogPurchase'
import { dateKeyToTimestamp } from '@/utils/date'

export function repriceReceiptItems(
  state: {
    completedTrips: CompletedTrip[]
    purchaseLog: PurchaseLogEntry[]
    priceProfiles: ProductPriceProfile[]
    priceObservations: PriceObservation[]
  },
  tripId: string,
  changes: ReadonlyMap<string, number | undefined>,
  options: { amounts?: ReadonlyMap<string, string>; date?: string } = {}
) {
  const trip = state.completedTrips.find((trip) => trip.id === tripId)!
  const logChanges = new Map(
    trip.items
      .filter(
        (item) =>
          (changes.has(item.id) || options.amounts?.has(item.id) || options.date) && item.purchaseLogId
      )
      .map((item) => [item.purchaseLogId!, item])
  )
  const affected = state.purchaseLog.filter((entry) => entry.id && logChanges.has(entry.id))
  const purchaseLog = state.purchaseLog.map((entry) => {
    if (!entry.id || !logChanges.has(entry.id)) return entry
    const item = logChanges.get(entry.id)!
    if (!changes.has(item.id) && !options.amounts?.has(item.id))
      return { ...entry, date: options.date ?? entry.date }
    const price = changes.has(item.id) ? changes.get(item.id) : entry.price
    const amount = options.amounts?.get(item.id) ?? entry.amount
    const quantity = amount ? baseQuantity(amount) : null
    const ratio =
      entry.pricePerKg !== undefined && quantity?.unit === 'g' && quantity.value > 0
        ? quantity.value / 1000
        : options.amounts?.has(item.id)
          ? priceQuantityFromAmount(amount ?? '')
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
      amount,
      date: options.date ?? entry.date,
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
    const item = logChanges.get(entry.id!)!
    if (!changes.has(item.id) && !options.amounts?.has(item.id))
      return [{ ...observation, observedAt: new Date(`${entry.date}T12:00:00`).toISOString() }]
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
            completedAt: options.date ? dateKeyToTimestamp(options.date) : entry.completedAt,
            items: entry.items.map((item) =>
              changes.has(item.id) || options.amounts?.has(item.id)
                ? {
                    ...item,
                    ...(changes.has(item.id) ? { price: changes.get(item.id) } : {}),
                    ...(options.amounts?.has(item.id) ? { amount: options.amounts.get(item.id)! } : {}),
                  }
                : item
            ),
          }
    ),
  }
}
