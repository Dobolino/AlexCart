interface ShoppingPausedOverlayProps {
  onResume: () => void
}

export function ShoppingPausedOverlay({ onResume }: ShoppingPausedOverlayProps) {
  return (
    <div
      className="absolute inset-0 z-30 flex flex-col items-center justify-center px-6"
      style={{ background: 'rgba(0, 0, 0, 0.42)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Einkauf pausiert"
    >
      <p className="mb-5 text-center text-[18px] font-bold text-white">Einkauf pausiert</p>
      <button
        type="button"
        className="tap-scale flex min-h-[52px] min-w-[11rem] items-center justify-center gap-2 rounded-full px-8 py-3.5 text-[16px] font-extrabold shadow-lg"
        style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}
        onClick={onResume}
      >
        <span aria-hidden>▶️</span>
        Fortsetzen
      </button>
    </div>
  )
}
