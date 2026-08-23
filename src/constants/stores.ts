import type { Currency } from '@/types'

/** Schweizer Ketten (CHF). */
export const STORE_PRESETS_CH = [
  'Migros',
  'Coop',
  'Denner',
  'Aldi Suisse',
  'Lidl Schweiz',
  'Spar',
  'Volg',
  'Manor',
  'Globus',
  'Landi',
  "Otto's",
  'Alnatura',
  'Avec',
  'Proxi',
] as const

/** Deutsche Ketten (EUR). */
export const STORE_PRESETS_DE = [
  'Marktkauf',
  'Edeka',
  'Rewe',
  'Aldi',
  'Lidl',
  'Penny',
  'Netto',
  'Kaufland',
  'Real',
  'dm',
  'Rossmann',
  'Budni',
  'Norma',
  'Hit',
] as const

/** Alle Presets (CH + DE) – für Migration / bekannte Namen. */
export const STORE_PRESETS = [...STORE_PRESETS_CH, ...STORE_PRESETS_DE] as const

export type StorePreset = (typeof STORE_PRESETS)[number]
export type StoreCountry = 'CH' | 'DE'

export function storeCountryFromCurrency(currency: Currency): StoreCountry {
  return currency === 'EUR' ? 'DE' : 'CH'
}

export function storePresetsForCountry(country: StoreCountry): readonly string[] {
  return country === 'DE' ? STORE_PRESETS_DE : STORE_PRESETS_CH
}

export function storePresetsForCurrency(currency: Currency): readonly string[] {
  return storePresetsForCountry(storeCountryFromCurrency(currency))
}

/** Alle Ketten: Landes-Presets + Custom (ohne Duplikate, Presets zuerst). */
export function mergeStoreOptions(
  customStores: string[] = [],
  currency: Currency = 'CHF'
): string[] {
  const presets = storePresetsForCurrency(currency)
  const seen = new Set<string>()
  const result: string[] = []
  for (const name of [...presets, ...customStores]) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

/** Prüft, ob der Name schon als Preset (beliebiges Land) oder Custom existiert. */
export function isKnownStoreName(name: string, customStores: string[] = []): boolean {
  const key = name.trim().toLowerCase()
  if (!key) return false
  if (STORE_PRESETS.some((s) => s.toLowerCase() === key)) return true
  return customStores.some((s) => s.trim().toLowerCase() === key)
}
