import type { PriceObservation } from '@/types/catalog'
import type { PurchaseLogEntry } from '@/types'
import { minorMoney } from '@/utils/priceComparison'

export function observationFromPurchase(entry: PurchaseLogEntry): PriceObservation | null {
  if (!entry.id || !entry.productId || !entry.storeId || !entry.price || !entry.profilePrice) return null
  return {
    id: `purchase:${entry.id}`,
    purchaseLogId: entry.id,
    productId: entry.productId,
    storeId: entry.storeId,
    price: minorMoney(entry.profilePrice, entry.currency ?? 'CHF'),
    basis: entry.pricePerKg !== undefined ? 'kg' : 'package',
    observedAt: new Date(`${entry.date}T12:00:00`).toISOString(),
    source: 'receipt',
    discounted: entry.wasSale,
  }
}
