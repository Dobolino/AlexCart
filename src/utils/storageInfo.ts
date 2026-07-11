import { BACKUP_STORAGE_KEY } from '@/utils/backup'

const LEGACY_KEYS = ['alexshop_week', 'alexshop_pantry', 'alexshop-install-dismissed'] as const

export interface StorageInfo {
  origin: string
  storageType: 'localStorage'
  primaryKey: string
  /** Lesbarer Pfad zur Speicherung im Browser. */
  storagePath: string
  sizeBytes: number
  sizeLabel: string
  exportFilenamePattern: string
  legacyKeysPresent: string[]
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Schätzt localStorage-Belegung (UTF-16 ≈ 2 Bytes pro Zeichen). */
export function estimateLocalStorageBytes(keys: string[]): number {
  let total = 0
  for (const key of keys) {
    try {
      const value = localStorage.getItem(key)
      if (value !== null) total += (key.length + value.length) * 2
    } catch {
      /* ignore */
    }
  }
  return total
}

export function getStorageInfo(): StorageInfo {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const primaryKey = BACKUP_STORAGE_KEY
  const legacyKeysPresent = LEGACY_KEYS.filter((key) => {
    try {
      return localStorage.getItem(key) !== null
    } catch {
      return false
    }
  })

  const sizeBytes = estimateLocalStorageBytes([primaryKey, ...legacyKeysPresent])

  return {
    origin,
    storageType: 'localStorage',
    primaryKey,
    storagePath: `${origin}/ → Web Storage → localStorage["${primaryKey}"]`,
    sizeBytes,
    sizeLabel: formatBytes(sizeBytes),
    exportFilenamePattern: 'alexshop-sicherung-YYYY-MM-DD.json',
    legacyKeysPresent,
  }
}
