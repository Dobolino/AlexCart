import { afterEach, describe, expect, it, vi } from 'vitest'
import { restoreBackupJSON } from './backup'

afterEach(() => vi.unstubAllGlobals())

describe('restoreBackupJSON', () => {
  it('rejects an empty state before replacing stored data', () => {
    const setItem = vi.fn()
    vi.stubGlobal('localStorage', { setItem })
    expect(restoreBackupJSON('{"state":{},"version":19}').ok).toBe(false)
    expect(setItem).not.toHaveBeenCalled()
  })

  it('reports a storage failure instead of claiming the restore succeeded', () => {
    vi.stubGlobal('localStorage', { setItem: () => { throw new Error('quota') } })
    const json = JSON.stringify({ state: { lists: [{ id: 'list-1', items: [] }] }, version: 19 })
    expect(restoreBackupJSON(json).ok).toBe(false)
  })
})
