import { z } from 'zod'
import { localDatabase } from './localDatabase'
import { apiBase, apiRequest } from './api'
import { useStore } from '@/store/useStore'
import {
  applySyncOperation,
  diffSharedList,
  sharedItemSchema,
  syncOperationSchema,
  type SyncDocument,
  type SyncOperation,
} from '@/utils/syncProtocol'

const documentSchema = z.object({
  id: z.string(),
  name: z.string().max(200),
  items: z.array(sharedItemSchema).max(2000),
  deletedIds: z.array(z.string()).max(50000),
  revision: z.number().int().nonnegative(),
})
const connectionSchema = z.object({
  listId: z.string(),
  remoteId: z.string(),
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  base: z.string().url(),
  document: documentSchema,
  pending: z.array(syncOperationSchema),
})
type Connection = z.infer<typeof connectionSchema>
type Info = { count: number; message: string; error: boolean }
const connections = new Map<string, Connection>()
const infos = new Map<string, Info>()
const listeners = new Set<() => void>()
const running = new Set<string>()
let version = 0
let applying = false
let started = false
const emit = () => {
  version++
  listeners.forEach((fn) => fn())
}
export const syncStatus = {
  subscribe: (fn: () => void) => {
    listeners.add(fn)
    return () => {
      listeners.delete(fn)
    }
  },
  getSnapshot: () => version,
}
export const syncInfo = (listId: string) =>
  connections.has(listId) ? (infos.get(listId) ?? { count: 0, message: 'Verbunden', error: false }) : null

