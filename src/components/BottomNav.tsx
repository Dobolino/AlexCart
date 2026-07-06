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
      className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t"
      style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--border)',
        paddingBottom: 'calc(6px + var(--safe-bottom))',
        paddingTop: '6px',
      }}
    >
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className="flex flex-col items-center gap-0.5 px-3 py-1 text-[11px] font-bold"
          style={({ isActive }) => ({ color: isActive ? 'var(--text)' : 'var(--text-muted)' })}
        >
          <Icon path={ICON_PATHS[tab.icon]} size={22} />
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
