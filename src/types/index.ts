export type Theme = 'light' | 'dark' | 'system'
export type ListViewMode = 'list' | 'tiles'

export interface AppSettings {
  theme: Theme
  listViewMode: ListViewMode
  hasSeenOnboarding: boolean
  /** Preis-Eingabe direkt beim Abhaken anzeigen. */
  askPriceOnCheckoff: boolean
  /** Wochenbudget in CHF – 0 = deaktiviert. */
  weeklyBudget: number
}

export interface ShoppingItem {
  id: string
  name: string
  amount: string
  category: string
  done: boolean
  addedAt: number
  note?: string
  favorite?: boolean
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
  /** Aktueller Bestand, z. B. "0.5 l". */
  amount?: string
  /** Mindestbestand – darunter wird Nachkauf vorgeschlagen. */
  minAmount?: string
}

export interface PurchaseLogEntry {
  name: string
  category: string
  date: string
  /** Optionaler Preis in CHF beim Abhaken. */
  price?: number
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

export type ImportMode = 'replace' | 'append' | 'merge'

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

export interface CustomProduct {
  id: string
  name: string
  category: string
  defaultAmount: string
  note?: string
  createdAt: number
}

export interface AppStats {
  listsCreated: number
  importsCount: number
  manualProductsCreated: number
  itemsAddedTotal: number
}
