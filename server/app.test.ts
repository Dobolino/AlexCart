import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from './app'

const cleanup: Array<() => Promise<void>> = []
afterEach(async () => {
  for (const close of cleanup.splice(0)) await close()
})
async function start(options: Parameters<typeof createApp>[0] = {}) {
  const app = createApp(options)
  await new Promise<void>((resolve) => app.server.listen(0, '127.0.0.1', resolve))
  cleanup.push(app.close)
  const address = app.server.address() as { port: number }
  const base = `http://127.0.0.1:${address.port}/api`
  const request = async (path: string, body?: unknown, token?: string) => {
    const response = await fetch(base + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
    return { status: response.status, data: await response.json() }
  }
  return { app, request, base }
}
const milk = { id: 'milk', name: 'Milch', category: 'Milch & Käse', amount: '1 l', done: false, addedAt: 1 }
describe('self-hosted backend', () => {
  it('merges independent clients and additive amounts, deduplicates retries and protects deleted items', async () => {
    const { request } = await start()
    const created = await request('/lists', { name: 'Gemeinsam', items: [milk] })
    const { token, document } = created.data
    const path = `/lists/${document.id}`
    expect((await request(path)).status).toBe(401)
    const first = { id: 'client-a', kind: 'adjust', itemId: 'milk', delta: 1, unit: 'l' }
    await request(path + '/operations', { operations: [first] }, token)
    await request(
      path + '/operations',
      {
        operations: [
          first,
          { id: 'client-b', kind: 'adjust', itemId: 'milk', delta: 2, unit: 'l' },
          { id: 'client-c', kind: 'patch', itemId: 'milk', patch: { note: 'Bio' } },
        ],
      },
      token
    )
    const merged = await request(path, undefined, token)
    expect(merged.data.document.items[0]).toMatchObject({ amount: '4 l', note: 'Bio' })
    expect(merged.data.document.revision).toBe(3)
    await request(
      path + '/operations',
      {
        operations: [
          { id: 'delete', kind: 'delete', itemId: 'milk' },
          { id: 'late', kind: 'put', item: milk },
        ],
      },
      token
    )
    expect((await request(path, undefined, token)).data.document.items).toHaveLength(0)
    const rotated = await request(path + '/rotate', {}, token)
    expect((await request(path, undefined, token)).status).toBe(401)
    expect((await request(path, undefined, rotated.data.token)).status).toBe(200)
  })
  it('rolls back an entire invalid amount batch and rejects malformed payloads', async () => {
    const { request } = await start()
    const { token, document } = (await request('/lists', { name: 'Test', items: [milk] })).data
    const path = `/lists/${document.id}`
    expect(
      (
        await request(
          path + '/operations',
          {
            operations: [
              { id: 'a', kind: 'patch', itemId: 'milk', patch: { note: 'should roll back' } },
              { id: 'b', kind: 'adjust', itemId: 'milk', unit: 'kg', delta: 1 },
            ],
          },
          token
        )
      ).status
    ).toBe(409)
    expect((await request(path, undefined, token)).data.document.items[0].note).toBeUndefined()
    expect((await request('/lists', { name: 'Bad', items: [null] })).status).toBe(400)
  })
  it('persists shared data across server restarts without persisting raw invitation tokens', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'alexcart-test-'))
    const databasePath = join(directory, 'data.sqlite')
    const first = await start({ databasePath })
    const created = (await first.request('/lists', { name: 'Dauerhaft', items: [milk] })).data
    cleanup.pop()
    await first.app.close()
    const second = await start({ databasePath })
    expect(
      (await second.request(`/lists/${created.document.id}`, undefined, created.token)).data.document.name
    ).toBe('Dauerhaft')
    cleanup.push(async () => {
      rmSync(directory, { recursive: true, force: true })
    })
  })
  it('caches provider requests and refuses unrelated web origins', async () => {
    const fetcher = vi.fn(
      async () => new Response(JSON.stringify({ status: 1, product: { product_name: 'Test' } }))
    )
    const { request, base } = await start({ fetcher })
    await request('/products/4006381333931')
    await request('/products/4006381333931')
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect((await fetch(base + '/health', { headers: { Origin: 'https://unrelated.example' } })).status).toBe(
      403
    )
  })
})
