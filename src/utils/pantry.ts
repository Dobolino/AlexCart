import { normalize } from './text'
import { parseAmount, combineAmounts, joinAmount, formatNumber } from './amount'
import type { PantryItem, ShoppingItem, ShoppingList } from '@/types'

export function matchesPantryName(shoppingName: string, pantryName: string): boolean {
  const a = normalize(shoppingName)
  const b = normalize(pantryName)
  if (!a || !b) return false
  return a === b || a.includes(b) || b.includes(a)
}

export function findPantryItem(name: string, pantry: PantryItem[]): PantryItem | undefined {
  return pantry.find((item) => matchesPantryName(name, item.name))
}

export function isLowStock(item: PantryItem): boolean {
  if (!item.minAmount) return false
  const min = parseAmount(item.minAmount)
  if (!min) return false

  const current = parseAmount(item.amount || '')
  if (!current) return true
  if (current.unit.toLowerCase() !== min.unit.toLowerCase()) return true
  return current.value < min.value
}

export function replenishAmount(current: string | undefined, purchased: string): string {
  if (!purchased.trim()) return current?.trim() || ''
  if (!current?.trim()) return purchased.trim()
  return combineAmounts(current, purchased)
}

/** Empfohlene Einkaufsmenge, um den Mindestbestand wieder zu erreichen. */
export function suggestedRestockAmount(item: PantryItem): string {
  const min = parseAmount(item.minAmount || '')
  if (!min) return item.minAmount || ''

  const current = parseAmount(item.amount || '')
  if (!current || current.unit.toLowerCase() !== min.unit.toLowerCase()) {
    return item.minAmount || ''
  }

  const needed = Math.max(0, min.value - current.value)
  if (needed <= 0) return joinAmount(formatNumber(min.value), min.unit)
  return joinAmount(formatNumber(needed), min.unit)
}

export interface PantrySuggestion {
  pantryId: string
  name: string
  category: string
  amount: string
  currentAmount: string
  minAmount: string
}

export function buildLowStockSuggestions(pantry: PantryItem[], list: ShoppingList): PantrySuggestion[] {
  const suggestions: PantrySuggestion[] = []

  for (const item of pantry) {
    if (!isLowStock(item)) continue

    const alreadyOnList = list.items.some((open) => !open.done && matchesPantryName(open.name, item.name))
    if (alreadyOnList) continue

    suggestions.push({
      pantryId: item.id,
      name: item.name,
      category: item.category,
      amount: suggestedRestockAmount(item),
      currentAmount: item.amount || '—',
      minAmount: item.minAmount || '',
    })
  }

  return suggestions.sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

export function replenishPantryItem(pantry: PantryItem[], shoppingItem: ShoppingItem): PantryItem[] {
  const index = pantry.findIndex((item) => matchesPantryName(shoppingItem.name, item.name))
  if (index < 0 || !shoppingItem.amount.trim()) return pantry

  const next = [...pantry]
  const current = next[index]!
  next[index] = {
    ...current,
    amount: replenishAmount(current.amount, shoppingItem.amount),
  }
  return next
}
