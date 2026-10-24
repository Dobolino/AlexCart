import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createApp } from './app.ts'

const data = resolve(process.env.ALEXCART_DATA_DIR ?? '.local-data')
mkdirSync(data, { recursive: true })
const { server, close } = createApp({
  databasePath: resolve(data, 'alexcart.sqlite'),
  origins: process.env.ALLOWED_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  staticRoot: resolve('dist'),
  contact: process.env.APP_CONTACT,
})
server.listen(Number(process.env.PORT ?? 8787), process.env.BIND_ADDRESS ?? '127.0.0.1', () =>
  console.log('AlexCart-Server gestartet.')
)
process.once('SIGTERM', () => void close())
process.once('SIGINT', () => void close())
