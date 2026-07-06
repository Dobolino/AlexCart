import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'

interface SheetProps {
  onClose: () => void
  children: ReactNode
}

export function Sheet({ onClose, children }: SheetProps) {
  // Belt-and-suspenders: html/body are already permanently locked (see index.css),
  // but this guarantees any scroll position picked up while the sheet was open
  // (e.g. from its own internal scroll container) never leaks to the page below.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-30 flex items-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="relative max-h-[85vh] w-full overflow-y-auto px-4.5 pt-2.5"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          paddingBottom: 'calc(20px + var(--safe-bottom))',
          paddingLeft: 'calc(18px + var(--safe-left))',
          paddingRight: 'calc(18px + var(--safe-right))',
        }}
      >
        <div className="relative mb-3 flex h-9 items-center justify-center">
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
        {children}
      </div>
    </div>,
    document.body
  )
}
