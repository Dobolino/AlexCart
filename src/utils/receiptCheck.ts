import Decimal from 'decimal.js'
import type { CompletedTrip, Currency } from '@/types'
import { findRetailer } from '@/data/retailCatalog'
import { normalize } from './text'
import { baseQuantity } from './quantity'
import { findReceiptDateInText, timestampToDateKey } from './date'
import { fingerprint } from './fingerprint'
import { parseAmount, isCountUnit } from './amount'
import { CATEGORIES } from '@/data/products'
import { dateKeyToTimestamp } from './date'
import {
  recognizeReceiptLabel,
  receiptRetailerKey,
  receiptBrandKey,
  type ReceiptAlias,
} from '@/data/receiptVocabulary'

export interface ReceiptCheckLine {
  id: string
  name: string
  amount: string
  minor: number
  occurrences: number
  discountMinor?: number
  weighed?: boolean
  cancelled?: boolean
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
  applyAmount?: boolean
  add?: boolean
  newName?: string
  category?: string
  productId?: string
  addAsWeight?: boolean
  originalAmount?: string
  brandName?: string
  brandOrigin?: 'Bontext' | 'Gemerkte Zuordnung' | 'App-Angabe' | 'Auswahl'
  applyBrand?: boolean
  remember?: boolean
  manual?: boolean
}
export interface ReceiptCheckEvidence {
  rows: ReceiptCheckRow[]
  adjustments: Array<{ name: string; minor: number }>
  totalMinor?: number
  currency: Currency
  store?: string
  date?: string
  applyDate?: boolean
  removeItemIds?: string[]
  warnings: string[]
  source: 'photo' | 'pdf' | 'text'
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
  if (!text.trim()) throw new Error('Bitte ein Bonfoto oder PDF wählen oder Bon-Text einfügen.')
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
  const totalCurrencies = new Set<Currency>()
  const totals: Array<{ minor: number; adjustments: number }> = []
  let afterTotal = false
  let afterItems = false
  let taxSection = false
  let additionalDiscounts = false
  let bonusPoints = false
  let nextLineId = 0
  let unparsed = 0
  let table = false
  let lastProduct: { row: ReceiptCheckLine; minor: number } | undefined
  const grouped = new Map<string, ReceiptCheckLine>()
  for (const raw of source) {
    const previousProduct = lastProduct
    lastProduct = undefined
    if (/artikelbezeichnung.*menge.*preis.*total/i.test(raw)) {
      table = true
      taxSection = false
      continue
    }
    if (/^(?:MwSt\s+NETTO|Gr\s+Satz\s+Total|(?:Brutto|Netto)\s+.*(?:MwSt|Steuer))/i.test(raw))
      taxSection = true
    if (/^Zwischen\s*(?:total|summe)\b/i.test(raw)) afterItems = true
    if (/^\*?\s*Weitere Rabatte\s*$/i.test(raw)) {
      additionalDiscounts = true
      continue
    }
    if (/^Cumulus Bons\s*$/i.test(raw)) continue
    if (/^Cumulus Bonuspunkte\s*$/i.test(raw)) {
      additionalDiscounts = false
      bonusPoints = true
      continue
    }
    if (bonusPoints) {
      if (/^(?:Total\s+(?:CHF|EUR)|Rundung)/i.test(raw)) bonusPoints = false
      else continue
    }
    const moreDiscounts = raw.match(/^Total weitere Rabatte\s+(-?\d+[.,]\d{2}-?)/i)
    if (moreDiscounts) {
      const value = receiptPriceMinor(moreDiscounts[1]!.replace(/-$/, ''))
      if (value !== null) result.adjustments.push({ name: 'Weitere Rabatte', minor: -Math.abs(value) })
      additionalDiscounts = false
      continue
    }
    const cumulusVoucher = raw.match(/^Cumulus Bon\b.*?\s+(\d+[.,]\d{2})-\s*(?:\d+)?$/i)
    if (cumulusVoucher) {
      result.adjustments.push({ name: 'Cumulus Bon', minor: -receiptPriceMinor(cumulusVoucher[1]!)! })
      continue
    }
    if (
      additionalDiscounts ||
      /^(?:CUM(?:$|[\s._+\d-])|Cumulus\b|\+?\d+\s*x\s*(?:Pkt|Punkte|Cumulus)|Bonus-Coupon\s+\d+\s*x\b)/i.test(
        raw
      )
    )
      continue
    if (taxSection) continue
    if (/^bar(?:zahlung)?\s+(?:(?:CHF|EUR)\s*)?\d+[.,]\d{2}\s*$/i.test(raw)) continue
    if (afterTotal && /^(?:(?:EDEKA )?App Gutschein\b|zur(?:ü|ue|u)ck\b)/i.test(raw)) continue
    const unnamedRefund = table && raw.match(/^\d+[.,]\d{3}\s+\d+[.,]\d{2}-\s+(\d+[.,]\d{2})-\s*[LS]?\d*$/i)
    if (unnamedRefund) {
      result.adjustments.push({
        name: 'Rückerstattung (Bonzeile ohne Artikelname)',
        minor: -receiptPriceMinor(unnamedRefund[1]!)!,
      })
      continue
    }
    // Metadata is excluded BEFORE monetary parsing, including multi-column footer rows.
    if (
      /^(?:zwischen\s*(?:summe|total)|subtotal|#?\s*mwst|ust\b|steuer|vat\b|(?:[A-D]|\d+)?\s*\d+[.,]?\d*\s*%|barzahlung\b|gegeben\b|r(?:ü|ue|u)ckgeld|restgeld|wechselgeld|ec[- ]?cash|karte(?:nzahlung)?\b|twint\b|visa\b|mastercard|maestro|zahlung\b|bezahlt\b|kontaktlos|girocard|cash\b|debit|credit|ersparnis|gespart|sie (?:haben gespart|sparen)|cumulus\b|(?:erhaltene?\s+)?punkte(?:stand)?\b|total\s+EFT\b|CHE-\d)/i.test(
        raw
      ) ||
      (afterTotal &&
        (/^für den einkauf von\b/i.test(raw) ||
          /\d{2}[./]\d{2}[./]\d{2,4}.*\d{2}:\d{2}|\d{4}-\d{2}-\d{2}T|^:?\d{2}\.\d{3}Z/.test(raw)))
    )
      continue
    const line = raw
      .replace(/\s+/g, ' ')
      .replace(/\b(?:CHF|SFR|EUR)(?=\s*[-\d])/gi, ' ')
      .replace(/([.,]\d{2})\s*(?:CHF|SFR|EUR)\b/gi, '$1')
      .replace(/€/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    // Migros digital receipts: label, quantity, unit price, optional savings, PAID total, tax group.
    const cells =
      table && !afterTotal && !afterItems
        ? line.match(
            /^(.*?)\s+(-?\d+(?:[.,]\d{3})?)\s+(\d+[.,]\d{2})\s+(?:(\d+[.,]\d{2}|\*)\s+)?(-?\d+[.,]\d{2}-?)(?:\s+#?[LS]?\d+)?$/i
          )
        : null
    const match = cells
      ? [cells[0], cells[1], cells[5]]
      : line.match(/^(.*?)\s+(-?(?:\d{1,3}(?:['’]\d{3})+|\d{1,7})[.,]\d{2}-?)\s*(?:\*?[A-D]W?|\*)?\s*$/i)
    if (!match) {
      if (!result.store && !/\d[.,]\d{2}/.test(line))
        result.store = findRetailer(
          line.replace(/^genossenschaft\s+/i, ''),
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
    if (taxSection) continue
    if (
      /^(?:total(?:betrag)?|summe|gesamt(?:betrag)?|zu zahlen|zahlbetrag|endsumme|betrag)\s*:?(?:\s*(?:CHF|EUR))?\s*$/i.test(
        head
      )
    ) {
      totals.push({ minor, adjustments: result.adjustments.reduce((sum, row) => sum + row.minor, 0) })
      if (/\b(?:CHF|SFR)\b/i.test(raw)) totalCurrencies.add('CHF')
      if (/\bEUR\b|€/i.test(raw)) totalCurrencies.add('EUR')
      afterTotal = true
      continue
    }
    if (afterTotal && minor >= 0 && !/^(?:Coupon|Gutschein|Rabatt|Rundung)\b/i.test(head)) {
      unparsed++
      continue
    }
    if (/^(?:\d+[.,]?\d*\s*(?:kg|g|l|ml)\b|\d+\s*[x×*]\s*$)/i.test(head)) continue
    const cancellation = !!cells && Number(cells[2]!.replace(',', '.')) < 0 && minor < 0
    if (!cancellation && (minor < 0 || /rabatt|coupon|gutschein|pfand|rundung|retoure?/i.test(head))) {
      // Only this explicitly item-bound EDEKA/Marktkauf format is allocated to the preceding item.
      // Generic coupons and ambiguous discounts remain separate adjustments.
      if (
        /^App Preis\s*\/\s*Rabatt$/i.test(head) &&
        minor < 0 &&
        previousProduct &&
        previousProduct.minor + minor >= 0
      ) {
        previousProduct.row.minor += minor
        previousProduct.row.discountMinor = (previousProduct.row.discountMinor ?? 0) + minor
        continue
      }
      result.adjustments.push({
        name: head,
        minor: /^(?:Coupon|Rabatt)\b/i.test(head) && minor > 0 ? -minor : minor,
      })
      continue
    }
    let quantity = cells
      ? !/[.,]/.test(cells[2]!)
        ? Number(cells[2])
        : Math.sign(Number(cells[2]!.replace(',', '.')))
      : 1
    let measuredAmount =
      cells && /[.,]/.test(cells[2]!)
        ? `${new Decimal(cells[2]!.replace(',', '.')).times(1000).toNumber()} g`
        : ''
    // EDEKA prints both unit price × count and the final line total. Never multiply twice.
    const unitTimesCount = !cells && head.match(/^(.*?)\s*(\d+[.,]\d{2})\s*[x×*]\s*(\d+)$/i)
    const trailing = !cells && head.match(/^(.+?)\s+(\d+)\s*[x×*]$/i)
    const leading = !cells && head.match(/^(\d+)\s*[x×*]\s+(.+)$/i)
    let price = minor
    if (unitTimesCount) {
      head = unitTimesCount[1]!.trim()
      quantity = Number(unitTimesCount[3])
    } else if (trailing) {
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
      (!cancellation && quantity < 1) ||
      quantity > 10000 ||
      !/[\p{L}]/u.test(head)
    ) {
      unparsed++
      continue
    }
    const pack = head.match(/^(.+?)\s+(\d+(?:[.,]\d+)?\s*(?:kg|g|ml|cl|l))$/i)
    const name = (pack?.[1] ?? head).trim()
    const hint = pack?.[2] ?? ''
    if (!measuredAmount && quantity > 1) measuredAmount = hint ? `${quantity} × ${hint}` : `${quantity} Stück`
    else if (!measuredAmount) measuredAmount = hint
    if (!measuredAmount && cells && quantity === 1) measuredAmount = '1 Stück'
    const key = `${checkName(name)}|${checkName(hint)}`
    const tableDiscount = cells?.[4] ? -(receiptPriceMinor(cells[4]) ?? 0) : 0
    const existing = grouped.get(key)
    if (cancellation && (!existing || existing.minor + price < 0 || existing.occurrences + quantity < 0)) {
      result.adjustments.push({ name: head, minor })
      continue
    }
    if (existing) {
      existing.minor += price
      existing.occurrences += quantity
      if (cancellation) existing.cancelled = true
      if (tableDiscount) existing.discountMinor = (existing.discountMinor ?? 0) + tableDiscount
      const oldMass = baseQuantity(existing.amount)
      const addedMass = baseQuantity(measuredAmount.replace(/^-/, ''))
      existing.amount =
        oldMass?.unit === 'g' && addedMass?.unit === 'g' && cells && /[.,]/.test(cells[2]!)
          ? `${new Decimal(oldMass.value).plus(cancellation ? -addedMass.value : addedMass.value).toNumber()} g`
          : hint
            ? `${existing.occurrences} × ${hint}`
            : `${existing.occurrences} Stück`
    } else
      grouped.set(key, {
        id: `line-${nextLineId++}`,
        name,
        minor: price,
        amount: measuredAmount,
        occurrences: quantity,
        weighed: !!cells && /[.,]/.test(cells[2]!),
        ...(tableDiscount ? { discountMinor: tableDiscount } : {}),
      })
    lastProduct = { row: grouped.get(key)!, minor: price }
    if (existing?.minor === 0 && existing.occurrences === 0) {
      grouped.delete(key)
      lastProduct = undefined
    }
  }
  result.lines = [...grouped.values()]
  // A labelled receipt total is stronger evidence than phone chrome or foreign-currency footnotes.
  const effectiveCurrencies = totalCurrencies.size ? totalCurrencies : currencies
  result.currency = effectiveCurrencies.size === 1 ? [...effectiveCurrencies][0] : undefined
  if (effectiveCurrencies.size > 1)
    result.warnings.push('Mehrere Währungen erkannt. Die Bonwährung bitte prüfen.')
  if (result.lines.length > 200)
    throw new Error('Bitte höchstens 200 unterschiedliche Bonpositionen auf einmal prüfen.')
  if (
    totals.length &&
    totals.every(
      (total, index) =>
        !index ||
        total.minor === totals[index - 1]!.minor + total.adjustments - totals[index - 1]!.adjustments
    )
  )
    result.totalMinor = totals[totals.length - 1]!.minor
  else if (totals.length)
    result.warnings.push('Unterschiedliche Endbeträge erkannt. Endbetrag manuell prüfen.')
  if (unparsed) result.warnings.push(`${unparsed} Geldzeile(n) nicht sicher erkannt. Bon-Text bitte prüfen.`)
  if (!result.lines.length)
    result.warnings.push('Keine Produktzeilen sicher erkannt. Bitte den erkannten Text prüfen.')
  return result
}

export function suggestReceiptRows(
  document: ReceiptCheckDocument,
  trip: CompletedTrip,
  aliases: ReceiptAlias[] = []
): ReceiptCheckRow[] {
  return document.lines.map((line) => {
    const receiptKey = receiptRowKey(line)
    const oldSingleKey = line.amount === '1 Stück' ? receiptRowKey({ ...line, amount: '' }) : receiptKey
    const linked = trip.items.filter(
      (item) => item.receiptKey === receiptKey || item.receiptKey === oldSingleKey
    )
    const recognized = recognizeReceiptLabel(
      line.name,
      receiptRetailerKey(trip.store, trip.currency ?? 'CHF'),
      aliases,
      line.amount,
      !!line.weighed
    )
    const exact = linked.length
      ? linked
      : trip.items.filter(
          (item) =>
            checkName(item.name) === checkName(line.name) ||
            (recognized.source === 'remembered' && checkName(item.name) === checkName(recognized.name))
        )
    return {
      ...line,
      originalAmount: line.amount,
      targetId: exact.length === 1 ? exact[0]!.id : '',
      apply: false,
    }
  })
}
export const receiptRowKey = (row: ReceiptCheckLine & { originalAmount?: string }) =>
  fingerprint([checkName(row.name), checkName(row.originalAmount ?? row.amount)])
export function quantityMismatch(receiptAmount: string, appAmount: string): boolean {
  const a = receiptQuantity(receiptAmount),
    b = receiptQuantity(appAmount)
  return !!a && !!b && a.unit === b.unit && Math.abs(a.value - b.value) > 0.001
}
export function receiptQuantity(amount: string) {
  const quantity = baseQuantity(amount)
  if (quantity)
    return quantity.value > 0 &&
      quantity.value <= 1e9 &&
      (quantity.unit !== 'piece' || Number.isInteger(quantity.value))
      ? quantity
      : null
  const count = parseAmount(amount)
  return count &&
    Number.isInteger(count.value) &&
    count.value > 0 &&
    count.value <= 10000 &&
    isCountUnit(count.unit)
    ? { value: count.value, unit: 'piece' as const }
    : null
}
export function validReceiptDate(date: string | undefined): date is string {
  return (
    !!date &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    dateKeyToTimestamp(date) >= 0 &&
    timestampToDateKey(dateKeyToTimestamp(date)) === date
  )
}
export function compareReceiptCheck(trip: CompletedTrip, evidence: ReceiptCheckEvidence) {
  const existingNames = new Set(trip.items.map((item) => checkName(item.name)))
  const existingReceiptKeys = new Set(trip.items.map((item) => item.receiptKey).filter(Boolean))
  const targets = evidence.rows.map((row) => row.targetId).filter(Boolean)
  const duplicateIds = new Set(targets.filter((id, index) => targets.indexOf(id) !== index))
  const rows = evidence.rows.map((row) => {
    const item = trip.items.find((item) => item.id === row.targetId)
    const invalidPrice = !Number.isSafeInteger(row.minor) || row.minor < 0 || row.minor > 100000000
    const appMinor =
      item?.price === undefined ? undefined : new Decimal(item.price).times(100).toDecimalPlaces(0).toNumber()
    const mismatch = !!item && quantityMismatch(row.amount, item.amount)
    const brandMismatch =
      !!item?.brandName &&
      !!row.brandName &&
      receiptBrandKey(item.brandName) !== receiptBrandKey(row.brandName)
    const quantity = receiptQuantity(row.amount)
    const appQuantity = item ? receiptQuantity(item.amount) : null
    const canApplyAmount =
      !!item &&
      !!quantity &&
      !duplicateIds.has(row.targetId) &&
      (!appQuantity || quantity.unit === appQuantity.unit) &&
      row.amount.trim() !== item.amount.trim()
    const canAdd =
      !row.targetId &&
      !invalidPrice &&
      row.minor > 0 &&
      !!quantity &&
      !!row.newName?.trim() &&
      row.newName.trim().length <= 300 &&
      CATEGORIES.includes(row.category ?? '') &&
      (!row.addAsWeight || quantity.unit === 'g') &&
      !existingNames.has(checkName(row.newName ?? '')) &&
      !existingReceiptKeys.has(receiptRowKey(row))
    return {
      ...row,
      item,
      appMinor,
      invalidPrice,
      quantityMismatch: mismatch,
      brandMismatch,
      canApplyAmount,
      canAdd,
      canApplyBrand:
        !!item &&
        !duplicateIds.has(row.targetId) &&
        (row.brandName ?? '').trim().length <= 300 &&
        (row.brandName ?? '').trim() !== (item.brandName ?? ''),
      duplicate: duplicateIds.has(row.targetId),
      equal: !!item && !invalidPrice && appMinor === row.minor,
      canApply:
        !!item &&
        !invalidPrice &&
        row.minor > 0 &&
        (!mismatch || (!!row.applyAmount && canApplyAmount)) &&
        (!brandMismatch || !!row.applyBrand) &&
        !duplicateIds.has(row.targetId) &&
        appMinor !== row.minor,
    }
  })
  const lineSum =
    evidence.rows.reduce((sum, row) => sum + (Number.isSafeInteger(row.minor) ? row.minor : 0), 0) +
    evidence.adjustments.reduce((sum, adjustment) => sum + adjustment.minor, 0)
  const missingItems = trip.items.filter((item) => !targets.includes(item.id))
  const productSum = evidence.rows.reduce(
    (sum, row) => sum + (Number.isSafeInteger(row.minor) ? row.minor : 0),
    0
  )
  const adjustmentSum = evidence.adjustments.reduce((sum, row) => sum + row.minor, 0)
  const dateMismatch = !!evidence.date && evidence.date !== timestampToDateKey(trip.completedAt)
  const storeMismatch =
    !!evidence.store &&
    !!trip.store &&
    (findRetailer(evidence.store)?.id ?? normalize(evidence.store)) !==
      (findRetailer(trip.store)?.id ?? normalize(trip.store))
  const metadataMismatch = dateMismatch || storeMismatch
  const unresolved =
    rows.filter(
      (row) => !row.item || row.invalidPrice || row.quantityMismatch || row.brandMismatch || row.duplicate
    ).length + missingItems.length
  const allEqual =
    rows.length > 0 &&
    rows.every((row) => row.equal && !row.quantityMismatch && !row.brandMismatch && !row.duplicate)
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
    productSum,
    adjustmentSum,
    missingItems,
    metadataMismatch,
    dateMismatch,
    storeMismatch,
    unresolved,
    allEqual,
    totalMatches,
    status,
  } as const
}
