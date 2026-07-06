import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BottomNav } from './components/BottomNav'
import { Icon } from './components/Icon'
import { ICON_PATHS } from './constants/icons'
import { useTheme } from './hooks/useTheme'
import { useStoreHydration } from './hooks/useStoreHydration'
import { ListPage } from './pages/ListPage'
import { PantryPage } from './pages/PantryPage'
import { CalculatorPage } from './pages/CalculatorPage'
import { StatsPage } from './pages/StatsPage'
import { SettingsPage } from './pages/SettingsPage'

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
        className="relative flex min-h-0 flex-1 flex-col"
      >
        <Routes location={location}>
          <Route path="/" element={<ListPage />} />
          <Route path="/pantry" element={<PantryPage />} />
          <Route path="/calculator" element={<CalculatorPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

function AppShell() {
  useTheme()
  const hydrated = useStoreHydration()

  if (!hydrated) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center" style={{ color: 'var(--text-muted)' }}>
        <motion.div animate={{ opacity: [0.35, 1, 0.35], scale: [0.96, 1, 0.96] }} transition={{ duration: 1.1, repeat: Infinity }}>
          <Icon path={ICON_PATHS.cart} size={48} />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <AnimatedRoutes />
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <AppShell />
      </HashRouter>
    </ErrorBoundary>
  )
}
