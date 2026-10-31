import { z } from 'zod'
import { productSchema, priceObservationSchema, retailStoreSchema, fxSchema } from './catalogSchemas'

export const STORAGE_VERSION = 22
export const MAX_BACKUP_BYTES = 8 * 1024 * 1024
const text = z.string().max(1000)
const id = z.string().min(1).max(200)
const number = z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER)
const money = number.max(100_000_000)
const currency = z.enum(['CHF', 'EUR'])
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T12:00:00Z`)
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === s
  })
const array = <T extends z.ZodType>(schema: T) => z.array(schema).max(50_000)
const prices = z.object({
  pricePerKg: money.optional(),
  lastPrice: money.optional(),
  avgPrice: money.optional(),
  purchaseCount: number.int(),
  lastPurchaseDate: date.optional(),
  lastSalePrice: money.optional(),
  lastPurchaseWasSale: z.boolean(),
  avgSalePrice: money.optional(),
  salePurchaseCount: number.int(),
  normalTotal: number.optional(),
  saleTotal: number.optional(),
})
const item = z
  .object({
    id,
    name: text.min(1),
    amount: text,
    category: text,
    done: z.boolean(),
    addedAt: number,
    note: text.optional(),
    favorite: z.boolean().optional(),
    variantId: id.optional(),
    productId: id.optional(),
    barcode: text.optional(),
    unavailable: z.boolean().optional(),
  })
  .passthrough()
const list = z
  .object({
    id,
    name: text.optional(),
    items: array(item),
    weekLabel: text.optional(),
    createdAt: number.optional(),
    storeId: text.optional(),
    categoryOrder: array(text).optional(),
    shared: z.unknown().optional(),
  })
  .passthrough()
const pantry = z.object({
  id,
  name: text,
  category: text,
  amount: text.optional(),
  minAmount: text.optional(),
  expiresOn: date.optional(),
})
const entry = z
  .object({
    id: id.optional(),
    itemId: id.optional(),
    name: text,
    amount: text.optional(),
    category: text,
    date,
    price: money.optional(),
    profilePrice: money.optional(),
    currency: currency.optional(),
    variantId: id.optional(),
    variantName: text.optional(),
    wasSale: z.boolean().optional(),
    referenceUnitPrice: money.optional(),
    pricePerKg: money.optional(),
    productId: text.optional(),
    storeId: text.optional(),
    pantryMovement: z
      .object({ pantryId: id, amount: text, before: text.optional(), after: text.optional() })
      .optional(),
  })
  .passthrough()
const tripItem = z.object({
  id,
  name: text,
  amount: text,
  price: money.optional(),
  purchaseLogId: id.optional(),
})
const trip = z
  .object({
    storeId: text.optional(),
    country: z.enum(['CH', 'DE']).optional(),
    id,
    listId: id,
    listName: text,
    completedAt: number,
    items: array(tripItem).optional(),
    itemCount: number.optional(),
    totalSpent: money.optional(),
    store: text.optional(),
    currency: currency.optional(),
    durationMs: number.optional(),
    importFingerprint: text.optional(),
  })
  .passthrough()
const settings = z
  .object({
    listStoreIds: z.record(z.string().max(200), text).optional(),
    retailSelection: z.object({ country: z.enum(['CH', 'DE']), retailerId: text }).optional(),
    preferredRetailers: z.object({ CH: text.optional(), DE: text.optional() }).optional(),
    favoriteBrandNames: array(text).optional(),
    hiddenBrandNames: array(text).optional(),
    theme: z.enum(['light', 'dark', 'system']).optional(),
    listViewMode: z.enum(['list', 'tiles']).optional(),
    hasSeenOnboarding: z.boolean().optional(),
    askPriceOnCheckoff: z.boolean().optional(),
    weeklyBudget: money.optional(),
    currency: currency.optional(),
    shoppingAutoCollapse: z.boolean().optional(),
    customStores: array(text).optional(),
    budgetsByCurrency: z.object({ CHF: money.optional(), EUR: money.optional() }).optional(),
    apiUrl: z.string().max(1000).optional(),
    handedness: z.enum(['left', 'right']).optional(),
  })
  .passthrough()

// Explicit top-level keys prevent restored JSON from replacing store actions.
export const persistedStateSchema = z.object({
  lists: z.array(list).min(1).max(500),
  activeListId: text.optional(),
  pantry: array(pantry).optional(),
  customProducts: array(
    z.object({
      id,
      name: text,
      category: text,
      defaultAmount: text,
      note: text.optional(),
      createdAt: number,
    })
  ).optional(),
  purchaseLog: array(entry).optional(),
  priceProfiles: array(
    z.object({
      id,
      itemName: text,
      category: text,
      baseKey: text,
      variants: array(
        z.object({
          id,
          name: text,
          ...prices.shape,
          brandId: id.optional(),
          barcode: text.optional(),
          store: text.optional(),
          byCurrency: z.object({ CHF: prices.optional(), EUR: prices.optional() }).optional(),
        })
      ),
      preferredVariantId: id.optional(),
      createdAt: number,
      updatedAt: number,
    })
  ).optional(),
  brands: array(z.object({ id, name: text, createdAt: number })).optional(),
  completedTrips: array(trip).optional(),
  shoppingSession: z
    .object({
      listId: id,
      startedAt: number,
      pausedAt: number.optional(),
      totalPausedMs: number,
      checkedItemIds: array(id).optional(),
      currency: currency.optional(),
      store: text.optional(),
      storeId: text.optional(),
    })
    .nullable()
    .optional(),
  stats: z
    .object({
      listsCreated: number,
      importsCount: number,
      manualProductsCreated: number,
      itemsAddedTotal: number,
    })
    .optional(),
  filtered: array(z.object({ listId: id, items: array(item) })).optional(),
  settings: settings.optional(),
  calculatorEntries: array(z.object({ id, amount: money, currency: currency.optional() })).optional(),
  calculatorDate: date.optional(),
  calculatorExcludedPurchaseIds: array(id).optional(),
  retailStores: array(retailStoreSchema).optional(),
  storeLayouts: z.record(z.string(), array(text)).optional(),
  catalog: array(productSchema).optional(),
  priceObservations: array(priceObservationSchema).optional(),
  fxSnapshot: fxSchema.nullable().optional(),
})

export const backupSchema = z.object({
  state: persistedStateSchema,
  version: number.int().max(STORAGE_VERSION),
})
export const importPayloadSchema = z.object({
  week: text.optional(),
  items: z
    .array(
      z.object({
        name: text.trim().min(1),
        amount: text.optional(),
        category: text.optional(),
        note: text.optional(),
      })
    )
    .max(2000),
})

export function parseBackup(json: string) {
  if (new Blob([json]).size > MAX_BACKUP_BYTES) throw new Error('Sicherung ist zu groß (maximal 8 MB).')
  return backupSchema.parse(JSON.parse(json))
}
