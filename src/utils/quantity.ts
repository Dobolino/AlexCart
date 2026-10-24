import { parseAmount, parsePackAmount, formatNumber } from './amount'

export interface BaseQuantity {
  value: number
  unit: 'g' | 'ml' | 'piece'
}

export function baseQuantity(text: string): BaseQuantity | null {
  const pack = parsePackAmount(text)
  const amount = pack ? { value: pack.count * pack.packValue, unit: pack.packUnit } : parseAmount(text)
  if (!amount || !Number.isFinite(amount.value) || amount.value < 0) return null
  const unit = amount.unit.toLowerCase().replace(/\.$/, '')
  if (unit === 'kg') return { value: amount.value * 1000, unit: 'g' }
  if (unit === 'g') return { value: amount.value, unit: 'g' }
  if (unit === 'l') return { value: amount.value * 1000, unit: 'ml' }
  if (unit === 'cl') return { value: amount.value * 10, unit: 'ml' }
  if (unit === 'ml') return { value: amount.value, unit: 'ml' }
  if (['stk', 'stück', 'st', 'piece', ''].includes(unit)) return { value: amount.value, unit: 'piece' }
  return null
}

export function quantityText(quantity: BaseQuantity): string {
  return `${formatNumber(quantity.value)} ${quantity.unit === 'piece' ? 'Stk' : quantity.unit}`
}

/** Subtract compatible quantities without changing their physical dimension. */
export function subtractQuantity(current: string, used: string): string | null {
  const a = baseQuantity(current)
  const b = baseQuantity(used)
  if (!a || !b || a.unit !== b.unit) return null
  const original = parseAmount(current)
  const scale = original?.unit.toLowerCase() === 'kg' || original?.unit.toLowerCase() === 'l' ? 1000 : 1
  const unit = scale === 1000 ? original!.unit : a.unit === 'piece' ? original?.unit || 'Stk' : a.unit
  return `${formatNumber(Math.max(0, a.value - b.value) / scale)} ${unit}`.trim()
}
