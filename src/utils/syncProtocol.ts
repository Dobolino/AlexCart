import { z } from 'zod'
import type { ShoppingItem } from '../types/index.ts'

const id = z.string().min(1).max(200)
export const sharedItemSchema = z.object({
  id,
  name: z.string().min(1).max(300),
  amount: z.string().max(100),
  category: z.string().max(100),
  done: z.boolean(),
  addedAt: z.number().finite().nonnegative(),
  note: z.string().max(1000).optional(),
  favorite: z.boolean().optional(),
  variantId: id.optional(),
  productId: id.optional(),
  barcode: z.string().max(30).optional(),
  unavailable: z.boolean().optional(),
})
const patch = sharedItemSchema
  .omit({ id: true, addedAt: true })
  .partial()
  .extend({
    note: z.string().max(1000).nullable().optional(),
    variantId: id.nullable().optional(),
    productId: id.nullable().optional(),
    barcode: z.string().max(30).nullable().optional(),
  })
export const syncOperationSchema = z.discriminatedUnion('kind', [
  z.object({ id, kind: z.literal('put'), item: sharedItemSchema, restore: z.boolean().optional() }),
  z.object({ id, kind: z.literal('patch'), itemId: id, patch }),
  z.object({
    id,
    kind: z.literal('adjust'),
    itemId: id,
    delta: z.number().finite().min(-10000).max(10000),
    unit: z.string().max(50),
  }),
  z.object({ id, kind: z.literal('delete'), itemId: id }),
  z.object({ id, kind: z.literal('move'), itemId: id, afterId: id.nullable() }),
  z.object({ id, kind: z.literal('rename'), name: z.string().min(1).max(200) }),
])
export type SyncOperation = z.infer<typeof syncOperationSchema>
export interface SyncDocument {
  id: string
  name: string
  items: ShoppingItem[]
  deletedIds: string[]
  revision: number
}

export function applySyncOperation(document: SyncDocument, op: SyncOperation): SyncDocument {
  let items = [...document.items]
  let deletedIds = document.deletedIds
  let name = document.name
  if (op.kind === 'rename') name = op.name
  else if (op.kind === 'delete') {
    items = items.filter((i) => i.id !== op.itemId)
    deletedIds = [...new Set([...deletedIds, op.itemId])]
  } else if (op.kind === 'put') {
    if (deletedIds.includes(op.item.id) && !op.restore) return document
    if (op.restore) deletedIds = deletedIds.filter((id) => id !== op.item.id)
    if (!items.some((i) => i.id === op.item.id)) items.push(op.item)
  } else if (!deletedIds.includes(op.itemId)) {
    if (op.kind === 'patch')
      items = items.map((i) => {
        if (i.id !== op.itemId) return i
        const next = { ...i }
        for (const [key, value] of Object.entries(op.patch)) {
          if (value === null) delete (next as unknown as Record<string, unknown>)[key]
          else (next as unknown as Record<string, unknown>)[key] = value
        }
        return next
      })
    if (op.kind === 'adjust')
      items = items.map((i) => {
        if (i.id !== op.itemId) return i
        const parsed = parseSimpleAmount(i.amount)
        if (!parsed || parsed.unit.toLowerCase() !== op.unit.toLowerCase())
          throw new Error('Die Mengeneinheit wurde auf einem anderen Gerät geändert. Bitte die Liste prüfen.')
        return {
          ...i,
          amount: `${Math.max(0, Math.round((parsed.value + op.delta) * 1000) / 1000)} ${parsed.unit}`.trim(),
        }
      })
    if (op.kind === 'move') {
      const item = items.find((i) => i.id === op.itemId)
      if (item && op.afterId !== op.itemId) {
        items = items.filter((i) => i.id !== item.id)
        const index = op.afterId ? items.findIndex((i) => i.id === op.afterId) + 1 : 0
        items.splice(index, 0, item)
      }
    }
  }
  if (items.length > 2000 || deletedIds.length > 50000) throw new Error('Die gemeinsame Liste ist zu groß.')
  return { ...document, name, items, deletedIds }
}

function parseSimpleAmount(value: string) {
  const match = value.match(/^(\d+(?:[.,]\d+)?)\s*([^\d]*)$/)
  return match ? { value: Number(match[1]!.replace(',', '.')), unit: match[2]!.trim() } : null
}

/** Field operations preserve concurrent edits to other items and additive quantities. */
export function diffSharedList(
  before: Pick<SyncDocument, 'name' | 'items'>,
  after: Pick<SyncDocument, 'name' | 'items'>,
  nextId: () => string
): SyncOperation[] {
  const ops: SyncOperation[] = []
  const old = new Map(before.items.map((i) => [i.id, i]))
  const current = new Set(after.items.map((i) => i.id))
  if (before.name !== after.name) ops.push({ id: nextId(), kind: 'rename', name: after.name })
  for (const item of before.items)
    if (!current.has(item.id)) ops.push({ id: nextId(), kind: 'delete', itemId: item.id })
  for (const item of after.items) {
    const previous = old.get(item.id)
    if (!previous) {
      ops.push({ id: nextId(), kind: 'put', item: sharedItemSchema.parse(item), restore: true })
      continue
    }
    const changes: Record<string, unknown> = {}
    for (const key of [
      'name',
      'category',
      'amount',
      'note',
      'done',
      'favorite',
      'variantId',
      'productId',
      'barcode',
      'unavailable',
    ] as const) {
      if (previous[key] !== item[key])
        changes[key] =
          item[key] ??
          (key === 'note' || key === 'variantId' || key === 'productId' || key === 'barcode' ? null : false)
    }
    if ('amount' in changes) {
      const a = parseSimpleAmount(previous.amount),
        b = parseSimpleAmount(item.amount)
      if (a && b && a.unit.toLowerCase() === b.unit.toLowerCase()) {
        ops.push({ id: nextId(), kind: 'adjust', itemId: item.id, delta: b.value - a.value, unit: a.unit })
        delete changes.amount
      }
    }
    if (Object.keys(changes).length)
      ops.push(syncOperationSchema.parse({ id: nextId(), kind: 'patch', itemId: item.id, patch: changes }))
  }
  if (before.items.map((i) => i.id).join('|') !== after.items.map((i) => i.id).join('|')) {
    after.items.forEach((item, i) =>
      ops.push({ id: nextId(), kind: 'move', itemId: item.id, afterId: after.items[i - 1]?.id ?? null })
    )
  }
  return ops
}
