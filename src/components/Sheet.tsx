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
        className="relative max-h-[85vh] w-full overflow-y-auto px-4.5 pt-3"
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          paddingBottom: 'calc(20px + var(--safe-bottom))',
          paddingLeft: 'calc(18px + var(--safe-left))',
          paddingRight: 'calc(18px + var(--safe-right))',
        }}
      >
        <div className="mx-auto mb-3 h-1.5 w-9 rounded-full" style={{ background: 'var(--border)' }} />
        <button
          className="tap-scale absolute right-4.5 top-4"
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
