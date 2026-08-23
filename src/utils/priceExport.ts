import { brandNameById } from '@/utils/brands'
import { findPriceProfile, findVariant } from '@/utils/priceProfiles'
import { productPriceHistory } from '@/utils/priceHistory'
import { categorySpendBreakdown, tripTotalSpent } from '@/utils/stats'
import { avgBasketByStore } from '@/utils/storeStats'
import { storeCountryFromCurrency } from '@/constants/stores'
import { normalize } from '@/utils/text'
import type {
  CompletedTrip,
  Currency,
  GlobalBrand,
  ProductPriceProfile,
  PurchaseLogEntry,
} from '@/types'

export interface PriceExportPurchaseRow {
  /** Stabiler Schlüssel zum Diffen / Nachverfolgen von Änderungen. */
  key: string
  id?: string
  date: string
  name: string
  category: string
  price: number
  currency: Currency
  variant?: string
  brand?: string
  wasSale: boolean
  store?: string
}

export interface PriceExportTripRow {
  key: string
  id: string
  date: string
  store?: string
  listName: string
  itemCount: number
  totalSpent: number
  items: Array<{
    key: string
    id: string
    name: string
    amount: string
    price?: number
  }>
}

export interface PriceExportPayload {
  exportedAt: string
  currency: Currency
  country: 'CH' | 'DE'
  purchases: PriceExportPurchaseRow[]
  trips: PriceExportTripRow[]
  productAverages: Array<{
    key: string
    name: string
    category: string
    count: number
    avgPrice: number
    lastPrice: number
    lastDate: string
    minPrice: number
    maxPrice: number
  }>
  categorySpend: Array<{
    category: string
    total: number
    percent: number
    count: number
  }>
  storeBaskets: Array<{
    store: string
    tripCount: number
    avgSpent: number
    totalSpent: number
    percentAboveCheapest: number
  }>
}

/** Stabiler KEY für eine Kaufzeile (Datum|Produkt|Filiale|Währung). */
export function purchaseChangeKey(parts: {
  date: string
  name: string
  store?: string
  currency: Currency
}): string {
  return [parts.date, normalize(parts.name), normalize(parts.store || ''), parts.currency].join('|')
}

function tripDateKey(completedAt: number): string {
  return new Date(completedAt).toLocaleDateString('sv-SE')
}

/** Filiale aus abgeschlossenen Einkäufen auf Log-Einträge legen (Datum + Produktname). */
export function storeByPurchaseKey(trips: CompletedTrip[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const trip of trips) {
    const store = trip.store?.trim()
    if (!store) continue
    const date = tripDateKey(trip.completedAt)
    for (const item of trip.items) {
      map.set(`${date}|${normalize(item.name)}`, store)
    }
  }
  return map
}

function resolveBrand(
  entry: PurchaseLogEntry,
  profiles: ProductPriceProfile[],
  brands: GlobalBrand[]
): string | undefined {
  if (!entry.variantId) return undefined
  const profile = findPriceProfile(profiles, entry.name, entry.category)
  if (!profile) return undefined
  const variant = findVariant(profile, entry.variantId)
  return brandNameById(brands, variant?.brandId)
}

