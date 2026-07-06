import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onTitleClick?: () => void
  right?: ReactNode
}

export function PageHeader({ title, subtitle, onTitleClick, right }: PageHeaderProps) {
  const Title = onTitleClick ? 'button' : 'div'
  return (
    <header
      className="glass sticky top-0 z-20 flex items-center justify-between border-b px-4"
      style={{
        paddingTop: 'calc(12px + var(--safe-top))',
        paddingBottom: '12px',
        paddingLeft: 'calc(16px + var(--safe-left))',
        paddingRight: 'calc(16px + var(--safe-right))',
      }}
    >
      <Title className="tap-scale text-left" onClick={onTitleClick}>
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight" style={{ color: 'var(--text)' }}>
          {title}
        </h1>
        {subtitle && (
          <div className="mt-0.5 text-[13px] font-medium" style={{ color: 'var(--text-muted)' }}>
            {subtitle}
          </div>
        )}
      </Title>
      {right}
    </header>
  )
}
