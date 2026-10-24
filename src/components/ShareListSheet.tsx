import { useEffect, useState, useSyncExternalStore } from 'react'
import { buildShareText } from '@/utils/shareText'
import { Sheet } from './Sheet'
import { useStore } from '@/store/useStore'
import {
  disconnectList,
  invitation,
  joinList,
  revokeInvitations,
  shareList,
  syncInfo,
  syncStatus,
  flushList,
  startSync,
} from '@/services/sync'

export function ShareListSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    void startSync()
  }, [])
  const list = useStore((s) => s.activeList())!
  useSyncExternalStore(syncStatus.subscribe, syncStatus.getSnapshot)
  const info = syncInfo(list.id)
  const [link, setLink] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setMessage('')
    try {
      await action()
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Verbindung fehlgeschlagen.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Sheet onClose={onClose}>
      <h2 className="text-xl font-bold">Liste gemeinsam nutzen</h2>
      <p className="my-3 text-sm">
        Eingeladene Personen können diese Liste lesen und bearbeiten. Preise, Vorrat und andere Listen bleiben
        privat auf deinem Gerät.
      </p>
      <button
        className="btn-soft mb-3 min-h-11"
        onClick={() =>
          void run(async () => {
            const text = buildShareText(list)
            if (navigator.share) await navigator.share({ title: list.name, text })
            else {
              await navigator.clipboard.writeText(text)
              setMessage('Listentext kopiert.')
            }
          })
        }
      >
        Liste als Text teilen
      </button>
      {info ? (
        <>
          <p role="status" className="my-2 text-sm">
            {info.message} {info.count > 0 ? `· ${info.count} Änderungen ausstehend` : ''}
          </p>
          <button
            disabled={busy}
            className="btn-primary my-2 min-h-11 px-4"
            onClick={() =>
              void run(async () => {
                await navigator.clipboard.writeText(invitation(list.id))
                setMessage('Einladungslink kopiert. Vertraulich weitergeben.')
              })
            }
          >
            Einladungslink kopieren
          </button>
          <button
            disabled={busy}
            className="btn-soft my-1 min-h-11"
            onClick={() => void run(() => flushList(list.id))}
          >
            Jetzt abgleichen
          </button>
          <button
            disabled={busy}
            className="btn-soft my-1 min-h-11"
            onClick={() => {
              if (
                confirm(
                  'Alle bisherigen Einladungen widerrufen? Andere Geräte verlieren den Zugriff, bis du den neuen Link teilst.'
                )
              )
                void run(() => revokeInvitations(list.id))
            }}
          >
            Einladungen widerrufen
          </button>
          <button
            disabled={busy}
            className="btn-soft my-1 min-h-11"
            onClick={() =>
              void run(async () => {
                await disconnectList(list.id)
                setMessage('Verbindung getrennt. Deine lokale Liste bleibt erhalten.')
              })
            }
          >
            Als lokale Liste behalten
          </button>
        </>
      ) : (
        <>
          <button
            disabled={busy}
            className="btn-primary my-2 min-h-11 px-4"
            onClick={() =>
              void run(async () => {
                await shareList(list.id)
                setMessage('Liste verbunden. Du kannst jetzt den Einladungslink kopieren.')
              })
            }
          >
            Diese Liste freigeben
          </button>
          <label className="mt-4 text-sm font-bold" htmlFor="invite-link">
            Oder Einladungslink einfügen
          </label>
          <input
            id="invite-link"
            type="url"
            className="input my-2"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            autoComplete="off"
          />
          <button
            disabled={busy || !link}
            className="btn-soft min-h-11"
            onClick={() =>
              void run(async () => {
                await joinList(link)
                onClose()
              })
            }
          >
            Gemeinsame Liste öffnen
          </button>
        </>
      )}
      {message && (
        <p role="status" className="my-3 text-sm">
          {message}
        </p>
      )}
    </Sheet>
  )
}
