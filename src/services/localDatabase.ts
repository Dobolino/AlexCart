import Dexie, { type Table } from 'dexie'

class LocalDatabase extends Dexie {
  cache!: Table<{ key: string; expiresAt: number; value: unknown }, string>
  connections!: Table<{ listId: string; value: unknown }, string>
  constructor() {
    super('alexcart-services')
    this.version(1).stores({ cache: 'key, expiresAt', connections: 'listId' })
  }
}
export const localDatabase = new LocalDatabase()

export async function cachedValue<T>(key: string): Promise<T | null> {
  try {
    const record = await localDatabase.cache.get(key)
    return record && record.expiresAt > Date.now() ? (record.value as T) : null
  } catch {
    return null
  }
}
export async function cacheValue(key: string, value: unknown, ttl = 7 * 86400000) {
  try {
    await localDatabase.cache.put({ key, value, expiresAt: Date.now() + ttl })
  } catch {
    /* cache is optional; user-owned data uses the main store */
  }
}
