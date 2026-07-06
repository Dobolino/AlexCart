import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'

interface SheetProps {
  onClose: () => void
  children: ReactNode
}

export function Sheet({ onClose, children }: SheetProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex items-end"
      style={{ background: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="relative w-full max-h-[85vh] overflow-y-auto rounded-t-[20px] px-4.5 pt-4.5"
        style={{ background: 'var(--surface)', paddingBottom: 'calc(20px + var(--safe-bottom))' }}
      >
        <button
          className="absolute right-3.5 top-3.5"
          style={{ color: 'var(--text-muted)' }}
          onClick={onClose}
          aria-label="Schließen"
        >
          <Icon path={ICON_PATHS.close} size={20} />
        </button>
        {children}
      </div>
    </div>
  )
}
