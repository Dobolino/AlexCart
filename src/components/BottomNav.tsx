import { NavLink } from 'react-router-dom'
import { Icon } from './Icon'
import { ICON_PATHS } from '@/constants/icons'

const TABS = [
  { to: '/', label: 'Liste', icon: 'cart' },
  { to: '/pantry', label: 'Vorrat', icon: 'pantry' },
  { to: '/calculator', label: 'Rechner', icon: 'calculator' },
  { to: '/stats', label: 'Statistik', icon: 'chart' },
  { to: '/settings', label: 'Einstellungen', icon: 'settings' },
]

export function BottomNav() {
  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-20 flex justify-around border-t"
      style={{
        background: 'var(--nav-glass)',
        borderColor: 'var(--glass-border)',
        paddingBottom: 'calc(6px + var(--safe-bottom))',
        paddingTop: '8px',
        paddingLeft: 'var(--safe-left)',
        paddingRight: 'var(--safe-right)',
      }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className="tap-scale flex min-w-0 flex-1 flex-col items-center gap-0.5 px-1 py-1 text-[10.5px] font-bold"
          style={({ isActive }) => ({ color: isActive ? 'var(--accent)' : 'var(--text-muted)' })}
        >
          <Icon path={ICON_PATHS[tab.icon]} size={22} />
          <span className="truncate">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
