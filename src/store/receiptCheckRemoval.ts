import type { CompletedTrip, PurchaseLogEntry, ProductPriceProfile, ShoppingList } from '@/types'
import type { PriceObservation } from '@/types/catalog'
import { refreshPurchaseProfiles } from '@/utils/priceProfiles'

export function removeReceiptItems(
  state: {
    completedTrips: CompletedTrip[]
    purchaseLog: PurchaseLogEntry[]
    priceProfiles: ProductPriceProfile[]
    priceObservations: PriceObservation[]
    lists: ShoppingList[]
  },
  tripId: string,
  ids: Set<string>
) {
  const trip = state.completedTrips.find((trip) => trip.id === tripId)!
  const linked = new Set(
    trip.items
      .filter((item) => ids.has(item.id))
      .flatMap((item) => (item.purchaseLogId ? [item.purchaseLogId] : []))
  )
  const removed = state.purchaseLog.filter((entry) => entry.id && linked.has(entry.id))
  const purchaseLog = state.purchaseLog.filter((entry) => !entry.id || !linked.has(entry.id))
  return {
    purchaseLog,
    priceProfiles: refreshPurchaseProfiles(state.priceProfiles, purchaseLog, removed),
    priceObservations: state.priceObservations.filter(
      (entry) => !entry.purchaseLogId || !linked.has(entry.purchaseLogId)
    ),
    completedTrips: state.completedTrips.map((entry) =>
      entry.id === tripId ? { ...entry, items: entry.items.filter((item) => !ids.has(item.id)) } : entry
    ),
    lists: state.lists.map((list) => ({
      ...list,
      items: list.items.filter(
        (item) => !item.done || !item.purchaseLogId || !linked.has(item.purchaseLogId)
      ),
    })),
  }
}
