/** Max. 999'999.99 in Cent */
const MAX_CENTS = 99_999_999

export const NUMPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '⌫'] as const

/** Kassen-Eingabe: jede Ziffer schiebt die Dezimalstellen nach links (102.25 via 1-0-2-2-5). */
export function applyFixedDecimalKey(cents: number, key: string): number {
  if (key === '⌫') return Math.floor(cents / 10)
  if (key === 'C') return 0
  if (!/^\d$/.test(key)) return cents
  const next = cents * 10 + Number(key)
  return Math.min(next, MAX_CENTS)
}

export function centsToAmount(cents: number): number | null {
  if (cents <= 0) return null
  return Math.round(cents) / 100
}
