import { Sheet } from './Sheet'

interface ShoppingPausedOverlayProps {
  onResume: () => void
  onExit: () => void
}
export function ShoppingPausedOverlay({ onResume, onExit }: ShoppingPausedOverlayProps) {
  return (
    <Sheet onClose={onResume}>
      <h2 className="mb-4 text-xl font-bold">Einkauf pausiert</h2>
      <p className="mb-4 text-sm">
        Deine Artikel und dieser Einkauf bleiben erhalten. Der Timer läuft während der Pause nicht weiter.
      </p>
      <button className="btn-primary mb-3 min-h-12" onClick={onResume}>
        Fortsetzen
      </button>
      <button className="btn-soft min-h-12" onClick={onExit}>
        Zur Liste
      </button>
    </Sheet>
  )
}
