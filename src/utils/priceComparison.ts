import Decimal from 'decimal.js'
import type { Currency } from '@/types'
import type { ShoppingItem } from '@/types'
import { baseQuantity } from './quantity'
import type { CatalogProduct, FxSnapshot, Money, PriceObservation } from '@/types/catalog'

export function minorMoney(amount: number, currency: Currency): Money {
  const minor = new Decimal(amount).mul(100).toDecimalPlaces(0).toNumber()
  if (!Number.isSafeInteger(minor) || minor < 0) throw new Error('Ungültiger Geldbetrag')
  return { minor, currency }
}

export function compareBasket(
  items: ShoppingItem[],
  products: CatalogProduct[],
  prices: PriceObservation[],
  currency: Currency,
  fx: FxSnapshot | null
) {
  const needs = items.filter((i) => !i.done)
  const storeIds = [...new Set(prices.map((p) => p.storeId))]
  return storeIds
    .map((storeId) => {
      let total = new Decimal(0),
        covered = 0
      for (const item of needs) {
        const product = products.find((p) => p.id === item.productId)
        if (!product) continue
        const observation = compareProductPrices(
          product,
          prices.filter(
            (p) => p.storeId === storeId && !p.loyaltyRequired && !p.minimumQuantity && !p.discounted
          ),
          currency,
          fx
        ).find((p) => !p.stale && p.normalized)?.observation
        if (!observation) continue
        const quantity = baseQuantity(item.amount) ?? product.netQuantity
        if (!quantity || !product.netQuantity || quantity.unit !== product.netQuantity.unit) continue
        const amount = convertMoney(observation.price, currency, fx)
        if (!amount) continue
        if (observation.basis === 'package')
          total = total.plus(amount.mul(Math.ceil(quantity.value / product.netQuantity.value)))
        else {
          const unit = observation.basis === 'kg' ? 'g' : observation.basis === 'l' ? 'ml' : 'piece'
          if (unit !== quantity.unit) continue
          total = total.plus(amount.mul(quantity.value).div(unit === 'piece' ? 1 : 1000))
        }
        covered++
      }
      return {
        storeId,
        total: total.toDecimalPlaces(2).toNumber(),
        covered,
        requested: needs.length,
        complete: covered === needs.length && covered > 0,
      }
    })
    .filter((p) => p.covered > 0)
    .sort(
      (a, b) =>
        Number(b.complete) - Number(a.complete) ||
        (a.complete && b.complete ? a.total - b.total : b.covered - a.covered)
    )
}
export function convertMoney(value: Money, target: Currency, fx: FxSnapshot | null): Decimal | null {
  const amount = new Decimal(value.minor).div(100)
  if (value.currency === target) return amount
  if (!fx || !new Decimal(fx.quotePerBase).isPositive()) return null
  if (value.currency === fx.base && target === fx.quote) return amount.mul(fx.quotePerBase)
  if (value.currency === fx.quote && target === fx.base) return amount.div(fx.quotePerBase)
  return null
}
export function normalizedPrice(
  product: CatalogProduct,
  observation: PriceObservation,
  currency: Currency,
  fx: FxSnapshot | null
) {
  if (product.id !== observation.productId) return null
  const amount = convertMoney(observation.price, currency, fx)
  if (!amount) return null
  if (observation.basis !== 'package') return { amount: amount.toNumber(), unit: observation.basis }
  const quantity = product.netQuantity
  if (!quantity || quantity.value <= 0) return null
  const scale = quantity.unit === 'piece' ? 1 : 1000
  return {
    amount: amount.div(quantity.value).mul(scale).toNumber(),
    unit: quantity.unit === 'g' ? 'kg' : quantity.unit === 'ml' ? 'l' : 'piece',
  }
}

/** Only rank exactly matched products on the same physical price basis. */
export function compareProductPrices(
  product: CatalogProduct,
  observations: PriceObservation[],
  currency: Currency,
  fx: FxSnapshot | null,
  now = new Date()
) {
  const newest = new Map<string, PriceObservation>()
  for (const p of observations) {
    if (p.productId !== product.id || (p.validUntil && p.validUntil < now.toISOString().slice(0, 10)))
      continue
    const key = `${p.storeId}:${p.price.currency}:${p.basis}:${!!p.loyaltyRequired}:${p.minimumQuantity ?? 1}`
    if (!newest.has(key) || newest.get(key)!.observedAt < p.observedAt) newest.set(key, p)
  }
  return [...newest.values()]
    .map((observation) => ({
      observation,
      normalized: normalizedPrice(product, observation, currency, fx),
      stale: now.getTime() - Date.parse(observation.observedAt) > 14 * 86400000,
    }))
    .sort((a, b) => {
      if (!a.normalized) return 1
      if (!b.normalized) return -1
      if (a.normalized.unit !== b.normalized.unit) return a.normalized.unit.localeCompare(b.normalized.unit)
      return a.normalized.amount - b.normalized.amount
    })
}
