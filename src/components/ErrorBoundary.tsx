import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('AlexShop crashed:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="text-5xl">🛒</div>
          <h1 className="text-lg font-bold">Etwas ist schiefgelaufen</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Deine Daten bleiben gespeichert. Ein Neuladen hilft meistens.
          </p>
          <button
            className="btn-duo rounded-xl px-6 py-3 text-sm"
            onClick={() => window.location.reload()}
          >
            Neu laden
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
