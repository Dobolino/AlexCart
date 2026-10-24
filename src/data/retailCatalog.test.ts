import { describe, expect, it } from 'vitest'
import { brandSearchKey, catalogBrand, findRetailer, retailSelection } from './retailCatalog'

describe('cross-border retail context', () => {
  it('recognizes named stores and branches before a previous browsing choice', () => {
    expect(
      retailSelection(
        { currency: 'EUR', retailSelection: { country: 'DE', retailerId: 'edeka' } },
        'Migros Bahnhof'
      )
    ).toEqual({ country: 'CH', retailerId: 'migros' })
    expect(findRetailer('Aldi Süd Freiburg')?.country).toBe('DE')
    expect(findRetailer('Aldi Suisse Basel')?.country).toBe('CH')
  })

  it('recovers from unknown or mismatched retailer preferences in older backups', () => {
    expect(
      retailSelection({ currency: 'CHF', retailSelection: { country: 'CH', retailerId: 'missing' } })
    ).toEqual({ country: 'CH', retailerId: 'migros' })
    expect(
      retailSelection({ currency: 'EUR', retailSelection: { country: 'CH', retailerId: 'edeka' } })
    ).toEqual({ country: 'DE', retailerId: 'edeka' })
  })

  it('finds brands despite accents and punctuation without moving private labels between stores', () => {
    expect(brandSearchKey('L’Oréal Paris')).toBe(brandSearchKey('Loreal Paris'))
    expect(catalogBrand('loreal paris')?.retailerIds).toEqual([])
    expect(catalogBrand('M Classic')?.retailerIds).toEqual(['migros'])
    expect(catalogBrand('Gut & Günstig')?.retailerIds).toEqual(['edeka', 'marktkauf'])
  })
})
