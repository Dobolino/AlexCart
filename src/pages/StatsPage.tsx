import { useState } from 'react'
import { useStore } from '@/store/useStore'
import {
  topItems,
  categoryBreakdown,
  avgItemsPerTrip,
  distinctShoppingDays,
  productsPerWeek,
  totalSpent,
  avgSpendPerTrip,
  maxTripSpend,
  pricedPurchaseCount,
  avgSpendPerCompletedTrip,
  avgItemsPerCompletedTrip,
  completedTripsPerWeek,
  tripTotalSpent,
  tripsByMonth,
  isoWeekNumber,
} from '@/utils/stats'
import { productPriceHistory, spendPerWeek } from '@/utils/priceHistory'
import { avgBasketByStore, promoSavingsInYear } from '@/utils/storeStats'
import { productPricePerKg } from '@/utils/priceProfiles'
import { pricePer100gFromKg } from '@/utils/producePrice'
import { formatMoney } from '@/utils/currency'
import { PageHeader } from '@/components/PageHeader'
import { EmptyState } from '@/components/EmptyState'
import { ReceiptSheet } from '@/components/ReceiptSheet'
import { PromoSavingsHighlight } from '@/components/PromoSavingsHighlight'
import { StoreComparisonSection } from '@/components/StoreComparisonSection'
import { ICON_PATHS } from '@/constants/icons'

function StatTile({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="card-surface flex-1 px-3 py-4 text-center">
      <div className="mb-0.5 text-[22px] font-extrabold leading-none">{value}</div>
      <div className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
    </div>
  )
}

