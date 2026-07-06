#!/usr/bin/env node
/**
 * Kopiert den Vite-Build ins Repo-Root für GitHub Pages (legacy: branch main /).
 * Ohne diesen Schritt liefert Pages nur /src/main.tsx – die App startet nie.
 */
import { cpSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')

function copyDistFile(name, destName = name) {
  cpSync(path.join(dist, name), path.join(root, destName))
}

rmSync(path.join(root, 'assets'), { recursive: true, force: true })
mkdirSync(path.join(root, 'assets'), { recursive: true })
cpSync(path.join(dist, 'assets'), path.join(root, 'assets'), { recursive: true })

copyDistFile('dev.html', 'index.html')
copyDistFile('sw.js')
copyDistFile('manifest.webmanifest')

for (const file of readdirSync(dist)) {
  if (file.startsWith('workbox-') && file.endsWith('.js')) {
    copyDistFile(file)
  }
}

rmSync(path.join(root, 'icons'), { recursive: true, force: true })
cpSync(path.join(dist, 'icons'), path.join(root, 'icons'), { recursive: true })

cpSync(path.join(root, 'public', '.nojekyll'), path.join(root, '.nojekyll'))

console.log('Published dist/ to repo root for legacy GitHub Pages.')
