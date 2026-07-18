import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { useVisualViewportInset } from '@/hooks/useVisualViewportInset'

interface SheetProps {
  onClose: () => void
  children: ReactNode
  /** Volle Sheet-Höhe für dichte Inhalte, die intern scrollen (z. B. Preis-Sheet). */
  tall?: boolean
}

export function Sheet({ onClose, children, tall = false }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { bottom, height } = useVisualViewportInset()

  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  // Fokussiertes Feld im scrollbaren Bereich sichtbar halten (z. B. Preis-Sheet).
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return

    function onFocusIn(e: FocusEvent) {
      const target = e.target as HTMLElement
      if (!target.matches('input, textarea, select')) return
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      })
    }

    panel.addEventListener('focusin', onFocusIn)
    return () => panel.removeEventListener('focusin', onFocusIn)
  }, [])

  const maxPanelHeight = Math.min(height * (tall ? 0.96 : 0.92), height - 8)

  return createPortal(
    <div
      className="fixed inset-0 z-30 flex items-end"
      style={{ background: 'rgba(0,0,0,0.4)', touchAction: 'none' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className="sheet-panel relative flex w-full flex-col overflow-hidden px-4.5 pt-2.5"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom,
          maxHeight: maxPanelHeight,
          ...(tall ? { height: maxPanelHeight } : {}),
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          paddingBottom: 'calc(20px + var(--safe-bottom))',
          paddingLeft: 'calc(18px + var(--safe-left))',
          paddingRight: 'calc(18px + var(--safe-right))',
          touchAction: 'pan-y',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative mb-3 flex h-9 shrink-0 items-center justify-center">
          <div className="h-1.5 w-9 rounded-full" style={{ background: 'var(--border)' }} />
          <button
            className="tap-scale absolute right-0 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full"
            style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}
            onClick={onClose}
            aria-label="Schließen"
          >
            <Icon path={ICON_PATHS.close} size={16} />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>
    </div>,
    document.body
  )
}
