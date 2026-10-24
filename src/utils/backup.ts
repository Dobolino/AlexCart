import { parseBackup, STORAGE_VERSION } from './validation'
export const BACKUP_STORAGE_KEY = 'alexshop-store'
export const BACKUP_VERSION = STORAGE_VERSION

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
  try {
    const parsed = parseBackup(json)
    const previous = localStorage.getItem(BACKUP_STORAGE_KEY)
    if (previous) {
      let valid = false
      try {
        parseBackup(previous)
        valid = true
      } catch {
        /* damaged input is retained by the recovery path */
      }
      if (valid) localStorage.setItem(`${BACKUP_STORAGE_KEY}.previous`, previous)
    }
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(parsed))
    return { ok: true }
  } catch {
    return {
      ok: false,
      error: 'Sicherung ungültig, zu groß oder nicht speicherbar. Die bisherigen Daten bleiben erhalten.',
    }
  }
}

export function backupFilename(): string {
  const date = new Date().toLocaleDateString('sv-SE')
  return `alexshop-sicherung-${date}.json`
}

/** Teilt eine Datei (iOS-Freigabemenü), falls unterstützt,
 *  sonst Fallback auf klassischen Datei-Download. */
export async function shareOrDownloadFile(
  content: string,
  filename: string,
  mimeType = 'application/json',
  title = 'AlexShop'
): Promise<void> {
  const blob = new Blob([content], { type: mimeType })

  const nav = navigator as Navigator & { canShare?: (data: { files: File[] }) => boolean }
  if (nav.canShare && nav.share) {
    const file = new File([blob], filename, { type: mimeType })
    if (nav.canShare({ files: [file] })) {
      try {
        await nav.share({ files: [file], title })
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

/** Teilt die Sicherung als Datei (iOS-Freigabemenü), falls unterstützt,
 *  sonst Fallback auf klassischen Datei-Download. */
export async function shareOrDownloadBackup(json: string, filename: string): Promise<void> {
  await shareOrDownloadFile(json, filename, 'application/json', 'AlexShop Sicherung')
}
