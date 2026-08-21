/** Filialen / Ketten für Bon-Import und Preisvergleich. */
export const STORE_PRESETS = [
  'Migros',
  'Coop',
  'Denner',
  'Aldi',
  'Lidl',
  'Spar',
  'Volg',
  'Andere',
] as const

export type StorePreset = (typeof STORE_PRESETS)[number]
