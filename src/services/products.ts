import { z } from 'zod'
import { apiBase, apiRequest } from './api'
import { cacheValue, cachedValue } from './localDatabase'
import { normalizeGtin } from '@/utils/barcode'
import { baseQuantity } from '@/utils/quantity'
import { productSchema, fxSchema } from '@/utils/catalogSchemas'
import type { CatalogProduct, FxSnapshot, PriceObservation, RetailStore } from '@/types/catalog'

const offSchema = z.object({
  status: z.number(),
  product: z
    .object({
      product_name: z.string().optional(),
      product_name_de: z.string().optional(),
      brands: z.string().optional(),
      quantity: z.string().optional(),
      product_quantity: z.union([z.number(), z.string()]).optional(),
      product_quantity_unit: z.string().optional(),
      categories_tags: z.array(z.string()).optional(),
    })
    .optional(),
})
export function offProduct(raw: unknown, code: string): CatalogProduct | null {
  const gtin = normalizeGtin(code)
  const data = offSchema.parse(raw)
  if (!gtin || data.status !== 1 || !data.product) return null
  const p = data.product
  const name = p.product_name_de || p.product_name
  if (!name) return null
  const tags = (p.categories_tags ?? []).join(' ')
  const category = /fruit|vegetable/.test(tags)
    ? 'Früchte & Gemüse'
    : /milk|dair|cheese|yogurt/.test(tags)
      ? 'Milch & Käse'
      : /meat|fish/.test(tags)
        ? 'Fleisch & Fisch'
        : /beverage/.test(tags)
          ? 'Getränke'
          : /cereal|rice|pasta/.test(tags)
            ? 'Getreide & Beilagen'
            : 'Sonstiges'
  const quantity =
    baseQuantity(`${p.product_quantity ?? ''} ${p.product_quantity_unit ?? ''}`) ??
    baseQuantity(p.quantity ?? '')
  return productSchema.parse({
    id: `gtin:${gtin}`,
    gtins: [...new Set([code, gtin])],
    name,
    brand: p.brands?.slice(0, 300),
    category,
    netQuantity: quantity && quantity.value > 0 ? quantity : undefined,
    source: 'open-food-facts',
    sourceUrl: `https://world.openfoodfacts.org/product/${code}`,
    updatedAt: new Date().toISOString(),
  })
}
export async function lookupProduct(
  code: string,
  configured: string,
  local: CatalogProduct[],
  signal?: AbortSignal
) {
  const gtin = normalizeGtin(code)
  if (!gtin)
    throw new Error(
      'Barcode ungültig oder nur innerhalb dieses Händlers verwendbar. Bitte Produkt manuell erfassen.'
    )
  const owned = local.find((p) => p.gtins.some((g) => normalizeGtin(g) === gtin))
  if (owned) return owned
  const cached = await cachedValue<CatalogProduct | { missing: true }>(`product:${gtin}`)
  if (cached) return 'missing' in cached ? null : productSchema.parse(cached)
  const product = offProduct(
    await apiRequest<unknown>(apiBase(configured), `/products/${code}`, { signal }),
    code
  )
  await cacheValue(`product:${gtin}`, product ?? { missing: true }, product ? 7 * 86400000 : 5 * 60000)
  return product
}
export async function fetchFx(configured: string): Promise<FxSnapshot> {
  const data = z
    .object({
      base: z.literal('EUR'),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      rates: z.object({ CHF: z.number().positive().finite() }),
    })
    .parse(await apiRequest(apiBase(configured), '/rates'))
  return fxSchema.parse({
    id: `frankfurter:EUR:CHF:${data.date}`,
    base: 'EUR',
    quote: 'CHF',
    quotePerBase: String(data.rates.CHF),
    rateDate: data.date,
    fetchedAt: new Date().toISOString(),
    source: 'Frankfurter Referenzkurs',
  })
}

export async function fetchOpenPrices(product: CatalogProduct, configured: string) {
  const code = product.gtins.find((g) => g.length !== 14) ?? product.gtins[0]
  if (!code) throw new Error('Für dieses Produkt ist kein Barcode gespeichert.')
  const data = z
    .object({
      items: z.array(
        z.object({
          id: z.number(),
          price: z.union([z.string(), z.number()]),
          currency: z.string(),
          date: z.string(),
          price_per: z.string().nullish(),
          price_is_discounted: z.boolean().optional(),
          location_id: z.number().nullish(),
          location: z
            .object({ osm_name: z.string().nullish(), osm_address_country_code: z.string().nullish() })
            .nullish(),
        })
      ),
    })
    .parse(await apiRequest(apiBase(configured), `/prices/${code}`))
  const stores: RetailStore[] = [],
    observations: PriceObservation[] = []
  for (const row of data.items) {
    if (row.currency !== 'CHF' && row.currency !== 'EUR') continue
    const country = row.location?.osm_address_country_code?.toUpperCase()
    if (country !== 'CH' && country !== 'DE') continue
    if (!row.location_id || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) continue
    const price = Number(row.price)
    if (!Number.isFinite(price) || price <= 0) continue
    const storeId = `open-prices:${row.location_id}`
    stores.push({
      id: storeId,
      retailerId: storeId,
      country,
      currency: row.currency,
      name: row.location?.osm_name || `Geschäft #${row.location_id}`,
    })
    observations.push({
      id: `open-prices:${row.id}`,
      productId: product.id,
      storeId,
      price: { minor: Math.round(price * 100), currency: row.currency },
      basis: row.price_per === 'KILOGRAM' ? 'kg' : row.price_per === 'LITER' ? 'l' : 'package',
      observedAt: new Date(`${row.date}T12:00:00Z`).toISOString(),
      source: 'open-prices',
      sourceUrl: `https://prices.openfoodfacts.org/prices/${row.id}`,
      discounted: row.price_is_discounted,
    })
  }
  return { stores, observations }
}
