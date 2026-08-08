import { describe, expect, it } from 'vitest'
import { getVariantSizePresets, isCanProduct, findVariantIdByName, offersCanSize, CAN_SIZE_UNITS } from './variantPresets'

describe('variantPresets', () => {
  it('erkennt Dosen-Produkte', () => {
    expect(isCanProduct('Tomatenmark', 'Konserven & Saucen')).toBe(true)
    expect(isCanProduct('Milch', 'Milch & Käse')).toBe(false)
    expect(isCanProduct('Bohnen', 'Konserven & Saucen', '2 Dosen')).toBe(true)
  })

  it('liefert g- und ml-Dosengrössen', () => {
    expect(getVariantSizePresets('Ketchup', 'Konserven & Saucen')).toEqual([
      '400 g',
      '800 g',
      '400 ml',
      '800 ml',
    ])
    expect(getVariantSizePresets('Milch', 'Milch & Käse')).toEqual([])
  })

  it('bietet Klein/Gross für Dosen und Konserven-Kategorie', () => {
    expect(offersCanSize('Tomatenmark', 'Konserven & Saucen')).toBe(true)
    expect(offersCanSize('Kidneybohnen', 'Konserven & Saucen')).toBe(true)
    expect(offersCanSize('Milch', 'Milch & Käse')).toBe(false)
    expect(CAN_SIZE_UNITS.klein).toBe('kleine Dose')
    expect(CAN_SIZE_UNITS.gross).toBe('grosse Dose')
  })

  it('findet bestehende Variante per Name', () => {
    const id = findVariantIdByName(
      [
        { id: 'a', name: '400 ml' },
        { id: 'b', name: 'Coop Bio' },
      ],
      '400 ml'
    )
    expect(id).toBe('a')
  })
})
