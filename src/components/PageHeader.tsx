interface PageHeaderProps {
  title: string
  subtitle?: string
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <header
      className="sticky top-0 z-20 px-4"
      style={{
        background: 'var(--header-bg)',
        color: 'var(--header-fg)',
        paddingTop: 'calc(14px + var(--safe-top))',
        paddingBottom: '14px',
      }}
    >
      <h1 className="text-[20px] font-extrabold leading-none">{title}</h1>
      {subtitle && <div className="mt-0.5 text-[12px] font-medium opacity-75">{subtitle}</div>}
    </header>
  )
}
