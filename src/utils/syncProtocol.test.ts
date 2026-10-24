import { describe, expect, it } from 'vitest'
import { applySyncOperation, diffSharedList, type SyncDocument } from './syncProtocol'
const initial: SyncDocument = {
  id: 'list',
  name: 'Test',
  revision: 0,
  deletedIds: [],
  items: [
    {
      id: 'milk',
      name: 'Milch',
      amount: '1 l',
      category: 'Milch & Käse',
      note: 'Bio',
      done: false,
      addedAt: 1,
    },
  ],
}
describe('field based reconciliation', () => {
  it('clears optional fields without sending invalid empty foreign IDs', () => {
    const changed = { ...initial, items: [{ ...initial.items[0]!, note: undefined }] }
    const ops = diffSharedList(initial, changed, () => 'op')
    const next = ops.reduce(applySyncOperation, initial)
    expect(next.items[0]?.note).toBeUndefined()
    expect(JSON.parse(JSON.stringify(next)).items[0].note).toBeUndefined()
  })
  it('preserves concurrent field edits while replaying an offline increment', () => {
    const remote = applySyncOperation(initial, {
      id: 'remote',
      kind: 'patch',
      itemId: 'milk',
      patch: { name: 'Vollmilch' },
    })
    const local = { ...initial, items: [{ ...initial.items[0]!, amount: '2 l' }] }
    const next = diffSharedList(initial, local, () => 'local').reduce(applySyncOperation, remote)
    expect(next.items[0]).toMatchObject({ name: 'Vollmilch', amount: '2 l' })
  })
})
