import { useSyncExternalStore, useState } from 'react'
import { storageStatus, retryStorage, recoverPreviousBackup } from '@/store/storage'
import { useStore } from '@/store/useStore'
import { BACKUP_VERSION, backupFilename, shareOrDownloadBackup } from '@/utils/backup'

export function currentBackupJSON(): string {
  const state = useStore.getState()
  return JSON.stringify({
    state: useStore.persist.getOptions().partialize?.(state) ?? state,
    version: BACKUP_VERSION,
  })
}

export function StorageNotice() {
  const status = useSyncExternalStore(storageStatus.subscribe, storageStatus.getSnapshot)
  const [message, setMessage] = useState('')
  if (!status.error) return null
  return (
    <aside role="alert" className="storage-notice">
      <p>{status.error}</p>
      <div className="flex flex-wrap gap-2">
        {!status.recovery && (
          <button className="btn-soft" onClick={retryStorage}>
            Erneut speichern
          </button>
        )}
        <button
          className="btn-soft"
          onClick={() =>
            void shareOrDownloadBackup(
              status.recovery ? (localStorage.getItem('alexshop-store') ?? '{}') : currentBackupJSON(),
              backupFilename()
            )
          }
        >
          Daten exportieren
        </button>
        {status.recovery && (
          <button
            className="btn-soft"
            onClick={() => {
              if (recoverPreviousBackup()) window.location.reload()
              else
                setMessage(
                  'Vorherige Sicherung konnte nicht geladen werden. Bitte Speicherplatz prüfen oder die Originaldaten exportieren und eine Sicherung in den Einstellungen einspielen.'
                )
            }}
          >
            Vorherige Sicherung laden
          </button>
        )}
      </div>
      {message && <p>{message}</p>}
    </aside>
  )
}
