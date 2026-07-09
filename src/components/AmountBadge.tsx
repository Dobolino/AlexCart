interface AmountBadgeProps {
  amount: string
  /** Einkaufsmodus: größer und auffälliger */
  prominent?: boolean
}

export function AmountBadge({ amount, prominent = false }: AmountBadgeProps) {
  return (
    <span
      className={
        prominent
          ? 'mt-1.5 inline-flex max-w-full items-center rounded-xl px-2.5 py-1 text-[15px] font-extrabold leading-tight tabular-nums'
          : 'inline-flex max-w-full items-center rounded-lg px-2 py-0.5 text-[13px] font-bold leading-tight tabular-nums'
      }
      style={{
        background: 'var(--accent-soft)',
        color: 'var(--accent)',
        border: prominent ? '1.5px solid color-mix(in srgb, var(--accent) 28%, transparent)' : undefined,
      }}
    >
      {amount}
    </span>
  )
}
