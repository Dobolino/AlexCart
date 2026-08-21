/** Vorgegebene Schweizer/EU-Ketten für Bon-Import und Preisvergleich. */
export const STORE_PRESETS = [
  'Migros',
  'Coop',
  'Denner',
  'Aldi',
  'Lidl',
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

export type StorePreset = (typeof STORE_PRESETS)[number]

/** Alle Ketten: Presets + vom Nutzer hinzugefügte (ohne Duplikate, Presets zuerst). */
export function mergeStoreOptions(customStores: string[] = []): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const name of [...STORE_PRESETS, ...customStores]) {
    const trimmed = name.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
  }
  return result
}

/** Prüft, ob der Name schon als Preset oder Custom existiert. */
export function isKnownStoreName(name: string, customStores: string[] = []): boolean {
  const key = name.trim().toLowerCase()
  if (!key) return false
  return mergeStoreOptions(customStores).some((s) => s.toLowerCase() === key)
}
