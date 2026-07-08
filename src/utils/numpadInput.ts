export const NUMPAD_KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '⌫'] as const

export function applyMoneyNumpadKey(current: string, key: string): string {
  if (key === '⌫') return current.slice(0, -1)
  if (key === ',') {
    if (current.includes(',')) return current
    return current ? `${current},` : '0,'
  }
  const next = current + key
  const [, decimals] = next.split(',')
  if (decimals && decimals.length > 2) return current
  return next
}