export function buildPriceExport(input: {
  purchaseLog: PurchaseLogEntry[]
  priceProfiles: ProductPriceProfile[]
  brands: GlobalBrand[]
  completedTrips: CompletedTrip[]
  currency: Currency
  now?: Date
}): PriceExportPayload {
  const stores = storeByPurchaseKey(input.completedTrips)
  const purchases: PriceExportPurchaseRow[] = []
  const logInCurrency = input.purchaseLog.filter((entry) => (entry.currency ?? 'CHF') === input.currency)

  for (const entry of logInCurrency) {
    if (!entry.price || entry.price <= 0) continue
    const store = stores.get(`${entry.date}|${normalize(entry.name)}`)
    const brand = resolveBrand(entry, input.priceProfiles, input.brands)
    const currency = (entry.currency ?? input.currency) as Currency
    purchases.push({
      key: purchaseChangeKey({ date: entry.date, name: entry.name, store, currency }),
      ...(entry.id ? { id: entry.id } : {}),
      date: entry.date,
      name: entry.name,
      category: entry.category,
      price: entry.price,
      currency,
      ...(entry.variantName ? { variant: entry.variantName } : {}),
      ...(brand ? { brand } : {}),
      wasSale: Boolean(entry.wasSale),
      ...(store ? { store } : {}),
    })
  }

  purchases.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, 'de'))

  const trips: PriceExportTripRow[] = [...input.completedTrips]
    .sort((a, b) => a.completedAt - b.completedAt)
    .map((trip) => {
      const date = tripDateKey(trip.completedAt)
      return {
        key: `trip|${trip.id}`,
        id: trip.id,
        date,
        ...(trip.store ? { store: trip.store } : {}),
        listName: trip.listName,
        itemCount: trip.items.length,
        totalSpent: tripTotalSpent(trip),
        items: trip.items.map((item) => ({
          key: purchaseChangeKey({
            date,
            name: item.name,
            store: trip.store,
            currency: input.currency,
          }),
          id: item.id,
          name: item.name,
          amount: item.amount,
          ...(item.price !== undefined ? { price: item.price } : {}),
        })),
      }
    })

  const productAverages = productPriceHistory(input.purchaseLog, input.currency).map((p) => ({
    key: `avg|${normalize(p.name)}|${normalize(p.category)}|${input.currency}`,
    name: p.name,
    category: p.category,
    count: p.count,
    avgPrice: p.avgPrice,
    lastPrice: p.lastPrice,
    lastDate: p.lastDate,
    minPrice: p.minPrice,
    maxPrice: p.maxPrice,
  }))

  const categorySpend = categorySpendBreakdown(input.purchaseLog, input.currency).map((c) => ({
    category: c.label,
    total: c.total,
    percent: c.percent,
    count: c.count,
  }))

  const storeBaskets = avgBasketByStore(input.completedTrips, input.currency).map((s) => ({
    store: s.store,
    tripCount: s.tripCount,
    avgSpent: s.avgSpent,
    totalSpent: s.totalSpent,
    percentAboveCheapest: s.percentAboveCheapest,
  }))

  return {
    exportedAt: (input.now ?? new Date()).toISOString(),
    currency: input.currency,
    country: storeCountryFromCurrency(input.currency),
    purchases,
    trips,
    productAverages,
    categorySpend,
    storeBaskets,
  }
}

export function exportPriceJson(payload: PriceExportPayload): string {
  return JSON.stringify(payload, null, 2)
}

function csvEscape(value: string | number | boolean): string {
  const raw = String(value)
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

/** Flache Kaufzeilen als CSV – ideal für Tabellen und KI-Diagramme. */
export function exportPriceCsv(payload: PriceExportPayload): string {
  const header = ['key', 'id', 'date', 'name', 'category', 'price', 'currency', 'variant', 'brand', 'wasSale', 'store']
  const lines = [header.join(',')]
  for (const row of payload.purchases) {
    lines.push(
      [
        csvEscape(row.key),
        csvEscape(row.id ?? ''),
        csvEscape(row.date),
        csvEscape(row.name),
        csvEscape(row.category),
        csvEscape(row.price),
        csvEscape(row.currency),
        csvEscape(row.variant ?? ''),
        csvEscape(row.brand ?? ''),
        csvEscape(row.wasSale),
        csvEscape(row.store ?? ''),
      ].join(',')
    )
  }
  return lines.join('\n')
}

export function priceExportFilename(ext: 'json' | 'csv', now = new Date()): string {
  const date = now.toLocaleDateString('sv-SE')
  return `alexshop-preise-${date}.${ext}`
}

/** Prompt zum Einfügen in ChatGPT/Claude für Legende/Diagramme. */
export function buildPriceAnalysisPrompt(payload: PriceExportPayload): string {
  return `Du analysierst meine Einkaufspreise aus der App AlexShop (Währung: ${payload.currency}, Land: ${payload.country}).

AUFGABE
Erstelle eine klare Auswertung mit:
1. Ausgabenanteil (%) nach Kategorie – Balkendiagramm oder Legende
2. Durchschnittspreise der wichtigsten Produkte (Ø, Min, Max, Trend über Datum)
3. Filial-Vergleich: wo der Ø-Warenkorb günstiger ist (inkl. Prozentaufschlag zur günstigsten Filiale)
4. Kurze Empfehlung: welche Kategorien / Filialen relativ teuer sind
5. Bei Bedarf Änderungen anhand der stabilen "key"-Felder markieren (was teurer/günstiger wurde)

REGELN
- Antworte auf Deutsch
- Nutze nur die gelieferten Zahlen, nichts erfinden
- Wenn wenig Daten: das sagen und trotzdem die vorhandenen Werte zeigen
- Diagramme als Mermaid, ASCII oder klare Tabellen – keine Bilder nötig

DATEN (JSON)
${exportPriceJson(payload)}`
}
