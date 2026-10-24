import http from 'node:http'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { z } from 'zod'
import {
  applySyncOperation,
  sharedItemSchema,
  syncOperationSchema,
  type SyncDocument,
} from '../src/utils/syncProtocol.ts'

type Options = {
  databasePath?: string
  origins?: string[]
  staticRoot?: string
  fetcher?: typeof fetch
  contact?: string
}
const hash = (token: string) => createHash('sha256').update(token).digest('hex')
const createSchema = z.object({
  name: z.string().min(1).max(200),
  items: z.array(sharedItemSchema).max(2000),
})
const batchSchema = z.object({ operations: z.array(syncOperationSchema).max(500) })

export function createApp(options: Options = {}) {
  const db = new DatabaseSync(options.databasePath ?? ':memory:')
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS lists(id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, state TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS operations(list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE, id TEXT NOT NULL, PRIMARY KEY(list_id,id));
    CREATE TABLE IF NOT EXISTS cache(key TEXT PRIMARY KEY, expires INTEGER NOT NULL, value TEXT NOT NULL);`)
  const requests = new Map<string, { count: number; reset: number }>()
  const upstreamCounts = new Map<string, { count: number; reset: number }>()
  const fetcher = options.fetcher ?? fetch
  const allowedOrigins = options.origins ?? ['http://127.0.0.1:5173', 'http://localhost:5173']
  async function upstream(key: string, url: string, ttl: number) {
    const cached = db.prepare('SELECT value,expires FROM cache WHERE key=?').get(key) as
      { value: string; expires: number } | undefined
    if (cached && cached.expires > Date.now()) return JSON.parse(cached.value)
    const host = new URL(url).host
    const limit = upstreamCounts.get(host)
    const window = limit && limit.reset > Date.now() ? limit : { count: 0, reset: Date.now() + 60000 }
    if (++window.count > (host === 'world.openfoodfacts.org' ? 15 : 30))
      throw new Error('Anfragelimit erreicht. Bitte kurz warten; gespeicherte Daten bleiben nutzbar.')
    upstreamCounts.set(host, window)
    const response = await fetcher(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': `AlexCart/2.0 (${options.contact ?? 'https://github.com/Dobolino/AlexCart'})`,
      },
    })
    if (!response.ok) throw new Error(`Datenquelle vorübergehend nicht verfügbar (${response.status}).`)
    const text = await response.text()
    if (text.length > 2_000_000) throw new Error('Antwort der Datenquelle ist zu groß.')
    const value = JSON.parse(text)
    db.prepare('INSERT OR REPLACE INTO cache VALUES (?,?,?)').run(key, Date.now() + ttl, text)
    return value
  }
  const server = http.createServer(async (req, res) => {
    const json = (status: number, value: unknown) => {
      res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      res.end(JSON.stringify(value))
    }
    try {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const origin = req.headers.origin
      if (origin) {
        const ownOrigin = `http://${req.headers.host}`
        if (!allowedOrigins.includes(origin) && origin !== ownOrigin)
          return json(403, { error: 'Diese Webadresse darf nicht auf den Server zugreifen.' })
        res.setHeader('Access-Control-Allow-Origin', origin)
        res.setHeader('Vary', 'Origin')
      }
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        })
        return res.end()
      }
      const ip = req.socket.remoteAddress ?? 'unknown'
      const previous = requests.get(ip)
      const rate =
        previous && previous.reset > Date.now() ? previous : { count: 0, reset: Date.now() + 60000 }
      requests.set(ip, rate)
      if (requests.size > 10000)
        for (const [key, value] of requests) if (value.reset < Date.now()) requests.delete(key)
      if (++rate.count > 300) return json(429, { error: 'Zu viele Anfragen. Bitte eine Minute warten.' })
      let body: unknown
      if (req.method === 'POST') {
        let text = ''
        for await (const chunk of req) {
          text += chunk
          if (Buffer.byteLength(text) > 1_000_000) return json(413, { error: 'Anfrage zu groß.' })
        }
        body = JSON.parse(text || '{}')
      }
      if (req.method === 'GET' && url.pathname === '/api/health') return json(200, { ok: true })
      if (req.method === 'POST' && url.pathname === '/api/lists') {
        const input = createSchema.parse(body)
        if (new Set(input.items.map((i) => i.id)).size !== input.items.length)
          return json(400, { error: 'Artikel-IDs müssen eindeutig sein.' })
        const id = randomUUID(),
          token = randomBytes(32).toString('base64url')
        const document: SyncDocument = {
          id,
          name: input.name,
          items: input.items,
          deletedIds: [],
          revision: 0,
        }
        db.prepare('INSERT INTO lists VALUES (?,?,?)').run(id, hash(token), JSON.stringify(document))
        return json(201, { document, token })
      }
      const match = url.pathname.match(/^\/api\/lists\/([a-f0-9-]{36})(?:\/(operations|rotate))?$/)
      if (match) {
        const row = db.prepare('SELECT token_hash,state FROM lists WHERE id=?').get(match[1]!) as
          { token_hash: string; state: string } | undefined
        const bearer = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1]
        if (!row || !bearer || hash(bearer) !== row.token_hash)
          return json(401, { error: 'Einladung ungültig oder Zugriff widerrufen.' })
        let document = JSON.parse(row.state) as SyncDocument
        if (req.method === 'GET' && !match[2]) return json(200, { document })
        if (req.method === 'POST' && match[2] === 'rotate') {
          const token = randomBytes(32).toString('base64url')
          db.prepare('UPDATE lists SET token_hash=? WHERE id=?').run(hash(token), match[1]!)
          return json(200, { token })
        }
        if (req.method === 'POST' && match[2] === 'operations') {
          const { operations } = batchSchema.parse(body)
          db.exec('BEGIN IMMEDIATE')
          try {
            for (const op of operations) {
              if (db.prepare('SELECT 1 FROM operations WHERE list_id=? AND id=?').get(match[1]!, op.id))
                continue
              document = applySyncOperation(document, op)
              document.revision++
              db.prepare('INSERT INTO operations VALUES (?,?)').run(match[1]!, op.id)
            }
            db.prepare('UPDATE lists SET state=? WHERE id=?').run(JSON.stringify(document), match[1]!)
            db.exec('COMMIT')
          } catch (error) {
            db.exec('ROLLBACK')
            throw error
          }
          return json(200, { document, acknowledged: operations.map((op) => op.id) })
        }
      }
      if (req.method === 'GET' && /^\/api\/products\/\d{8,14}$/.test(url.pathname)) {
        const code = url.pathname.split('/').pop()!
        const product = await upstream(
          `off:${code}`,
          `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=code,product_name,product_name_de,brands,quantity,product_quantity,product_quantity_unit,categories_tags`,
          7 * 86400000
        )
        return json(200, product)
      }
      if (req.method === 'GET' && url.pathname === '/api/rates') {
        return json(
          200,
          await upstream(
            'fx:EUR:CHF',
            'https://api.frankfurter.dev/v1/latest?base=EUR&symbols=CHF',
            6 * 3600000
          )
        )
      }
      if (req.method === 'GET' && /^\/api\/prices\/\d{8,14}$/.test(url.pathname)) {
        const code = url.pathname.split('/').pop()!
        return json(
          200,
          await upstream(
            `prices:${code}`,
            `https://prices.openfoodfacts.org/api/v1/prices?product_code=${code}&size=20&order_by=-date`,
            6 * 3600000
          )
        )
      }
      if (req.method === 'GET' && options.staticRoot && !url.pathname.startsWith('/api/')) {
        const relative = decodeURIComponent(url.pathname).replace(/^\/AlexCart\/?/, '') || 'dev.html'
        const file = resolve(options.staticRoot, relative)
        if (!file.startsWith(resolve(options.staticRoot) + sep))
          return json(403, { error: 'Ungültiger Dateipfad.' })
        try {
          const data = await readFile(file)
          const mime: Record<string, string> = {
            '.html': 'text/html',
            '.js': 'text/javascript',
            '.mjs': 'text/javascript',
            '.css': 'text/css',
            '.png': 'image/png',
            '.svg': 'image/svg+xml',
            '.webmanifest': 'application/manifest+json',
            '.wasm': 'application/wasm',
          }
          res.writeHead(200, {
            'Content-Type': mime[extname(file)] ?? 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control':
              extname(file) === '.html' || relative === 'sw.js' ? 'no-cache' : 'public,max-age=3600',
          })
          return res.end(data)
        } catch {
          /* return ordinary 404 below */
        }
      }
      json(404, { error: 'Nicht gefunden.' })
    } catch (error) {
      if (error instanceof z.ZodError || error instanceof SyntaxError)
        return json(400, { error: 'Ungültige Anfrage.' })
      json(409, { error: error instanceof Error ? error.message : 'Anfrage fehlgeschlagen.' })
    }
  })
  return {
    server,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          db.close()
          resolve()
        })
        server.closeIdleConnections()
      }),
  }
}
