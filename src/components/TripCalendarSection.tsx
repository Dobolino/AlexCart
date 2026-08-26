import { useState } from 'react'
import { formatMoney } from '@/utils/currency'
import { buildMonthGrid, tripsByDateKey, WEEKDAY_LABELS } from '@/utils/tripCalendar'
import type { CompletedTrip, Currency } from '@/types'

interface TripCalendarSectionProps {
  trips: CompletedTrip[]
  currency: Currency
  onSelectDate?: (dateKey: string) => void
  selectedDateKey?: string | null
}

export function TripCalendarSection({
  trips,
  currency,
  onSelectDate,
  selectedDateKey,
}: TripCalendarSectionProps) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  if (!trips.length) return null

  const byDay = tripsByDateKey(trips)
  const grid = buildMonthGrid(year, month)
  const monthLabel = new Date(year, month, 1).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })

  function prevMonth() {
    if (month === 0) {
      setMonth(11)
      setYear((y) => y - 1)
    } else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0)
      setYear((y) => y + 1)
    } else setMonth((m) => m + 1)
  }

  return (
    <div className="mb-4.5">
      <div
        className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
        style={{ color: 'var(--category-fg)' }}
      >
        Einkaufs-Kalender
      </div>
      <div className="card-surface px-3.5 py-3.5">
        <div className="mb-3 flex items-center justify-between">
          <button type="button" className="tap-scale btn-soft px-3 py-1.5 text-[13px] font-bold" onClick={prevMonth}>
            ‹
          </button>
          <span className="text-[14px] font-bold capitalize">{monthLabel}</span>
          <button type="button" className="tap-scale btn-soft px-3 py-1.5 text-[13px] font-bold" onClick={nextMonth}>
            ›
          </button>
        </div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="text-center text-[10px] font-bold uppercase"
              style={{ color: 'var(--text-muted)' }}
            >
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {grid.map((cell, index) => {
            if (!cell.inMonth || !cell.dateKey) {
              return <div key={`pad-${index}`} className="aspect-square" />
            }
            const summary = byDay.get(cell.dateKey)
            const selected = selectedDateKey === cell.dateKey
            const isToday = cell.dateKey === new Date().toLocaleDateString('sv-SE')
            return (
              <button
                key={cell.dateKey}
                type="button"
                className="tap-scale flex aspect-square flex-col items-center justify-center rounded-xl text-[12px] font-bold"
                style={{
                  background: selected
                    ? 'var(--accent)'
                    : summary
                      ? 'var(--accent-soft)'
                      : 'var(--chip-bg)',
                  color: selected ? 'var(--accent-fg)' : summary ? 'var(--accent)' : 'var(--text)',
                  outline: isToday && !selected ? '2px solid var(--accent)' : 'none',
                }}
                onClick={() => onSelectDate?.(cell.dateKey!)}
                title={
                  summary
                    ? `${summary.tripCount} Einkauf${summary.tripCount > 1 ? 'e' : ''} · ${formatMoney(summary.totalSpent, currency)}`
                    : undefined
                }
              >
                <span>{cell.day}</span>
                {summary ? (
                  <span className="mt-0.5 h-1 w-1 rounded-full" style={{ background: 'currentColor' }} />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
