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
    <nav className="nav-liquid" aria-label="Hauptnavigation">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className="nav-liquid-tab tap-scale"
        >
          {({ isActive }) => (
            <>
              <span className={`nav-liquid-icon ${isActive ? 'nav-liquid-icon-active' : ''}`}>
                <Icon path={ICON_PATHS[tab.icon]} size={22} />
              </span>
              <span className={`nav-liquid-label ${isActive ? 'nav-liquid-label-active' : ''}`}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
