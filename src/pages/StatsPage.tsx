import { useStore } from '@/store/useStore'
import { topItems, categoryBreakdown } from '@/utils/stats'
import { PageHeader } from '@/components/PageHeader'
import { Icon } from '@/components/Icon'
import { ICON_PATHS } from '@/constants/icons'

export function StatsPage() {
  const purchaseLog = useStore((s) => s.purchaseLog)
  const streak = useStore((s) => s.streak)
  const resetStats = useStore((s) => s.resetStats)

  const top = topItems(purchaseLog)
  const categories = categoryBreakdown(purchaseLog)
  const maxCategoryCount = categories[0]?.count ?? 1
  const maxTopCount = top[0]?.count ?? 1

  return (
    <>
      <PageHeader title="Statistik" subtitle="Deine Einkaufsgewohnheiten" />
      <main className="flex-1 px-3 pt-3" style={{ paddingBottom: 'calc(90px + var(--safe-bottom))' }}>
        <div className="mb-4 flex gap-2.5">
          <div className="card-surface flex-1 px-4 py-4 text-center">
            <div className="mb-1 flex items-center justify-center gap-1.5" style={{ color: 'var(--accent)' }}>
              <Icon path={ICON_PATHS.flame} size={22} />
              <span className="text-[24px] font-extrabold" style={{ color: 'var(--text)' }}>
                {streak.current}
              </span>
            </div>
            <div className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              Tage-Streak
            </div>
          </div>
          <div className="card-surface flex-1 px-4 py-4 text-center">
            <div className="mb-1 text-[24px] font-extrabold">{streak.longest}</div>
            <div className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              Längste Serie
            </div>
          </div>
          <div className="card-surface flex-1 px-4 py-4 text-center">
            <div className="mb-1 text-[24px] font-extrabold">{purchaseLog.length}</div>
            <div className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>
              Abgehakt gesamt
            </div>
          </div>
        </div>

        {!purchaseLog.length ? (
          <div className="py-10 text-center text-[15px]" style={{ color: 'var(--text-muted)' }}>
            <div className="mb-2.5 flex justify-center">
              <Icon path={ICON_PATHS.chart} size={40} />
            </div>
            Noch keine Daten. Hak ein paar Artikel in deiner Liste ab.
          </div>
        ) : (
          <>
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
              Kategorien
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

            <button
              className="w-full rounded-2xl py-3 text-[13px] font-bold"
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
    </>
  )
}
