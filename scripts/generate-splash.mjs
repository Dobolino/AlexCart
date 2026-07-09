#!/usr/bin/env node
/**
 * Erzeugt iOS-Startbildschirme (apple-touch-startup-image).
 *
 * iOS nutzt diese Bilder (nicht das Web-Manifest) um die Fläche zu bestimmen,
 * mit der eine als Standalone-App gestartete Seite initial gerendert wird -
 * ohne ein exakt zur Gerätegröße passendes Bild kann iOS beim Start eine
 * falsche/zu kurze Fläche annehmen, die dann persistiert (das war Ursache des
 * "schwarzer Streifen unten"-Bugs in Hochformat).
 */
import { readFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const svgPath = path.join(root, 'public', 'icons', 'icon.svg')
const outDir = path.join(root, 'public', 'splash')
const rootSplashDir = path.join(root, 'splash')

const svg = readFileSync(svgPath)

// width/height in CSS px (portrait, matching Apple's documented device list),
// dpr = -webkit-device-pixel-ratio. Covers current-generation iPhones.
const devices = [
  { name: 'iphone-16-pro-max', width: 440, height: 956, dpr: 3 },
  { name: 'iphone-16-pro', width: 402, height: 874, dpr: 3 },
  { name: 'iphone-16-plus', width: 430, height: 932, dpr: 3 },
  { name: 'iphone-16', width: 393, height: 852, dpr: 3 },
  { name: 'iphone-14-13-12', width: 390, height: 844, dpr: 3 },
  { name: 'iphone-11-pro-max-xs-max', width: 414, height: 896, dpr: 3 },
  { name: 'iphone-11-xr', width: 414, height: 896, dpr: 2 },
  { name: 'iphone-se', width: 375, height: 667, dpr: 2 },
]

// icon.svg already bakes in its own #000000 square background (see the app
// icon design), matching the manifest's background_color - so a single black
// splash per device is enough, no separate light variant needed.
mkdirSync(outDir, { recursive: true })
mkdirSync(rootSplashDir, { recursive: true })

for (const d of devices) {
  const w = d.width * d.dpr
  const h = d.height * d.dpr
  const iconSize = Math.round(Math.min(w, h) * 0.34)
  const icon = await sharp(Buffer.from(svg)).resize(iconSize, iconSize).toBuffer()
  const filename = `${d.name}.png`

  const png = await sharp({
    create: { width: w, height: h, channels: 4, background: '#000000' },
  })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toBuffer()

  await sharp(png).toFile(path.join(outDir, filename))
  await sharp(png).toFile(path.join(rootSplashDir, filename))
  console.log(`Wrote ${filename} (${w}x${h})`)
}

console.log('Splash screens generated.')
