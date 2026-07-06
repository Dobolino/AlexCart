import type { ReactNode } from 'react'
import { Icon } from './Icon'

interface EmptyStateProps {
  icon: string
  title: string
  hint?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, hint, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full"
        style={{ background: 'var(--chip-bg)', color: 'var(--text-muted)' }}
      >
        <Icon path={icon} size={30} />
      </div>
      <div className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>
        {title}
      </div>
      {hint && (
        <p className="max-w-[260px] text-[14px] leading-snug" style={{ color: 'var(--text-muted)' }}>
          {hint}
        </p>
      )}
      {action}
    </div>
  )
}