async function persist(connection: Connection) {
  await localDatabase.connections.put({ listId: connection.listId, value: connection })
  connections.set(connection.listId, connection)
  try {
    localStorage.setItem('alexcart-shared-enabled', '1')
  } catch {
    /* the durable connection remains in IndexedDB */
  }
}
function show(connection: Connection, message: string, error = false) {
  infos.set(connection.listId, { count: connection.pending.length, message, error })
  emit()
}
async function enqueue(listId: string, operations: SyncOperation[]) {
  try {
    await localDatabase.transaction('rw', localDatabase.connections, async () => {
      const record = await localDatabase.connections.get(listId)
      if (!record) return
      const connection = connectionSchema.parse(record.value)
      connection.pending.push(...operations)
      await persist(connection)
      show(
        connection,
        navigator.onLine ? 'Änderungen warten auf Bestätigung' : 'Offline · Änderungen warten auf Verbindung'
      )
    })
    void flushList(listId)
  } catch {
    const connection = connections.get(listId)
    if (connection)
      show(
        connection,
        'Änderungen sind lokal in deiner Liste gespeichert, die Übertragung konnte nicht vorgemerkt werden. Bitte Speicher prüfen.',
        true
      )
  }
}
function adopt(connection: Connection) {
  const document = connection.pending.reduce(applySyncOperation, connection.document as SyncDocument)
  const existing = useStore.getState().lists.find((l) => l.id === connection.listId)
  if (
    existing &&
    existing.name === document.name &&
    JSON.stringify(existing.items.map((i) => sharedItemSchema.parse(i))) === JSON.stringify(document.items)
  )
    return
  applying = true
  try {
    useStore.setState((state) => ({
      lists: state.lists.map((list) =>
        list.id !== connection.listId
          ? list
          : {
              ...list,
              name: document.name,
              items: document.items.map((item) => ({ ...list.items.find((i) => i.id === item.id), ...item })),
            }
      ),
    }))
  } finally {
    applying = false
  }
}
export async function flushList(listId: string) {
  if (running.has(listId) || !navigator.onLine || !connections.has(listId)) return
  running.add(listId)
  try {
    const record = await localDatabase.connections.get(listId)
    if (!record) return
    const sent = connectionSchema.parse(record.value)
    const result = await apiRequest<{ document: unknown; acknowledged?: string[] }>(
      sent.base,
      `/lists/${sent.remoteId}${sent.pending.length ? '/operations' : ''}`,
      {
        method: sent.pending.length ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${sent.token}` },
        ...(sent.pending.length ? { body: JSON.stringify({ operations: sent.pending.slice(0, 500) }) } : {}),
      }
    )
    const document = documentSchema.parse(result.document)
    await localDatabase.transaction('rw', localDatabase.connections, async () => {
      const current = await localDatabase.connections.get(listId)
      if (!current) return
      const connection = connectionSchema.parse(current.value)
      const acknowledged = new Set(result.acknowledged ?? [])
      connection.pending = connection.pending.filter((op) => !acknowledged.has(op.id))
      if (document.revision >= connection.document.revision) connection.document = document
      await persist(connection)
      adopt(connection)
      show(connection, connection.pending.length ? 'Weitere Änderungen warten' : 'Alle Änderungen bestätigt')
    })
  } catch (error) {
    const connection = connections.get(listId)
    if (connection)
      show(
        connection,
        error instanceof Error
          ? error.message
          : 'Synchronisation unterbrochen. Lokale Änderungen bleiben erhalten.',
        true
      )
  } finally {
    running.delete(listId)
  }
}
export async function shareList(listId: string) {
  if (!started) await startSync()
  const list = useStore.getState().lists.find((l) => l.id === listId)
  if (!list) throw new Error('Liste nicht gefunden.')
  const base = apiBase(useStore.getState().settings.apiUrl)
  const result = await apiRequest<{ document: unknown; token: string }>(base, '/lists', {
    method: 'POST',
    body: JSON.stringify({ name: list.name, items: list.items }),
  })
  const document = documentSchema.parse(result.document)
  const connection = connectionSchema.parse({
    listId,
    remoteId: document.id,
    document,
    token: result.token,
    base,
    pending: [],
  })
  await persist(connection)
  show(connection, 'Liste bereit zum Teilen')
  return invitation(listId)
}
export function invitation(listId: string) {
  const connection = connections.get(listId)
  if (!connection) return ''
  const params = new URLSearchParams({
    server: connection.base,
    list: connection.remoteId,
    key: connection.token,
  })
  return `${location.origin}${import.meta.env.BASE_URL}dev.html#/join?${params}`
}
export async function joinList(link: string) {
  if (!started) await startSync()
  const url = new URL(link)
  const params = new URLSearchParams(url.hash.split('?')[1] ?? '')
  const base = apiBase(params.get('server') ?? '')
  const remoteId = params.get('list')
  const token = params.get('key')
  if (!remoteId || !/^[a-f0-9-]{36}$/.test(remoteId) || !token || !/^[A-Za-z0-9_-]{43}$/.test(token))
    throw new Error('Einladungslink ungültig.')
  const result = await apiRequest<{ document: unknown }>(base, `/lists/${remoteId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const document = documentSchema.parse(result.document)
  const listId = `shared:${remoteId}`
  if (connections.has(listId)) {
    await flushList(listId)
    useStore.getState().switchList(listId)
    return
  }
  // Joining must never overwrite an existing local list or pending edits.
  const existing = [...connections.values()].find((c) => c.base === base && c.remoteId === remoteId)
  if (existing) {
    useStore.getState().switchList(existing.listId)
    return
  }
  const connection = connectionSchema.parse({ listId, remoteId, token, document, pending: [], base })
  await persist(connection)
  applying = true
  try {
    useStore.setState((state) => ({
      lists: [
        ...state.lists.filter((l) => l.id !== listId),
        { id: listId, name: document.name, items: document.items, weekLabel: '', createdAt: Date.now() },
      ],
      activeListId: listId,
    }))
  } finally {
    applying = false
  }
  show(connection, 'Gemeinsame Liste verbunden')
}
export async function disconnectList(listId: string) {
  await localDatabase.connections.delete(listId)
  connections.delete(listId)
  infos.delete(listId)
  if (!connections.size) {
    try {
      localStorage.removeItem('alexcart-shared-enabled')
    } catch {
      /* optional startup hint */
    }
  }
  emit()
}
export async function revokeInvitations(listId: string) {
  const connection = connections.get(listId)
  if (!connection) return
  const { token } = await apiRequest<{ token: string }>(
    connection.base,
    `/lists/${connection.remoteId}/rotate`,
    { method: 'POST', headers: { Authorization: `Bearer ${connection.token}` }, body: '{}' }
  )
  await persist({ ...connection, token })
  show(connection, 'Bisherige Einladungen widerrufen. Neuen Link teilen, um erneut Zugriff zu gewähren.')
}
export async function startSync() {
  if (started) return () => {}
  started = true
  try {
    const records = await localDatabase.connections.toArray()
    for (const record of records) {
      const parsed = connectionSchema.safeParse(record.value)
      if (!parsed.success) continue
      const connection = parsed.data
      const local = useStore.getState().lists.find((l) => l.id === connection.listId)
      if (!local) continue
      connections.set(connection.listId, connection)
      try {
        const restored = connection.pending.reduce(applySyncOperation, connection.document as SyncDocument)
        connection.pending.push(...diffSharedList(restored, local, () => crypto.randomUUID()))
        await persist(connection)
      } catch (error) {
        show(connection, error instanceof Error ? error.message : 'Lokale Änderungen bitte vor dem Abgleich prüfen.', true)
      }
    }
  } catch {
    /* Local shopping remains available if IndexedDB is unavailable. */
  }
  let previous = useStore.getState().lists
  const unsubscribe = useStore.subscribe((state) => {
    const before = previous
    previous = state.lists
    if (applying || before === state.lists) return
    for (const [listId] of connections) {
      const old = before.find((l) => l.id === listId),
        current = state.lists.find((l) => l.id === listId)
      if (!current) {
        void disconnectList(listId)
        continue
      }
      if (old === current || !old) continue
      const operations = diffSharedList(old, current, () => crypto.randomUUID())
      if (operations.length) void enqueue(listId, operations)
    }
  })
  const flush = () => {
    for (const [listId] of connections) void flushList(listId)
  }
  const timer = window.setInterval(flush, 10000)
  window.addEventListener('online', flush)
  flush()
  emit()
  return () => {
    clearInterval(timer)
    window.removeEventListener('online', flush)
    unsubscribe()
    started = false
  }
}
