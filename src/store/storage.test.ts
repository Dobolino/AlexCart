import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { safeStorage, storageStatus } from './storage'

beforeEach(() => {
  const data = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('safeStorage.getItem', () => {
  it('returns the validated value unchanged for well-formed state', () => {
    const good = JSON.stringify({ state: { lists: [{ id: 'l', name: 'Liste', weekLabel: '', createdAt: 1, items: [] }] }, version: 1 })
    localStorage.setItem('alexshop-store', good)
    expect(JSON.parse(safeStorage.getItem('alexshop-store')!).state.lists).toHaveLength(1)
    expect(storageStatus.getSnapshot().recovery).toBe(false)
  })

  it('flags recovery and leaves the raw data untouched for data that fails schema validation', () => {
    // z. B. ein Artikel, der statt eines Objekts null ist - liesse man das ungeprüft durch,
    // würde es später an anderer Stelle crashen (item.name etc.). Die Originaldaten in
    // localStorage bleiben unverändert erhalten, damit sie exportiert/wiederhergestellt werden
    // können (siehe tests/e2e/shopping.spec.ts: "storage failures are visible...").
    const malformed = JSON.stringify({ version: 20, state: { lists: [{ id: 'broken', items: [null] }] } })
    localStorage.setItem('alexshop-store', malformed)
    expect(safeStorage.getItem('alexshop-store')).toBeNull()
    expect(storageStatus.getSnapshot().recovery).toBe(true)
    expect(localStorage.getItem('alexshop-store')).toBe(malformed)
  })

  it('flags recovery for genuinely unparseable JSON', () => {
    localStorage.setItem('alexshop-store', '{not json')
    expect(safeStorage.getItem('alexshop-store')).toBeNull()
    expect(storageStatus.getSnapshot().recovery).toBe(true)
  })
})
