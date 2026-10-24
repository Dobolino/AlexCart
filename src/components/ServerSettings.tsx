import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { apiBase, apiRequest } from '@/services/api'

export function ServerSettings() {
  const configured = useStore((s) => s.settings.apiUrl ?? '')
  const handedness = useStore((s) => s.settings.handedness ?? 'right')
  const [url, setUrl] = useState(configured)
  const [message, setMessage] = useState('')
  return (
    <section className="card-surface mb-4 p-4">
      <h2 className="mb-2 font-bold">Verbindung & Bedienung</h2>
      <p className="mb-3 text-sm">
        Ein eigener Server ermöglicht gemeinsame Listen und externe Produktdaten. Deine persönlichen Listen
        funktionieren auch ohne Verbindung.
      </p>
      <label className="block text-sm font-semibold">
        Serveradresse
        <input
          type="url"
          className="input my-2 w-full"
          placeholder="https://einkauf.example/api"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </label>
      <p className="mb-2 text-xs">Leer lassen, wenn App und Server unter derselben Adresse laufen.</p>
      <button
        className="btn-soft min-h-11 px-4"
        onClick={async () => {
          try {
            const base = apiBase(url)
            await apiRequest(base, '/health')
            useStore.getState().setApiUrl(url.trim())
            setMessage('Verbindung geprüft und gespeichert.')
          } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Server nicht erreichbar.')
          }
        }}
      >
        Verbindung prüfen & speichern
      </button>
      {message && (
        <p role="status" className="my-2 text-sm">
          {message}
        </p>
      )}
      <label className="mt-4 block text-sm font-semibold">
        Bevorzugte Hand
        <select
          className="input mt-2 w-full"
          value={handedness}
          onChange={(e) => useStore.getState().setHandedness(e.target.value as 'left' | 'right')}
        >
          <option value="right">Rechts</option>
          <option value="left">Links</option>
        </select>
      </label>
    </section>
  )
}
