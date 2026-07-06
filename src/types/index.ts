export type Theme = 'light' | 'dark' | 'system'

export interface ShoppingItem {
  id: string
  name: string
  amount: string
  category: string
  done: boolean
  addedAt: number
}

export interface ShoppingList {
  id: string
  name: string
  weekLabel: string
  items: ShoppingItem[]
  createdAt: number
}

export interface PantryItem {
  id: string
  name: string
  category: string
}

export interface PurchaseLogEntry {
  name: string
  category: string
  date: string
}

export interface ImportItemPayload {
  name: string
  amount?: string
  category?: string
}

export interface ImportPayload {
  week?: string
  items: ImportItemPayload[]
}

export interface ImportResult {
  ok: boolean
  error?: string
  keptCount?: number
  filteredCount?: number
}

export interface CalculatorEntry {
  id: string
  amount: number
}
