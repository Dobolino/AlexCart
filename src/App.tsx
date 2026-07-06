import { HashRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BottomNav } from './components/BottomNav'
import { useTheme } from './hooks/useTheme'
import { useEnsureStoreHydration } from './hooks/useStoreHydration'
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
  useEnsureStoreHydration()

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
