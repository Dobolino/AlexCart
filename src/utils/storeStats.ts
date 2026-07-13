import { findPriceProfile, findVariant } from '@/utils/priceProfiles'
import { tripTotalSpent } from '@/utils/stats'
import { normalize } from '@/utils/text'
import type { CompletedTrip, ProductPriceProfile, PurchaseLogEntry } from '@/types'

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100
}

export interface StoreBasketStat {
  store: string
  tripCount: number
  avgSpent: number
  totalSpent: number
}

/** Ø Warenkorb pro Filiale aus abgeschlossenen Einkäufen mit gesetzter `store`. */
export function avgBasketByStore(trips: CompletedTrip[]): StoreBasketStat[] {
  const byKey = new Map<string, { label: string; total: number; count: number }>()

  for (const trip of trips) {
    const store = trip.store?.trim()
    if (!store) continue
    const key = normalize(store)
    const spent = tripTotalSpent(trip)
    const existing = byKey.get(key)
    if (existing) {
      existing.total += spent
      existing.count += 1
    } else {
      byKey.set(key, { label: store, total: spent, count: 1 })
    }
  }

  return Array.from(byKey.values())
    .map(({ label, total, count }) => ({
      store: label,
      tripCount: count,
      totalSpent: roundMoney(total),
      avgSpent: roundMoney(total / count),
    }))
    .sort((a, b) => b.tripCount - a.tripCount || a.store.localeCompare(b.store, 'de'))
}

/** Ersparnis eines Aktions-Einkaufs gegenüber dem letzten Normalpreis der Variante. */
export function savingsForSaleEntry(
  entry: PurchaseLogEntry,
  profiles: ProductPriceProfile[]
): number {
  if (!entry.wasSale || !entry.price || entry.price <= 0) return 0

  const profile = findPriceProfile(profiles, entry.name, entry.category)
  if (!profile) return 0

  const variant = entry.variantId
    ? findVariant(profile, entry.variantId)
    : profile.variants.find((v) => (v.lastPrice ?? 0) > 0 || (v.avgPrice ?? 0) > 0)

  if (!variant) return 0

  const reference = variant.lastPrice ?? variant.avgPrice
  if (!reference || reference <= entry.price) return 0

  return roundMoney(reference - entry.price)
}

/** Kumulierte Promo-Ersparnis in einem Kalenderjahr. */
export function promoSavingsInYear(
  log: PurchaseLogEntry[],
  profiles: ProductPriceProfile[],
  year = new Date().getFullYear()
): number {
  let total = 0
  for (const entry of log) {
    if (!entry.wasSale || !entry.price || entry.price <= 0) continue
    const entryYear = Number(entry.date.slice(0, 4))
    if (!Number.isFinite(entryYear) || entryYear !== year) continue
    total += savingsForSaleEntry(entry, profiles)
  }
  return roundMoney(total)
}

export function currentCalendarYear(): number {
  return new Date().getFullYear()
}
