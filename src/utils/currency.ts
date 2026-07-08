export function formatChf(amount: number): string {
  return `CHF ${amount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/** Parst Eingaben wie "12,50" oder "12.50" in eine Zahl (CHF). */
export function parseChfInput(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const value = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}
