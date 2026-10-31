import Decimal from 'decimal.js'
import type { CompletedTrip, Currency } from '@/types'
import { findRetailer } from '@/data/retailCatalog'
import { baseQuantity } from './quantity'
import { findReceiptDateInText, timestampToDateKey } from './date'
import { fingerprint } from './fingerprint'

export interface ReceiptCheckLine {
  id: string
  name: string
  amount: string
  minor: number
  occurrences: number
}
export interface ReceiptCheckDocument {
  lines: ReceiptCheckLine[]
  adjustments: Array<{ name: string; minor: number }>
  totalMinor?: number
  currency?: Currency
  store?: string
  date?: string
  warnings: string[]
}
export interface ReceiptCheckRow extends ReceiptCheckLine {
  targetId: string
  apply: boolean
}
export interface ReceiptCheckEvidence {
  rows: ReceiptCheckRow[]
  adjustments: Array<{ name: string; minor: number }>
  totalMinor?: number
  currency: Currency
  store?: string
  date?: string
  warnings: string[]
  source: 'photo' | 'text'
}
export const checkName = (name: string) =>
  name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ß/g, 'ss')
    .replace(/\([^)]*rezeptbedarf[^)]*\)/gi, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
export function receiptPriceMinor(text: string): number | null {
  const clean = text.trim().replace(/[’']/g, '').replace(',', '.')
  if (!/^-?\d{1,7}\.\d{2}$/.test(clean)) return null
  const value = new Decimal(clean).times(100).toNumber()
  return Number.isSafeInteger(value) && Math.abs(value) <= 100000000 ? value : null
}
export const receiptTripSnapshot = (trip: CompletedTrip) =>
  JSON.stringify({
    date: trip.completedAt,
    currency: trip.currency ?? 'CHF',
    store: trip.store,
    storeId: trip.storeId,
    country: trip.country,
    items: trip.items,
  })
export const receiptTripFingerprint = (trip: CompletedTrip) => fingerprint(receiptTripSnapshot(trip))

/** Conservative line parser: payment/tax lines never become products. No inferred currencies or prices. */
export function parseReceiptCheck(text: string): ReceiptCheckDocument {
  if (!text.trim()) throw new Error('Bitte ein Bonfoto wählen oder Bon-Text einfügen.')
  if (text.length > 100000) throw new Error('Der Bon-Text ist zu lang (maximal 100.000 Zeichen).')
  const source = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (source.length > 600) throw new Error('Bitte höchstens 600 Bonzeilen auf einmal prüfen.')
  const currencies = new Set<Currency>()
  if (/\b(?:CHF|SFR)(?=\s|\d|$)/i.test(text)) currencies.add('CHF')
  if (/\bEUR(?=\s|\d|$)|€/i.test(text)) currencies.add('EUR')
  const result: ReceiptCheckDocument = {
    lines: [],
    adjustments: [],
    currency: currencies.size === 1 ? [...currencies][0] : undefined,
    date: findReceiptDateInText(text) ?? undefined,
    warnings: [],
  }
  if (currencies.size > 1) result.warnings.push('Mehrere Währungen erkannt. Die Bonwährung bitte prüfen.')
  const totals: number[] = []
  let afterTotal = false
  let unparsed = 0
  const grouped = new Map<string, ReceiptCheckLine>()
  for (const raw of source) {
    const line = raw
      .replace(/\s+/g, ' ')
      .replace(/\b(?:CHF|SFR|EUR)(?=\s*[-\d])/gi, ' ')
      .replace(/([.,]\d{2})\s*(?:CHF|SFR|EUR)\b/gi, '$1')
      .replace(/€/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    const match = line.match(/^(.*?)\s+(-?(?:\d{1,3}(?:['’]\d{3})+|\d{1,7})[.,]\d{2}-?)\s*[A-D*]?\s*$/i)
    if (!match) {
      if (!result.store && !/\d[.,]\d{2}/.test(line))
        result.store = findRetailer(
          line,
          result.currency === 'EUR' ? 'DE' : result.currency === 'CHF' ? 'CH' : undefined
        )?.name
      if (
        /\d[.,]\d{2}/.test(line) &&
        !/^(?:\d+[.,]?\d*\s*(?:kg|g|l|ml)|\d+\s*[x×*]|\d{1,2}[.:]\d{2}|\d{2}[./]\d{2})/.test(line)
      )
        unparsed++
      continue
    }
    let head = match[1]!.trim()
    const value = match[2]!
    const minor = receiptPriceMinor(value.endsWith('-') ? `-${value.slice(0, -1)}` : value)
    if (minor === null) {
      unparsed++
      continue
    }
    if (
      /^(?:zwischen\s*summe|subtotal|mwst|ust|steuer|vat|\d+[.,]?\d*\s*%|bar(?:zahlung)?\b|gegeben\b|r(?:ü|ue|u)ckgeld|restgeld|wechselgeld|ec[- ]?cash|karte(?:nzahlung)?\b|twint\b|visa\b|mastercard|maestro|zahlung\b|bezahlt\b|kontaktlos|girocard|cash\b|debit|credit|ersparnis|gespart|sie haben gespart|punkte\b)/i.test(
        head
      )
    )
      continue
    if (/^(?:total(?:betrag)?|summe|gesamt(?:betrag)?|zu zahlen|zahlbetrag|endsumme|betrag)\b/i.test(head)) {
      totals.push(minor)
      afterTotal = true
      continue
    }
    if (afterTotal) {
      unparsed++
      continue
    }
    if (/^(?:\d+[.,]?\d*\s*(?:kg|g|l|ml)\b|\d+\s*[x×*]\s*$)/i.test(head)) continue
    if (minor < 0 || /rabatt|coupon|gutschein|pfand|rundung|retoure?/i.test(head)) {
      result.adjustments.push({ name: head, minor })
      continue
    }
    let quantity = 1
    const trailing = head.match(/^(.+?)\s+(\d+)\s*[x×*]$/i)
    const leading = head.match(/^(\d+)\s*[x×*]\s+(.+)$/i)
    let price = minor
    if (trailing) {
      head = trailing[1]!
      quantity = Number(trailing[2])
      price *= quantity
    } else if (leading) {
      quantity = Number(leading[1])
      head = leading[2]!
    }
    if (
      !Number.isSafeInteger(price) ||
      price > 100000000 ||
      quantity < 1 ||
      quantity > 10000 ||
      !/[\p{L}]/u.test(head)
    ) {
      unparsed++
      continue
    }
    const pack = head.match(/^(.+?)\s+(\d+(?:[.,]\d+)?\s*(?:kg|g|ml|cl|l))$/i)
    const name = (pack?.[1] ?? head).trim()
    const hint = pack?.[2] ?? ''
    const key = `${checkName(name)}|${checkName(hint)}`
    const existing = grouped.get(key)
    if (existing) {
      existing.minor += price
      existing.occurrences += quantity
      existing.amount = hint ? `${existing.occurrences} × ${hint}` : `${existing.occurrences} Stück`
    } else
      grouped.set(key, {
        id: `line-${grouped.size}`,
        name,
        minor: price,
        amount: hint
          ? quantity > 1
            ? `${quantity} × ${hint}`
            : hint
          : quantity > 1
            ? `${quantity} Stück`
            : '',
        occurrences: quantity,
      })
  }
  result.lines = [...grouped.values()]
  if (result.lines.length > 200)
    throw new Error('Bitte höchstens 200 unterschiedliche Bonpositionen auf einmal prüfen.')
  if (totals.length && new Set(totals).size === 1) result.totalMinor = totals[0]
  else if (totals.length)
    result.warnings.push('Unterschiedliche Endbeträge erkannt. Endbetrag manuell prüfen.')
  if (unparsed) result.warnings.push(`${unparsed} Geldzeile(n) nicht sicher erkannt. Bon-Text bitte prüfen.`)
  if (!result.lines.length)
    result.warnings.push('Keine Produktzeilen sicher erkannt. Bitte den erkannten Text prüfen.')
  return result
}

export function suggestReceiptRows(document: ReceiptCheckDocument, trip: CompletedTrip): ReceiptCheckRow[] {
  return document.lines.map((line) => {
    const exact = trip.items.filter((item) => checkName(item.name) === checkName(line.name))
    return { ...line, targetId: exact.length === 1 ? exact[0]!.id : '', apply: false }
  })
}
export function quantityMismatch(receiptAmount: string, appAmount: string): boolean {
  const a = baseQuantity(receiptAmount),
    b = baseQuantity(appAmount)
  return !!a && !!b && a.unit === b.unit && Math.abs(a.value - b.value) > 0.001
}
export function compareReceiptCheck(trip: CompletedTrip, evidence: ReceiptCheckEvidence) {
  const targets = evidence.rows.map((row) => row.targetId).filter(Boolean)
  const duplicateIds = new Set(targets.filter((id, index) => targets.indexOf(id) !== index))
  const rows = evidence.rows.map((row) => {
    const item = trip.items.find((item) => item.id === row.targetId)
    const invalidPrice = !Number.isSafeInteger(row.minor) || row.minor < 0 || row.minor > 100000000
    const appMinor =
      item?.price === undefined ? undefined : new Decimal(item.price).times(100).toDecimalPlaces(0).toNumber()
    const mismatch = !!item && quantityMismatch(row.amount, item.amount)
    return {
      ...row,
      item,
      appMinor,
      invalidPrice,
      quantityMismatch: mismatch,
      duplicate: duplicateIds.has(row.targetId),
      equal: !!item && !invalidPrice && appMinor === row.minor,
      canApply:
        !!item &&
        !invalidPrice &&
        row.minor > 0 &&
        !mismatch &&
        !duplicateIds.has(row.targetId) &&
        appMinor !== row.minor,
    }
  })
  const lineSum =
    evidence.rows.reduce((sum, row) => sum + (Number.isSafeInteger(row.minor) ? row.minor : 0), 0) +
    evidence.adjustments.reduce((sum, adjustment) => sum + adjustment.minor, 0)
  const missingItems = trip.items.filter((item) => !targets.includes(item.id))
  const metadataMismatch =
    (!!evidence.date && evidence.date !== timestampToDateKey(trip.completedAt)) ||
    (!!evidence.store && !!trip.store && findRetailer(evidence.store)?.id !== findRetailer(trip.store)?.id)
  const unresolved =
    rows.filter((row) => !row.item || row.invalidPrice || row.quantityMismatch || row.duplicate).length +
    missingItems.length
  const allEqual =
    rows.length > 0 && rows.every((row) => row.equal && !row.quantityMismatch && !row.duplicate)
  const totalMatches = evidence.totalMinor !== undefined && evidence.totalMinor === lineSum
  const status =
    unresolved ||
    evidence.warnings.length ||
    evidence.adjustments.length ||
    metadataMismatch ||
    evidence.totalMinor === undefined
      ? 'partial'
      : allEqual && totalMatches && evidence.currency === (trip.currency ?? 'CHF')
        ? 'matched'
        : 'differences'
  return {
    rows,
    lineSum,
    missingItems,
    metadataMismatch,
    unresolved,
    allEqual,
    totalMatches,
    status,
  } as const
}
