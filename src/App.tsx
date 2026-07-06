import { HashRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { BottomNav } from './components/BottomNav'
import { useTheme } from './hooks/useTheme'
import { useStoreHydration } from './hooks/useStoreHydration'
import { ListPage } from './pages/ListPage'
import { PantryPage } from './pages/PantryPage'
import { CalculatorPage } from './pages/CalculatorPage'
import { StatsPage } from './pages/StatsPage'
import { SettingsPage } from './pages/SettingsPage'

function AppShell() {
  useTheme()
  const hydrated = useStoreHydration()

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm" style={{ color: 'var(--text-muted)' }}>
        Lädt…
      </div>
    )
  }

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<ListPage />} />
        <Route path="/pantry" element={<PantryPage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
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
