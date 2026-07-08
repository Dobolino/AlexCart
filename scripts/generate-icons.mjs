#!/usr/bin/env node
/** Erzeugt PWA-Icons aus public/icons/icon.svg */
import { readFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = path.join(root, 'public', 'icons', 'icon.svg')
const outDir = path.join(root, 'public', 'icons')
const rootIconsDir = path.join(root, 'icons')

const svg = readFileSync(svgPath)

const sizes = [180, 192, 512]

mkdirSync(outDir, { recursive: true })
mkdirSync(rootIconsDir, { recursive: true })

for (const size of sizes) {
  const png = await sharp(Buffer.from(svg)).resize(size, size).png().toBuffer()
  const filename = `icon-${size}.png`
  await sharp(png).toFile(path.join(outDir, filename))
  await sharp(png).toFile(path.join(rootIconsDir, filename))
  console.log(`Wrote ${filename}`)
}

console.log('App icons generated.')
