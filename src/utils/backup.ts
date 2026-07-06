export const BACKUP_STORAGE_KEY = 'alexshop-store'

export function readBackupJSON(): string | null {
  return localStorage.getItem(BACKUP_STORAGE_KEY)
}

export interface RestoreResult {
  ok: boolean
  error?: string
}

/** Validiert eine Sicherungsdatei (muss die zustand-persist-Form {state, version} haben)
 *  und schreibt sie bei Erfolg direkt in den localStorage-Slot der App. */
export function restoreBackupJSON(json: string): RestoreResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'Ungültiges JSON.' }
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('state' in parsed) ||
    !('version' in parsed)
  ) {
    return { ok: false, error: 'Das sieht nicht nach einer AlexShop-Sicherung aus.' }
  }
  localStorage.setItem(BACKUP_STORAGE_KEY, json)
  return { ok: true }
}

export function backupFilename(): string {
  const date = new Date().toLocaleDateString('sv-SE')
  return `alexshop-sicherung-${date}.json`
}

/** Teilt die Sicherung als Datei (iOS-Freigabemenü), falls unterstützt,
 *  sonst Fallback auf klassischen Datei-Download. */
export async function shareOrDownloadBackup(json: string, filename: string): Promise<void> {
  const blob = new Blob([json], { type: 'application/json' })

  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
  if (nav.canShare && nav.share) {
    const file = new File([blob], filename, { type: 'application/json' })
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title: 'AlexShop Sicherung' })
        return
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return
        // Freigabe fehlgeschlagen -> auf Download zurückfallen
      }
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
