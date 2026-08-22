import { tripTotalSpent } from '@/utils/stats'
import { timestampToDateKey } from '@/utils/date'
import type { CompletedTrip } from '@/types'

export interface TripDaySummary {
  dateKey: string
  tripCount: number
  totalSpent: number
}

/** Einkäufe pro Kalendertag (YYYY-MM-DD). */
export function tripsByDateKey(trips: CompletedTrip[]): Map<string, TripDaySummary> {
  const map = new Map<string, TripDaySummary>()
  for (const trip of trips) {
    const dateKey = timestampToDateKey(trip.completedAt)
    const spent = tripTotalSpent(trip)
    const existing = map.get(dateKey)
    if (existing) {
      existing.tripCount += 1
      existing.totalSpent = Math.round((existing.totalSpent + spent) * 100) / 100
    } else {
      map.set(dateKey, { dateKey, tripCount: 1, totalSpent: spent })
    }
  }
  return map
}

export interface CalendarCell {
  dateKey: string | null
  day: number | null
  inMonth: boolean
}

/** Mo–So Raster für einen Monat (Mo = erste Spalte). */
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const first = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0).getDate()
  const startPad = (first.getDay() + 6) % 7
  const cells: CalendarCell[] = []

  for (let i = 0; i < startPad; i++) {
    cells.push({ dateKey: null, day: null, inMonth: false })
  }
  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, month, day)
    cells.push({
      day,
      inMonth: true,
      dateKey: d.toLocaleDateString('sv-SE'),
    })
  }
  while (cells.length % 7 !== 0) {
    cells.push({ dateKey: null, day: null, inMonth: false })
  }
  return cells
}

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
