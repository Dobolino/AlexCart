import type { Currency } from '@/types'

export function formatMoney(amount: number, currency: Currency): string {
  if (currency === 'EUR') {
    return `${amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
  }
  return `CHF ${amount.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function currencySymbol(currency: Currency): string {
  return currency === 'EUR' ? '€' : 'CHF'
}

/** Parst Eingaben wie "12,50" oder "12.50" in eine Zahl. */
export function parseMoneyInput(input: string): number | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const value = parseFloat(trimmed.replace(',', '.'))
  if (!Number.isFinite(value) || value <= 0) return null
  return Math.round(value * 100) / 100
}

/** @deprecated Nutze formatMoney(amount, 'CHF') */
export function formatChf(amount: number): string {
  return formatMoney(amount, 'CHF')
}

/** @deprecated Nutze parseMoneyInput */
export const parseChfInput = parseMoneyInput
