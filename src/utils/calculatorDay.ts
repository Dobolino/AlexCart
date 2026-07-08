import { todayKey } from './date'
import type { CalculatorEntry } from '@/types'

export function freshCalculatorEntries(
  entries: CalculatorEntry[],
  storedDate: string | undefined,
  today = todayKey()
): { entries: CalculatorEntry[]; date: string } {
  if (!storedDate || storedDate !== today) {
    return { entries: [], date: today }
  }
  return { entries, date: today }
}
