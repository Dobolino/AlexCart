import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import {
  PRICE_ARCHIVE_MAX_BYTES,
  parsePriceArchive,
  preparePriceArchiveImport,
  type PriceArchive,
  type PriceArchiveState,
} from './priceArchive'

function archive(): PriceArchive {
  return {
    format: 'alexshop-price-archive',
    version: 1,
    catalog: [
      {
        id: 'milk',
        name: 'Milch',
        brand: 'Testmarke',
        category: 'Milch & Käse',
        gtins: [],
        netQuantity: { value: 1000, unit: 'ml' },
        source: 'manual',
        updatedAt: '2026-10-01T12:00:00.000Z',
      },
    ],
    retailStores: [{ id: 'migros', retailerId: 'migros', name: 'Migros', country: 'CH', currency: 'CHF' }],
    priceObservations: [
      {
        id: 'old-price',
        productId: 'milk',
        storeId: 'migros',
        price: { minor: 170, currency: 'CHF' },
        basis: 'package',
        observedAt: '2026-10-01T12:00:00.000Z',
        source: 'receipt',
      },
    ],
  }
}
const empty = (): PriceArchiveState => ({ catalog: [], retailStores: [], priceObservations: [] })

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-07T15:00:00.000Z'))
})
afterEach(() => vi.useRealTimers())

