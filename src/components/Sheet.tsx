import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'
import { useVisualViewportInset } from '@/hooks/useVisualViewportInset'

interface SheetProps {
  onClose: () => void
  children: ReactNode
  tall?: boolean
}

/** Native modal dialogs provide focus trapping, Escape and nested-dialog isolation. */
export function Sheet({ onClose, children, tall = false }: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const { bottom, height } = useVisualViewportInset()
  useEffect(() => {
    const dialog = dialogRef.current!
    const previous = document.activeElement as HTMLElement | null
    const title = panelRef.current?.querySelector('h2')
    if (title) {
      title.id ||= titleId
      dialog.setAttribute('aria-labelledby', title.id)
    }
    dialog.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      if (previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [titleId])
  const maxPanelHeight = Math.min(height * (tall ? 0.96 : 0.92), height - 8)
  return createPortal(
    <dialog
      ref={dialogRef}
      className="sheet-dialog"
      aria-label="Einkauf bearbeiten"
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
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
        <div className="relative mb-3 flex h-11 shrink-0 items-center justify-center">
          <div className="h-1.5 w-9 rounded-full" style={{ background: 'var(--border)' }} />
          <button
            className="tap-scale absolute right-0 flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}
            onClick={onClose}
            aria-label="Schließen"
          >
            <Icon path={ICON_PATHS.close} size={18} />
          </button>
        </div>
        <div
          className={`sheet-content flex min-h-0 flex-1 flex-col ${tall ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain'}`}
          data-scrollable={!tall}
        >
          {children}
        </div>
      </div>
    </dialog>,
    document.body
  )
}
