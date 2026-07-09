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

// Also rename in-place inside dist/ itself: the GitHub Actions Pages deploy
// (actions/upload-pages-artifact) uploads dist/ as-is, and GitHub Pages needs
// an index.html at the root to serve "/" - without this, a Pages source set to
// "GitHub Actions" (rather than "Deploy from a branch") 404s on every visit
// even though the workflow itself reports success.
cpSync(path.join(dist, 'dev.html'), path.join(dist, 'index.html'))

rmSync(path.join(root, 'assets'), { recursive: true, force: true })
mkdirSync(path.join(root, 'assets'), { recursive: true })
cpSync(path.join(dist, 'assets'), path.join(root, 'assets'), { recursive: true })

copyDistFile('index.html')
copyDistFile('sw.js')
copyDistFile('manifest.webmanifest')

for (const file of readdirSync(dist)) {
  if (file.startsWith('workbox-') && file.endsWith('.js')) {
    copyDistFile(file)
  }
}

rmSync(path.join(root, 'icons'), { recursive: true, force: true })
cpSync(path.join(dist, 'icons'), path.join(root, 'icons'), { recursive: true })

rmSync(path.join(root, 'splash'), { recursive: true, force: true })
cpSync(path.join(dist, 'splash'), path.join(root, 'splash'), { recursive: true })

cpSync(path.join(root, 'public', '.nojekyll'), path.join(root, '.nojekyll'))

console.log('Published dist/ to repo root for legacy GitHub Pages.')
