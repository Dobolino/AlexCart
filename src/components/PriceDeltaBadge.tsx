import type { PriceDeltaDirection } from '@/utils/priceDelta'

interface PriceDeltaBadgeProps {
  label: string
  direction: PriceDeltaDirection
}

export function PriceDeltaBadge({ label, direction }: PriceDeltaBadgeProps) {
  if (direction === 'same') return null

  const isUp = direction === 'up'

  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[12px] font-extrabold tabular-nums"
      style={{
        background: isUp ? 'var(--danger-soft)' : 'var(--accent-soft)',
        color: isUp ? 'var(--danger)' : 'var(--accent)',
      }}
      aria-live="polite"
    >
      {label}
    </span>
  )
}
