import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { joinList } from '@/services/sync'

export function JoinPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <main className="scroll-behind-nav p-6">
      <h1 className="mb-4 text-2xl font-bold">Einladung zur Einkaufsliste</h1>
      <p className="mb-4">
        Du kannst die gemeinsame Liste bearbeiten. Deine übrigen Listen und Preise bleiben auf deinem Gerät.
      </p>
      <button
        disabled={busy}
        className="btn-primary min-h-12 px-5"
        onClick={async () => {
          setBusy(true)
          try {
            await joinList(location.href)
            navigate('/', { replace: true })
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Einladung konnte nicht geöffnet werden.')
          } finally {
            setBusy(false)
          }
        }}
      >
        Einladung annehmen
      </button>
      {error && (
        <p role="alert" className="mt-4">
          {error}
        </p>
      )}
    </main>
  )
}
