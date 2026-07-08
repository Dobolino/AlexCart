import type { PurchaseLogEntry } from '@/types'

/** Montag der ISO-Woche für ein YYYY-MM-DD Datum. */
export function isoWeekStart(dateKey: string): string {
  const d = new Date(dateKey + 'T00:00:00')
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day)
  return d.toLocaleDateString('sv-SE')
}

export function currentWeekStart(reference = new Date()): string {
  return isoWeekStart(reference.toLocaleDateString('sv-SE'))
}

/** Summe erfasster Preise in der aktuellen Kalenderwoche. */
export function currentWeekSpend(log: PurchaseLogEntry[], reference = new Date()): number {
  const weekStart = currentWeekStart(reference)
  let total = 0
  for (const entry of log) {
    if (!entry.price || entry.price <= 0) continue
    if (isoWeekStart(entry.date) !== weekStart) continue
    total += entry.price
  }
  return Math.round(total * 100) / 100
}

export type BudgetStatus = 'ok' | 'warn' | 'over'

export interface BudgetProgress {
  spent: number
  budget: number
  remaining: number
  percent: number
  status: BudgetStatus
}

export function budgetProgress(spent: number, budget: number): BudgetProgress {
  const safeBudget = Math.max(0, budget)
  const safeSpent = Math.max(0, spent)
  if (safeBudget <= 0) {
    return { spent: safeSpent, budget: 0, remaining: 0, percent: 0, status: 'ok' }
  }
  const percent = Math.round((safeSpent / safeBudget) * 100)
  const remaining = Math.round((safeBudget - safeSpent) * 100) / 100
  let status: BudgetStatus = 'ok'
  if (percent >= 100) status = 'over'
  else if (percent >= 80) status = 'warn'
  return { spent: safeSpent, budget: safeBudget, remaining, percent, status }
}

/** Gesamtausgaben für Budget-Anzeige: Wocheneinkäufe + laufende Rechner-Summe. */
export function totalBudgetSpend(weekSpend: number, calculatorTotal: number): number {
  return Math.round((weekSpend + Math.max(0, calculatorTotal)) * 100) / 100
}
