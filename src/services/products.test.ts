import { afterEach, describe, expect, it, vi } from 'vitest'

const apiRequest = vi.fn()
vi.mock('./api', () => ({
  apiBase: (c: string) => c || 'http://localhost/api',
  apiRequest: (...a: unknown[]) => apiRequest(...a),
}))
vi.mock('./localDatabase', () => ({
  cachedValue: vi.fn(async () => undefined),
  cacheValue: vi.fn(async () => undefined),
}))

import { lookupProduct, ProductLookupUnavailable } from './products'
import type { CatalogProduct } from '@/types/catalog'

const EAN = '4006381333931'

afterEach(() => {
  apiRequest.mockReset()
  vi.unstubAllGlobals()
})

describe('lookupProduct offline fallback', () => {
  it('finds locally stored products without any network call', async () => {
    const local = [{ id: 'p1', name: 'Milch', gtins: [EAN] } as unknown as CatalogProduct]
    await expect(lookupProduct(EAN, '', local)).resolves.toBe(local[0])
    expect(apiRequest).not.toHaveBeenCalled()
  })

  it('reports an unreachable product server as "unavailable" instead of a server error', async () => {
    apiRequest.mockRejectedValue(new Error('Server nicht erreichbar (404).'))
    await expect(lookupProduct(EAN, '', [])).rejects.toBeInstanceOf(ProductLookupUnavailable)
  })

  it('does not even try the network while the device is offline', async () => {
    vi.stubGlobal('navigator', { onLine: false })
    await expect(lookupProduct(EAN, '', [])).rejects.toBeInstanceOf(ProductLookupUnavailable)
    expect(apiRequest).not.toHaveBeenCalled()
  })
})
