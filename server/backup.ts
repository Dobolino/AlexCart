import { DatabaseSync, backup } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const data = resolve(process.env.ALEXCART_DATA_DIR ?? '.local-data')
const directory = resolve(process.env.ALEXCART_BACKUP_DIR ?? resolve(data, 'backups'))
mkdirSync(directory, { recursive: true })
const database = new DatabaseSync(resolve(data, 'alexcart.sqlite'), { readOnly: true })
try {
  await backup(database, resolve(directory, `alexcart-${Date.now()}.sqlite`))
  console.log('Datenbanksicherung erstellt.')
} finally {
  database.close()
}
