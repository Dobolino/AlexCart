export const BACKUP_STORAGE_KEY = 'alexshop-store'
export const BACKUP_VERSION = 19

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
    !('version' in parsed) ||
    typeof parsed.version !== 'number' ||
    !Number.isInteger(parsed.version) ||
    parsed.version < 0 ||
    parsed.version > BACKUP_VERSION ||
    typeof parsed.state !== 'object' ||
    parsed.state === null ||
    !('lists' in parsed.state) ||
    !Array.isArray(parsed.state.lists) ||
    parsed.state.lists.length === 0 ||
    !parsed.state.lists.every((list: unknown) =>
      typeof list === 'object' && list !== null &&
      'id' in list && typeof list.id === 'string' &&
      'items' in list && Array.isArray(list.items)
    )
  ) {
    return { ok: false, error: 'Das sieht nicht nach einer AlexShop-Sicherung aus.' }
  }
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, json)
  } catch {
    return { ok: false, error: 'Sicherung konnte nicht gespeichert werden.' }
  }
  return { ok: true }
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
