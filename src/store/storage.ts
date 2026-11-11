import { parseBackup } from '@/utils/validation'

type StorageState = { error: string | null; recovery: boolean }
let snapshot: StorageState = { error: null, recovery: false }
const listeners = new Set<() => void>()
const pending = new Map<string, string>()
export const storageStatus = {
  subscribe: (fn: () => void) => {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
  getSnapshot: () => snapshot,
}
function status(error: string | null, recovery = false) {
  if (snapshot.error === error && snapshot.recovery === recovery) return
  snapshot = { error, recovery }
  listeners.forEach((fn) => fn())
}
export const safeStorage = {
  getItem(name: string): string | null {
    try {
      const value = localStorage.getItem(name)
      if (!value) return null
      const parsed = parseBackup(value)
      return JSON.stringify(parsed)
    } catch {
      status('Gespeicherte Daten konnten nicht geladen werden. Die Originaldaten bleiben erhalten.', true)
      return null
    }
  },
  setItem(name: string, value: string): void {
    pending.set(name, value)
    if (snapshot.recovery) return
    try {
      localStorage.setItem(name, value)
      pending.delete(name)
      status(null)
    } catch {
      status(
        'Änderungen sind noch nicht gespeichert. Bitte Speicher freigeben oder eine Sicherung exportieren.'
      )
    }
  },
  removeItem(name: string): void {
    try {
      localStorage.removeItem(name)
    } catch {
      status('Daten konnten nicht entfernt werden.')
    }
  },
}
export function retryStorage() {
  for (const [name, value] of pending) safeStorage.setItem(name, value)
}
export function recoverPreviousBackup(): boolean {
  try {
    const previous = localStorage.getItem('alexshop-store.previous')
    if (!previous) return false
    parseBackup(previous)
    const damaged = localStorage.getItem('alexshop-store')
    if (damaged) localStorage.setItem('alexshop-store.recovery', damaged)
    localStorage.setItem('alexshop-store', previous)
    status(null)
    return true
  } catch {
    return false
  }
}
