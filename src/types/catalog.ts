import type { Currency } from './index'
import type { BaseQuantity } from '@/utils/quantity'

export interface Money {
  minor: number
  currency: Currency
}
export interface CatalogProduct {
  id: string
  gtins: string[]
  name: string
  brand?: string
  category: string
  netQuantity?: BaseQuantity
  comparisonGroupId?: string
  source: 'manual' | 'open-food-facts'
  sourceUrl?: string
  updatedAt: string
}
export interface RetailStore {
  id: string
  retailerId: string
  name: string
  country: 'CH' | 'DE'
  currency: Currency
}
export interface PriceObservation {
  id: string
  productId: string
  storeId: string
  price: Money
  basis: 'package' | 'kg' | 'l' | 'piece'
  observedAt: string
  source: 'manual' | 'receipt' | 'open-prices'
  sourceUrl?: string
  discounted?: boolean
  loyaltyRequired?: boolean
  minimumQuantity?: number
  deposit?: Money
  purchaseLogId?: string
  validUntil?: string
}
export interface FxSnapshot {
  id: string
  base: Currency
  quote: Currency
  quotePerBase: string
  rateDate: string
  fetchedAt: string
  source: string
}
