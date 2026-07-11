import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { estimateLocalStorageBytes, getStorageInfo } from './storageInfo'

describe('storageInfo', () => {
  const getItem = vi.fn((key: string) => (key === 'alexshop-store' ? '{"state":{},"version":10}' : null))

  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem })
    vi.stubGlobal('window', {
      location: { origin: 'https://example.com' },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('getStorageInfo liefert lesbaren Pfad', () => {
    const info = getStorageInfo()
    expect(info.storagePath).toContain('https://example.com')
    expect(info.storagePath).toContain('localStorage["alexshop-store"]')
    expect(info.primaryKey).toBe('alexshop-store')
  })

  it('estimateLocalStorageBytes schätzt Grösse', () => {
    const bytes = estimateLocalStorageBytes(['alexshop-store'])
    expect(bytes).toBeGreaterThan(0)
  })
})
