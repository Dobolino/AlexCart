import type {
  CheckoffPriceData,
  PantryItem,
  ProductPriceProfile,
  PurchaseLogEntry,
  ShoppingItem,
  ShoppingList,
} from '@/types'
import { todayKey } from '@/utils/date'
import { uid } from '@/utils/id'
import { replenishPantryItem } from '@/utils/pantry'
import {
  findPriceProfile,
  findVariant,
  recordVariantPurchase,
  revertLastPurchaseOnVariant,
  upsertPriceProfile,
} from '@/utils/priceProfiles'

type PurchaseState = {
  purchaseLog: PurchaseLogEntry[]
  priceProfiles: ProductPriceProfile[]
  lists: ShoppingList[]
  pantry: PantryItem[]
}

export function parseCheckoffInput(input?: number | CheckoffPriceData): CheckoffPriceData | undefined {
  if (input === undefined) return undefined
  if (typeof input === 'number') {
    return input > 0 ? { price: input, wasSale: false } : undefined
  }
  if (input.price > 0) return { ...input, wasSale: !!input.wasSale }
  return undefined
}

function findTodayLogIndex(log: PurchaseLogEntry[], item: ShoppingItem, today: string): number {
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!
    if (e.date === today && e.itemId === item.id) return i
  }
  for (let i = log.length - 1; i >= 0; i--) {
    const e = log[i]!
    if (e.date === today && !e.itemId && e.name === item.name && e.category === item.category) return i
  }
  return -1
}

function revertProfilesForLogEntry(
  profiles: ProductPriceProfile[],
  entry: PurchaseLogEntry
): ProductPriceProfile[] {
  if (!entry.variantId || !entry.price) return profiles
  const profile = findPriceProfile(profiles, entry.name, entry.category)
  if (!profile) return profiles
  const variant = findVariant(profile, entry.variantId)
  if (!variant) return profiles
  const reverted = revertLastPurchaseOnVariant(variant, !!entry.wasSale)
  const variants = profile.variants.map((v) => (v.id === reverted.id ? reverted : v))
  return upsertPriceProfile(profiles, { ...profile, variants, updatedAt: Date.now() })
}

export function commitItemPurchase(
  state: PurchaseState,
  item: ShoppingItem,
  data: CheckoffPriceData,
  opts: { listId: string; itemId: string; markDone: boolean; wasDone: boolean }
): PurchaseState {
  const today = todayKey()
  const purchase = recordVariantPurchase(state.priceProfiles, item.name, item.category, data, today, uid)
  let priceProfiles = state.priceProfiles
  priceProfiles = purchase.createdNewProfile
    ? [...priceProfiles, purchase.profile]
    : upsertPriceProfile(priceProfiles, purchase.profile)

  const purchaseLog = [...state.purchaseLog]
  const logIdx = findTodayLogIndex(purchaseLog, item, today)
  const entry: PurchaseLogEntry = {
    id: logIdx >= 0 ? purchaseLog[logIdx]!.id || uid() : uid(),
    itemId: opts.itemId,
    name: item.name,
    category: item.category,
    date: today,
    price: data.price,
    variantId: purchase.variantId,
    variantName: purchase.variantName,
    wasSale: !!data.wasSale,
  }
  if (logIdx >= 0) purchaseLog[logIdx] = entry
  else purchaseLog.push(entry)

  const lists = state.lists.map((l) =>
    l.id !== opts.listId
      ? l
      : {
          ...l,
          items: l.items.map((i) =>
            i.id === opts.itemId ? { ...i, done: opts.markDone, variantId: purchase.variantId } : i
          ),
        }
  )

  return {
    purchaseLog,
    priceProfiles,
    lists,
    pantry: opts.markDone && !opts.wasDone ? replenishPantryItem(state.pantry, item) : state.pantry,
  }
}

export function undoTodayCheckoff(
  state: PurchaseState,
  item: ShoppingItem,
  listId: string,
  itemId: string
): PurchaseState {
  const today = todayKey()
  const logIdx = findTodayLogIndex(state.purchaseLog, item, today)
  let priceProfiles = state.priceProfiles
  let purchaseLog = state.purchaseLog

  if (logIdx >= 0) {
    const entry = purchaseLog[logIdx]!
    priceProfiles = revertProfilesForLogEntry(priceProfiles, entry)
    purchaseLog = purchaseLog.filter((_, i) => i !== logIdx)
  }

  const lists = state.lists.map((l) =>
    l.id !== listId ? l : { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: false } : i)) }
  )

  return { purchaseLog, priceProfiles, lists, pantry: state.pantry }
}
