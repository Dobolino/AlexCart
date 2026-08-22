import type { ReactNode } from 'react'

interface OptionCardProps {
  selected: boolean
  onClick: () => void
  title: string
  hint?: string
  /** Rechts neben dem Titel (z. B. Badge). */
  trailing?: ReactNode
}

/** Auswahl-Karte mit gut lesbarem Kontrast – für Listen, Filialen, Import-Modi. */
export function OptionCard({ selected, onClick, title, hint, trailing }: OptionCardProps) {
  return (
    <button
      type="button"
      className="tap-scale w-full rounded-xl px-3.5 py-3 text-left"
      style={{
        background: selected ? 'var(--accent-soft)' : 'var(--surface)',
        color: 'var(--text)',
        outline: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        boxShadow: selected ? 'none' : 'var(--shadow-card)',
      }}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[14px] font-bold leading-snug">{title}</span>
        {trailing}
        {selected && !trailing ? (
          <span className="shrink-0 text-[12px] font-extrabold" style={{ color: 'var(--accent)' }}>
            ✓
          </span>
        ) : null}
      </div>
      {hint ? (
        <div className="mt-0.5 text-[12px] leading-snug" style={{ color: selected ? 'var(--text)' : 'var(--text-muted)' }}>
          {hint}
        </div>
      ) : null}
    </button>
  )
}
