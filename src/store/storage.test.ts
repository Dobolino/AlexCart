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
  it('passes through a value that fails strict schema validation but is valid JSON', () => {
    // z. B. eine ältere Form mit einer leeren Listen-Liste, die persistedStateSchema ablehnt,
    // migrate()/merge() in useStore.ts aber tolerieren sollte statt alles zurückzusetzen.
    const odd = JSON.stringify({ state: { lists: [] }, version: 1 })
    localStorage.setItem('alexshop-store', odd)
    expect(safeStorage.getItem('alexshop-store')).toBe(odd)
    expect(storageStatus.getSnapshot().recovery).toBe(false)
  })

  it('returns the validated value unchanged for well-formed state', () => {
    const good = JSON.stringify({ state: { lists: [{ id: 'l', name: 'Liste', weekLabel: '', createdAt: 1, items: [] }] }, version: 1 })
    localStorage.setItem('alexshop-store', good)
    expect(JSON.parse(safeStorage.getItem('alexshop-store')!).state.lists).toHaveLength(1)
  })

  it('returns null and flags recovery for genuinely unparseable JSON', () => {
    localStorage.setItem('alexshop-store', '{not json')
    expect(safeStorage.getItem('alexshop-store')).toBeNull()
    expect(storageStatus.getSnapshot().recovery).toBe(true)
  })
})
