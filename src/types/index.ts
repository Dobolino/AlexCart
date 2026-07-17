export type Theme = 'light' | 'dark' | 'system'
export type ListViewMode = 'list' | 'tiles'
export type Currency = 'CHF' | 'EUR'

export interface AppSettings {
  theme: Theme
  listViewMode: ListViewMode
  hasSeenOnboarding: boolean
  /** Preis-Eingabe direkt beim Abhaken anzeigen. */
  askPriceOnCheckoff: boolean
  /** Wochenbudget in der gewählten Währung – 0 = deaktiviert. */
  weeklyBudget: number
  /** Anzeige- und Eingabewährung für Preise und Budget. */
  currency: Currency
  /** Einkaufsmodus: nur eine Kategorie offen (true) oder alle gleichzeitig sichtbar (false). */
  shoppingAutoCollapse: boolean
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
  /** Bevorzugte Variante für Kostenschätzung. */
  variantId?: string
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
  /** Wird beim Abhaken gesetzt; ältere Einträge erhalten eine ID bei der Migration. */
  id?: string
  /** Verknüpft den Eintrag mit einem Listen-Artikel – wichtig bei Umbenennung und Duplikaten. */
  itemId?: string
  name: string
  category: string
  date: string
  /** Optionaler Preis in der gewählten Währung beim Abhaken. */
  price?: number
  variantId?: string
  variantName?: string
  /** Aktionspreis – verfälscht nicht den Normal-Durchschnitt. */
  wasSale?: boolean
}

/** Einzelne Produktvariante (Marke, Bio, Grösse …). */
export interface ProductVariant {
  id: string
  name: string
  /** Verknüpfung mit globaler Marke (Einstellungen → Preise & Marken). */
  brandId?: string
  /** Kilopreis für Obst/Gemüse – Vergleich über Einkäufe hinweg. */
  pricePerKg?: number
  /** Für spätere Barcode-Erkennung. */
  barcode?: string
  /** Für spätere Filial-Zuordnung (Coop, Migros, …). */
  store?: string
  lastPrice?: number
  avgPrice?: number
  purchaseCount: number
  lastPurchaseDate?: string
  lastSalePrice?: number
  lastPurchaseWasSale: boolean
  avgSalePrice?: number
  salePurchaseCount: number
}

/** Preisprofil pro Listenartikel (z. B. „Milch“ mit mehreren Varianten). */
export interface ProductPriceProfile {
  id: string
  itemName: string
  category: string
  baseKey: string
  variants: ProductVariant[]
  preferredVariantId?: string
  createdAt: number
  updatedAt: number
}

/** Globale Marke – gilt produktübergreifend (Coop, Migros, …). */
export interface GlobalBrand {
  id: string
  name: string
  createdAt: number
}

/** Preisdaten beim Abhaken oder nachträglich. */
export interface CheckoffPriceData {
  /** Gesamtpreis für Budget und Kaufprotokoll. */
  price: number
  /** Stückpreis für Preisgedächtnis/Varianten – optional bei Mehrfachmengen. */
  unitPrice?: number
  /** Kilopreis für Obst/Gemüse. */
  pricePerKg?: number
  weightGrams?: number
  brandId?: string
  variantId?: string
  /** Pflicht bei neuer Variante. */
  variantName?: string
  wasSale?: boolean
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

/** Einzelposten auf der Quittung eines abgeschlossenen Einkaufs. */
export interface CompletedTripItem {
  id: string
  name: string
  amount: string
  /** Fehlt, wenn beim Abhaken kein Preis erfasst wurde. */
  price?: number
}

/** Snapshot eines vollständig abgeschlossenen Einkaufs (nicht pro Artikel, sondern pro Liste) -
 *  itemCount/totalSpent werden aus `items` abgeleitet, nicht separat gespeichert, damit eine
 *  nachträgliche Preiskorrektur nie aus dem Takt geraten kann. */
export interface CompletedTrip {
  id: string
  listId: string
  listName: string
  completedAt: number
  items: CompletedTripItem[]
  /** Einkaufszentrum/Filiale – optional, nachträglich in der Quittung editierbar. */
  store?: string
  /** Aktive Einkaufszeit in ms (ohne Pausen). */
  durationMs?: number
}

/** Laufende Einkaufssession im Einkaufsmodus (Timer + Pause). */
export interface ShoppingSession {
  listId: string
  startedAt: number
  pausedAt?: number
  totalPausedMs: number
}