describe('historical price archives', () => {
  it('parses a price-only archive and strips unrelated fields instead of restoring an app backup', () => {
    const data = { ...archive(), purchaseLog: [{ price: 99 }], settings: { currency: 'EUR' } }
    expect(parsePriceArchive(JSON.stringify(data))).toEqual(archive())
    expect(() => parsePriceArchive('{"version":26,"state":{}}')).toThrow(/Preisarchiv/)
  })
  it('rejects malformed JSON and oversize UTF-8 files', () => {
    expect(() => parsePriceArchive('{')).toThrow(/JSON/)
    expect(() => parsePriceArchive('ä'.repeat(PRICE_ARCHIVE_MAX_BYTES / 2 + 1))).toThrow(/8 MB/)
  })
  it('rejects money without a product or store and duplicated IDs', () => {
    const data = archive()
    data.priceObservations[0]!.productId = 'missing'
    expect(() => parsePriceArchive(JSON.stringify(data))).toThrow(/unbekannt/)
    data.priceObservations[0]!.productId = 'milk'
    data.priceObservations.push({ ...data.priceObservations[0]! })
    expect(() => parsePriceArchive(JSON.stringify(data))).toThrow(/Doppelte Preis-IDs/)
  })
  it('rejects impossible dates, future observations and inconsistent currencies', () => {
    const data = archive()
    data.priceObservations[0]!.observedAt = '2026-02-30T12:00:00.000Z'
    expect(() => parsePriceArchive(JSON.stringify(data))).toThrow(/Datum|Preisarchiv/)
    data.priceObservations[0]!.observedAt = '2026-11-08T00:00:00.000Z'
    expect(() => parsePriceArchive(JSON.stringify(data))).toThrow(/Zukunft/)
    data.priceObservations[0]!.observedAt = '2026-11-07T12:00:00.000Z'
    data.priceObservations[0]!.price.currency = 'EUR'
    expect(() => parsePriceArchive(JSON.stringify(data))).toThrow(/Originalwährung/)
    data.retailStores[0]!.currency = 'EUR'
    expect(() => parsePriceArchive(JSON.stringify(data))).toThrow(/Land/)
  })
  it('blocks refunds, purchase links, external/manual sources and unknown package sizes', () => {
    const data = archive()
    data.priceObservations[0]!.price.minor = 0
    expect(() => parsePriceArchive(JSON.stringify(data))).toThrow(/Betrag/)
    data.priceObservations[0]!.price.minor = 170
    data.priceObservations[0]!.purchaseLogId = 'real-purchase'
    expect(() => parsePriceArchive(JSON.stringify(data))).toThrow(/Kaufverknüpfung/)
    delete data.priceObservations[0]!.purchaseLogId
    data.priceObservations[0]!.source = 'open-prices'
    expect(() => parsePriceArchive(JSON.stringify(data))).toThrow(/Bonpreise/)
    data.priceObservations[0]!.source = 'receipt'
    delete data.catalog[0]!.netQuantity
    expect(() => parsePriceArchive(JSON.stringify(data))).toThrow(/Packungsgröße/)
  })
  it('requires unit prices to match the product dimension and keeps historical money in its original currency', () => {
    const data = archive()
    data.priceObservations[0]!.basis = 'kg'
    expect(() => parsePriceArchive(JSON.stringify(data))).toThrow(/Einheiten/)
    data.priceObservations[0]!.basis = 'l'
    expect(parsePriceArchive(JSON.stringify(data)).priceObservations[0]!.price).toEqual({
      minor: 170,
      currency: 'CHF',
    })
  })
  it('adds only selected price data without changing the supplied state or overwriting newer prices', () => {
    const current = archive()
    current.priceObservations[0] = {
      ...current.priceObservations[0]!,
      id: 'newer-price',
      observedAt: '2026-11-06T12:00:00.000Z',
      price: { minor: 185, currency: 'CHF' },
    }
    const before = structuredClone(current)
    const plan = preparePriceArchiveImport(current, archive())
    expect(current).toEqual(before)
    expect(plan.addedProducts).toBe(0)
    expect(plan.addedObservations).toBe(1)
    expect(plan.priceObservations).toEqual([...current.priceObservations, archive().priceObservations[0]])
    expect(Object.keys(plan).sort()).toEqual(
      [
        'catalog',
        'retailStores',
        'priceObservations',
        'addedProducts',
        'addedObservations',
        'skippedObservations',
      ].sort()
    )
  })
  it('is idempotent and deduplicates an equivalent product/store/price under different source IDs', () => {
    const first = preparePriceArchiveImport(empty(), archive())
    expect(first.addedProducts).toBe(1)
    expect(preparePriceArchiveImport(first, archive()).addedObservations).toBe(0)
    const second = archive()
    second.catalog[0]!.id = 'another-milk'
    second.retailStores[0]!.id = 'another-store'
    Object.assign(second.priceObservations[0]!, {
      id: 'another-price',
      productId: 'another-milk',
      storeId: 'another-store',
    })
    const plan = preparePriceArchiveImport(first, second)
    expect(plan.addedProducts).toBe(0)
    expect(plan.addedObservations).toBe(0)
    expect(plan.skippedObservations).toBe(1)
    expect(plan.retailStores).toHaveLength(1)
    second.priceObservations[0]!.observedAt = '2026-10-01T12:00:00Z'
    expect(preparePriceArchiveImport(first, second).addedObservations).toBe(0)
  })
  it('never retags conflicting product/store/price IDs, even if another entry could match', () => {
    const current = archive()
    const before = structuredClone(current)
    const productConflict = archive()
    productConflict.catalog[0]!.brand = 'Andere Marke'
    expect(() => preparePriceArchiveImport(current, productConflict)).toThrow(/Produkt-ID/)
    const storeConflict = archive()
    storeConflict.retailStores[0]!.name = 'Andere Filiale'
    expect(() => preparePriceArchiveImport(current, storeConflict)).toThrow(/Geschäfts-ID/)
    const priceConflict = archive()
    priceConflict.priceObservations[0]!.price.minor = 180
    expect(() => preparePriceArchiveImport(current, priceConflict)).toThrow(/Preis-ID/)
    expect(current).toEqual(before)
  })
  it('keeps other brands, pack sizes, stores, dates and promotion conditions separate', () => {
    const current = archive()
    const another = archive()
    another.catalog[0]!.id = 'other-brand'
    another.catalog[0]!.brand = 'Andere Marke'
    another.catalog[0]!.netQuantity = { value: 500, unit: 'ml' }
    another.retailStores[0]!.id = 'other-store'
    another.retailStores[0]!.name = 'Migros Nord'
    Object.assign(another.priceObservations[0]!, {
      id: 'other-price',
      productId: 'other-brand',
      storeId: 'other-store',
      discounted: true,
      loyaltyRequired: true,
    })
    const plan = preparePriceArchiveImport(current, another)
    expect(plan.addedProducts).toBe(1)
    expect(plan.addedObservations).toBe(1)
    expect(plan.priceObservations[1]).toMatchObject({ discounted: true, loyaltyRequired: true })
  })
  it('does not equate unknown house brands with the same receipt label and size across retailers', () => {
    const migros = archive()
    migros.catalog[0]!.name = 'Skyr Nature'
    delete migros.catalog[0]!.brand
    const first = preparePriceArchiveImport(empty(), migros)
    const edeka = structuredClone(migros)
    edeka.catalog[0]!.id = 'edeka-skyr'
    edeka.retailStores[0] = {
      id: 'edeka',
      retailerId: 'edeka',
      name: 'EDEKA',
      country: 'DE',
      currency: 'EUR',
    }
    Object.assign(edeka.priceObservations[0]!, {
      id: 'edeka-price',
      productId: 'edeka-skyr',
      storeId: 'edeka',
      price: { minor: 150, currency: 'EUR' },
    })
    const plan = preparePriceArchiveImport(first, edeka)
    expect(plan.addedProducts).toBe(1)
    expect(plan.catalog).toHaveLength(2)
    expect(plan.priceObservations[1]!.productId).toBe('edeka-skyr')
    expect(preparePriceArchiveImport(plan, edeka).addedObservations).toBe(0)
  })
  it('can deduplicate an unknown brand with the same verified GTIN set under different source IDs', () => {
    const data = archive()
    delete data.catalog[0]!.brand
    data.catalog[0]!.gtins = ['96385074', '4006381333931']
    const first = preparePriceArchiveImport(empty(), data)
    const equivalent = structuredClone(data)
    equivalent.catalog[0]!.id = 'same-product'
    equivalent.catalog[0]!.gtins.reverse()
    equivalent.priceObservations[0]!.id = 'same-price'
    equivalent.priceObservations[0]!.productId = 'same-product'
    const plan = preparePriceArchiveImport(first, equivalent)
    expect(plan.addedProducts).toBe(0)
    expect(plan.addedObservations).toBe(0)
    equivalent.catalog[0]!.gtins = ['4006381333932']
    expect(() => preparePriceArchiveImport(first, equivalent)).toThrow(/Produktbarcode/)
  })
  it('does not treat one-pack placeholders as a known physical pack size even with a known brand', () => {
    const data = archive()
    data.catalog[0]!.netQuantity = { value: 1, unit: 'piece' }
    const first = preparePriceArchiveImport(empty(), data)
    const otherPackage = structuredClone(data)
    otherPackage.catalog[0]!.id = 'potentially-different-pack-size'
    otherPackage.priceObservations[0]!.id = 'other-pack-price'
    otherPackage.priceObservations[0]!.productId = 'potentially-different-pack-size'
    const plan = preparePriceArchiveImport(first, otherPackage)
    expect(plan.addedProducts).toBe(1)
    expect(plan.addedObservations).toBe(1)
    expect(preparePriceArchiveImport(plan, otherPackage).addedProducts).toBe(0)
  })
  it('does not import unselected data and validates edited drafts again', () => {
    const data = archive()
    const plan = preparePriceArchiveImport(empty(), data, [])
    expect(plan.addedObservations).toBe(0)
    expect(plan.catalog).toHaveLength(0)
    expect(plan.retailStores).toHaveLength(0)
    expect(() => preparePriceArchiveImport(empty(), data, ['not-in-this-file'])).toThrow(/Produktauswahl/)
    data.catalog[0]!.name = ' '
    expect(() => preparePriceArchiveImport(empty(), data)).toThrow(/Artikelname/)
  })
})
