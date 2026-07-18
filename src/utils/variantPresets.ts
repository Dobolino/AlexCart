import { getIconKey } from '@/utils/icon'
import { normalize } from '@/utils/text'

/** Typische Dosengrössen – Schnellwahl beim Preis erfassen (g und ml). */
export const CAN_SIZE_PRESETS = ['400 g', '800 g', '400 ml', '800 ml'] as const

const DOSE_AMOUNT_PATTERN = /\b(dose|dosen)\b/i

/** Produkte mit Dosen-Icon oder Dosen-Mengenangabe. */
export function isCanProduct(name: string, category: string, amount = ''): boolean {
  if (getIconKey(name, category) === 'dose') return true
  if (DOSE_AMOUNT_PATTERN.test(amount)) return true
  const n = normalize(name)
  return n.includes('dose') || n.includes('tomatenmark') || n.includes('passierte tomaten')
}

/** Grössen-Schnellwahl für Varianten – aktuell Dosen (400 ml / 800 ml). */
export function getVariantSizePresets(name: string, category: string, amount = ''): string[] {
  if (!isCanProduct(name, category, amount)) return []
  return [...CAN_SIZE_PRESETS]
}

export function findVariantIdByName(
  variants: { id: string; name: string }[],
  preset: string
): string | undefined {
  const key = normalize(preset)
  return variants.find((v) => normalize(v.name) === key)?.id
}
