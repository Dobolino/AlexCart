import { formatMoney } from './currency'
import { tripTotalSpent } from './stats'
import type { CompletedTrip, Currency } from '@/types'

const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace"

function receiptDate(completedAt: number): string {
  const d = new Date(completedAt)
  return `${d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}  ${d.toLocaleTimeString(
    'de-DE',
    { hour: '2-digit', minute: '2-digit' }
  )}`
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text
  let t = text
  while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) t = t.slice(0, -1)
  return t + '…'
}

/** Zeichnet einen kassenbon-artigen Beleg auf ein Canvas (immer hell, geräteunabhängig). */
function drawReceipt(trip: CompletedTrip, currency: Currency): HTMLCanvasElement {
  const dpr = 2
  const W = 384
  const padX = 28
  const innerW = W - padX * 2
  const items = trip.items
  const total = tripTotalSpent(trip)
  const missing = items.filter((i) => i.price === undefined).length

  // Höhe vorab bestimmen
  let h = 30 // top padding
  h += 34 // ALEXSHOP
  h += 24 // Listenname
  if (trip.store) h += 22
  h += 22 // Datum
  h += 24 // Trennlinie
  for (const it of items) h += it.amount ? 42 : 26
  h += 24 // Trennlinie
  h += 40 // TOTAL
  h += 22 // Artikel-Zusammenfassung
  h += 30 // bottom padding

  const canvas = document.createElement('canvas')
  canvas.width = W * dpr
  canvas.height = h * dpr
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, h)
  ctx.fillStyle = '#111111'
  ctx.textBaseline = 'alphabetic'

  const cx = W / 2
  let y = 30

  ctx.textAlign = 'center'
  ctx.font = `700 24px ${MONO}`
  y += 24
  ctx.fillText('ALEXSHOP', cx, y)
  y += 10

  ctx.font = `700 15px ${MONO}`
  y += 16
  ctx.fillText(ellipsize(ctx, trip.listName, innerW), cx, y)
  y += 8

  ctx.fillStyle = '#555555'
  ctx.font = `13px ${MONO}`
  if (trip.store) {
    y += 14
    ctx.fillText(ellipsize(ctx, trip.store, innerW), cx, y)
    y += 8
  }
  y += 14
  ctx.fillText(receiptDate(trip.completedAt), cx, y)
  y += 8

  const dashed = () => {
    y += 14
    ctx.strokeStyle = '#bbbbbb'
    ctx.lineWidth = 1
    ctx.setLineDash([3, 4])
    ctx.beginPath()
    ctx.moveTo(padX, y)
    ctx.lineTo(W - padX, y)
    ctx.stroke()
    ctx.setLineDash([])
    y += 4
  }
  dashed()

  ctx.fillStyle = '#111111'
  for (const it of items) {
    y += 22
    const priceStr = it.price !== undefined ? formatMoney(it.price, currency) : '–'
    ctx.font = `14px ${MONO}`
    ctx.textAlign = 'right'
    ctx.fillText(priceStr, W - padX, y)
    const priceW = ctx.measureText(priceStr).width
    ctx.textAlign = 'left'
    ctx.font = `700 14px ${MONO}`
    ctx.fillText(ellipsize(ctx, it.name, innerW - priceW - 12), padX, y)
    if (it.amount) {
      y += 18
      ctx.fillStyle = '#777777'
      ctx.font = `12px ${MONO}`
      ctx.fillText(ellipsize(ctx, it.amount, innerW), padX, y)
      ctx.fillStyle = '#111111'
    }
  }

  dashed()

  y += 30
  ctx.textAlign = 'left'
  ctx.font = `700 18px ${MONO}`
  ctx.fillText('TOTAL', padX, y)
  ctx.textAlign = 'right'
  ctx.font = `700 20px ${MONO}`
  ctx.fillText(formatMoney(total, currency), W - padX, y)

  y += 22
  ctx.textAlign = 'center'
  ctx.fillStyle = '#777777'
  ctx.font = `12px ${MONO}`
  const summary = `${items.length} Artikel${missing > 0 ? ` · ${missing} ohne Preis` : ''}`
  ctx.fillText(summary, cx, y)

  return canvas
}

function slugDate(completedAt: number): string {
  const d = new Date(completedAt)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Erzeugt ein Quittungs-PNG und teilt es (Web Share) bzw. lädt es als Fallback herunter. */
export async function shareReceiptImage(trip: CompletedTrip, currency: Currency): Promise<void> {
  const canvas = drawReceipt(trip, currency)
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) return

  const filename = `quittung-${slugDate(trip.completedAt)}.png`
  const file = new File([blob], filename, { type: 'image/png' })
  const nav = navigator as Navigator & {
    canShare?: (data: unknown) => boolean
    share?: (data: unknown) => Promise<void>
  }

  if (nav.canShare && nav.share && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Quittung', text: trip.listName })
      return
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return
      // sonst weiter zum Download-Fallback
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