export function StatsPage() {
  const purchaseLog = useStore((s) => s.purchaseLog)
  const completedTrips = useStore((s) => s.completedTrips)
  const priceProfiles = useStore((s) => s.priceProfiles)
  const stats = useStore((s) => s.stats)
  const lists = useStore((s) => s.lists)
  const currency = useStore((s) => s.settings.currency)
  const resetStats = useStore((s) => s.resetStats)
  const updateCompletedTripItemPrice = useStore((s) => s.updateCompletedTripItemPrice)
  const updateCompletedTripStore = useStore((s) => s.updateCompletedTripStore)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)

  const top = topItems(purchaseLog)
  const categories = categoryBreakdown(purchaseLog)
  const weeks = productsPerWeek(purchaseLog, 8)
  const maxCategoryCount = categories[0]?.count ?? 1
  const maxTopCount = top[0]?.count ?? 1
  const maxWeekCount = Math.max(1, ...weeks.map((w) => w.count))
  const completionRate = stats.itemsAddedTotal > 0 ? Math.round((purchaseLog.length / stats.itemsAddedTotal) * 100) : 0
  const hasPriceData = pricedPurchaseCount(purchaseLog) > 0
  const priceHistory = productPriceHistory(purchaseLog)
  const spendWeeks = spendPerWeek(purchaseLog, 8)
  const maxSpendWeek = Math.max(0.01, ...spendWeeks.map((w) => w.amount))
  const hasCompletedTrips = completedTrips.length > 0
  const tripWeeks = completedTripsPerWeek(completedTrips, 8)
  const maxTripWeekCount = Math.max(1, ...tripWeeks.map((w) => w.count))
  const tripMonths = tripsByMonth(completedTrips)
  const selectedTrip = completedTrips.find((t) => t.id === selectedTripId) ?? null
  const storeStats = avgBasketByStore(completedTrips)
  const promoSavings = promoSavingsInYear(purchaseLog, priceProfiles)

  return (
    <>
      <PageHeader title="Statistik" subtitle="Deine Einkaufsgewohnheiten" />
      <main className="scroll-behind-nav min-h-0 flex-1 overflow-y-auto px-3 pt-3">
        <PromoSavingsHighlight amount={promoSavings} currency={currency} />
        <StoreComparisonSection stores={storeStats} currency={currency} />
        <div className="mb-2.5 grid grid-cols-3 gap-2.5">
          <StatTile value={lists.length} label="Einkaufslisten" />
          <StatTile value={purchaseLog.length} label="Produkte gekauft" />
          <StatTile value={`${completionRate}%`} label="Erledigungsquote" />
        </div>
        <p className="mb-2.5 px-1.5 text-[12px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          Statistik entsteht beim Abhaken von Artikeln. Weitere Listen: auf der Liste den Titel oben antippen.
        </p>
        <div className="mb-4.5 grid grid-cols-3 gap-2.5">
          <StatTile value={avgItemsPerTrip(purchaseLog).toFixed(1)} label="Ø pro Einkauf" />
          <StatTile value={stats.importsCount} label="Importierte Listen" />
          <StatTile value={stats.manualProductsCreated} label="Eigene Produkte" />
        </div>

        {hasCompletedTrips && (
          <div className="mb-4.5 grid grid-cols-3 gap-2.5">
            <StatTile value={completedTrips.length} label="Abgeschlossene Einkäufe" />
            <StatTile value={avgItemsPerCompletedTrip(completedTrips).toFixed(1)} label="Ø Artikel/Liste" />
            <StatTile value={formatMoney(avgSpendPerCompletedTrip(completedTrips), currency)} label="Ø Wert/Liste" />
          </div>
        )}

        {hasCompletedTrips && (
          <>
            <div
              className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
              style={{ color: 'var(--category-fg)' }}
            >
              Abgeschlossene Einkäufe pro Woche
            </div>
            <div className="card-surface mb-4.5 flex items-end gap-1.5 px-4 py-4" style={{ height: 100 }}>
              {tripWeeks.map((w) => (
                <div key={w.weekStart} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${Math.max(4, (w.count / maxTripWeekCount) * 64)}px`,
                      background: 'var(--accent)',
                      opacity: w.count ? 1 : 0.25,
                    }}
                  />
                </div>
              ))}
            </div>

            <div
              className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
              style={{ color: 'var(--category-fg)' }}
            >
              Einkaufsverlauf
            </div>
            {tripMonths.map((group) => (
              <div key={group.key} className="mb-4.5">
                <div className="mb-1.5 flex items-center justify-between px-1.5">
                  <span className="text-[12px] font-bold" style={{ color: 'var(--text-muted)' }}>
                    {group.label}
                  </span>
                  <span className="text-[12px] font-bold tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {formatMoney(group.subtotal, currency)}
                  </span>
                </div>
                <div className="card-surface">
                  {group.trips.map((trip) => (
                    <button
                      key={trip.id}
                      type="button"
                      className="tap-scale flex w-full items-center justify-between border-b px-3.5 py-3 text-left last:border-b-0"
                      style={{ borderColor: 'var(--border)' }}
                      onClick={() => setSelectedTripId(trip.id)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-semibold">
                          KW {isoWeekNumber(new Date(trip.completedAt))} ·{' '}
                          {new Date(trip.completedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </span>
                        <span className="block truncate text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          {trip.listName}
                          {trip.store && ` · ${trip.store}`} · {trip.items.length} Artikel
                        </span>
                      </span>
                      <span className="shrink-0 text-[14px] font-bold tabular-nums">
                        {formatMoney(tripTotalSpent(trip), currency)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {hasPriceData && (
          <div className="mb-4.5 grid grid-cols-3 gap-2.5">
            <StatTile value={formatMoney(avgSpendPerTrip(purchaseLog), currency)} label="Ø Ausgaben" />
            <StatTile value={formatMoney(maxTripSpend(purchaseLog), currency)} label="Teuerster Tag" />
            <StatTile value={formatMoney(totalSpent(purchaseLog), currency)} label="Gesamt erfasst" />
          </div>
        )}

        {!purchaseLog.length ? (
          <EmptyState
            icon={ICON_PATHS.chart}
            title="Noch keine Daten"
            hint="Hak ein paar Artikel in deiner Liste ab, um Statistiken zu sehen."
          />
        ) : (
          <>
            <div
              className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
              style={{ color: 'var(--category-fg)' }}
            >
              Produkte pro Woche
            </div>
            <div className="card-surface mb-4.5 flex items-end gap-1.5 px-4 py-4" style={{ height: 100 }}>
              {weeks.map((w) => (
                <div key={w.weekStart} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <div
                    className="w-full rounded-t-md"
                    style={{
                      height: `${Math.max(4, (w.count / maxWeekCount) * 64)}px`,
                      background: 'var(--accent)',
                      opacity: w.count ? 1 : 0.25,
                    }}
                  />
                </div>
              ))}
            </div>

            {hasPriceData && (
              <>
                <div
                  className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
                  style={{ color: 'var(--category-fg)' }}
                >
                  Ausgaben pro Woche
                </div>
                <div className="card-surface mb-4.5 flex items-end gap-1.5 px-4 py-4" style={{ height: 100 }}>
                  {spendWeeks.map((w) => (
                    <div key={w.weekStart} className="flex flex-1 flex-col items-center justify-end gap-1">
                      <div
                        className="w-full rounded-t-md"
                        style={{
                          height: `${Math.max(4, (w.amount / maxSpendWeek) * 64)}px`,
                          background: 'var(--accent)',
                          opacity: w.amount ? 1 : 0.25,
                        }}
                      />
                    </div>
                  ))}
                </div>

                <div
                  className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
                  style={{ color: 'var(--category-fg)' }}
                >
                  Preisverlauf
                </div>
                <div className="card-surface mb-4.5 px-4 py-3.5">
                  {priceHistory.slice(0, 8).map((entry) => {
                    const perKg = productPricePerKg(priceProfiles, entry.name, entry.category)
                    return (
                      <div key={entry.name} className="mb-3 border-b pb-3 last:mb-0 last:border-b-0" style={{ borderColor: 'var(--border)' }}>
                        <div className="mb-0.5 flex items-baseline justify-between gap-2">
                          <span className="text-[14px] font-bold">{entry.name}</span>
                          {perKg !== null && (
                            <span className="shrink-0 text-[12px] font-bold tabular-nums" style={{ color: 'var(--accent)' }}>
                              {formatMoney(pricePer100gFromKg(perKg), currency)}/100 g
                            </span>
                          )}
                        </div>
                        <div className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                          Zuletzt {formatMoney(entry.lastPrice, currency)} · Ø {formatMoney(entry.avgPrice, currency)} · {entry.count}× erfasst
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            <div
              className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
              style={{ color: 'var(--category-fg)' }}
            >
              Meistgekaufte Artikel
            </div>
            <div className="card-surface mb-4.5 px-4 py-3.5">
              {top.map((entry) => (
                <div key={entry.label} className="mb-2.5 last:mb-0">
                  <div className="mb-1 flex justify-between text-[13px] font-semibold">
                    <span>{entry.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{entry.count}×</span>
                  </div>
                  <div className="progress-track h-1.5">
                    <div className="progress-fill" style={{ width: `${(entry.count / maxTopCount) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mb-2 px-1.5 text-[13px] font-extrabold uppercase tracking-wide"
              style={{ color: 'var(--category-fg)' }}
            >
              Meistgenutzte Kategorien
            </div>
            <div className="card-surface mb-4.5 px-4 py-3.5">
              {categories.map((entry) => (
                <div key={entry.label} className="mb-2.5 last:mb-0">
                  <div className="mb-1 flex justify-between text-[13px] font-semibold">
                    <span>{entry.label}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{entry.count}×</span>
                  </div>
                  <div className="progress-track h-1.5">
                    <div
                      className="progress-fill"
                      style={{ width: `${(entry.count / maxCategoryCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <p className="mb-4 px-1.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
              An {distinctShoppingDays(purchaseLog)} Tagen eingekauft
              {hasPriceData ? ` · ${pricedPurchaseCount(purchaseLog)} Preise erfasst` : ''}.
            </p>

            <button
              className="btn-soft w-full py-3 text-[13px]"
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
              onClick={() => {
                if (window.confirm('Statistik wirklich zurücksetzen?')) resetStats()
              }}
            >
              Statistik zurücksetzen
            </button>
          </>
        )}
      </main>

      {selectedTrip && (
        <ReceiptSheet
          trip={selectedTrip}
          currency={currency}
          onClose={() => setSelectedTripId(null)}
          onUpdatePrice={(itemId, price) => updateCompletedTripItemPrice(selectedTrip.id, itemId, price)}
          onUpdateStore={(store) => updateCompletedTripStore(selectedTrip.id, store)}
        />
      )}
    </>
  )
}
