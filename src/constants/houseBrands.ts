/** Bekannte Hausmarken – Schnellauswahl in Einstellungen → Preise & Marken. */
export const HOUSE_BRAND_PRESETS = [
  'M Classic',
  'M-Budget',
  'M-Bio',
  'Prix Garantie',
  'Naturaplan',
  'Gut & Günstig',
  'Denner',
  'Milbona',
  'Alesto',
] as const

export type HouseBrandPreset = (typeof HOUSE_BRAND_PRESETS)[number]
