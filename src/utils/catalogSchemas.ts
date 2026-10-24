import { z } from 'zod'
const currency = z.enum(['CHF', 'EUR'])
const money = z.object({ minor: z.number().int().nonnegative().max(10_000_000_000), currency })
export const productSchema = z.object({
  id: z.string().min(1).max(200),
  gtins: z.array(z.string().regex(/^\d{8,14}$/)).max(20),
  name: z.string().min(1).max(300),
  brand: z.string().max(300).optional(),
  category: z.string().max(100),
  netQuantity: z
    .object({ value: z.number().positive().finite().max(1e9), unit: z.enum(['g', 'ml', 'piece']) })
    .optional(),
  comparisonGroupId: z.string().max(200).optional(),
  source: z.enum(['manual', 'open-food-facts']),
  sourceUrl: z
    .string()
    .url()
    .max(1000)
    .refine((s) => s.startsWith('https://'))
    .optional(),
  updatedAt: z.string().datetime(),
})
export const retailStoreSchema = z.object({
  id: z.string().min(1).max(200),
  retailerId: z.string().max(200),
  name: z.string().min(1).max(200),
  country: z.enum(['CH', 'DE']),
  currency,
})
export const priceObservationSchema = z.object({
  id: z.string().min(1).max(200),
  productId: z.string().max(200),
  storeId: z.string().max(200),
  price: money,
  basis: z.enum(['package', 'kg', 'l', 'piece']),
  observedAt: z.string().datetime(),
  source: z.enum(['manual', 'receipt', 'open-prices']),
  sourceUrl: z
    .string()
    .url()
    .max(1000)
    .refine((s) => s.startsWith('https://'))
    .optional(),
  discounted: z.boolean().optional(),
  loyaltyRequired: z.boolean().optional(),
  minimumQuantity: z.number().positive().max(10000).optional(),
  deposit: money.optional(),
  validUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  purchaseLogId: z.string().max(200).optional(),
})
export const fxSchema = z
  .object({
    id: z.string().max(200),
    base: currency,
    quote: currency,
    quotePerBase: z
      .string()
      .regex(/^\d+(?:\.\d+)?$/)
      .refine((s) => Number(s) > 0 && Number(s) < 1000),
    rateDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    fetchedAt: z.string().datetime(),
    source: z.string().max(200),
  })
  .refine((fx) => fx.base !== fx.quote)
