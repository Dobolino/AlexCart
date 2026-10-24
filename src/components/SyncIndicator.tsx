import { useSyncExternalStore } from 'react'
import { syncInfo, syncStatus } from '@/services/sync'

export function SyncIndicator({ listId, onOpen }: { listId: string; onOpen: () => void }) {
  useSyncExternalStore(syncStatus.subscribe, syncStatus.getSnapshot)
  const info = syncInfo(listId)
  if (!info) return null
  return (
    <button
      className="mx-3 mt-2 min-h-11 rounded-xl px-3 text-left text-xs"
      style={{ background: 'var(--surface)', color: info.error ? 'var(--danger)' : 'var(--text-muted)' }}
      onClick={onOpen}
    >
      Gemeinsam · {info.count ? `${info.count} Änderungen ausstehend` : info.message}
    </button>
  )
}
