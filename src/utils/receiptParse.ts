import { CATEGORIES } from '@/data/products'
import { normalizeCategory } from '@/utils/icon'
import { normalize } from '@/utils/text'
import type { StorePreset } from '@/constants/stores'

export interface ReceiptLineItem {
  name: string
  amount: string
  category: string
  price: number
  /** Einzelpreis falls aus „2 x 1.80“ erkannt */
  unitPrice?: number
  quantity?: number
  wasSale?: boolean
}

export interface ParsedReceipt {
  store?: string
  items: ReceiptLineItem[]
  total?: number
  rawText: string
}

/** Zeilen wie „2 x 1.80“ / „2×1,80“ am Ende. */
const QTY_PRICE_RE = /^(.+?)\s+(\d+)\s*[x×]\s*(\d+[.,]\d{2})\s*$/i
/** „4 x Cottage Cheese 7.20“ */
const LEADING_QTY_RE = /^(\d+)\s*[x×]\s*(.+?)\s+(\d+[.,]\d{2})\s*$/i
/** „Name 500g 2.30“ oder „Name 2,30“ */
const NAME_AMOUNT_PRICE_RE =
  /^(.+?)\s+(\d+(?:[.,]\d+)?\s*(?:g|kg|ml|l|cl))\s+(\d+[.,]\d{2})\s*$/i
const NAME_PRICE_RE = /^(.+?)\s+(\d+[.,]\d{2})\s*$/
const TOTAL_RE = /(?:total|summe|zu\s*zahlen|zahlbetrag)\s*:?\s*(\d+[.,]\d{2})/i

function parseMoney(raw: string): number {
  return Math.round(parseFloat(raw.replace(',', '.')) * 100) / 100
}

function guessCategory(name: string): string {
  const n = normalize(name)
  const rules: [RegExp, string][] = [
    [/banane|apfel|tomate|gurke|salat|gemuse|obst|beere|zwiebel|kartoffel|paprika/, 'Früchte & Gemüse'],
    [/milch|joghurt|quark|käse|kase|butter|sahne|cottage|skyr|ei\b|eier/, 'Milch & Käse'],
    [/poulet|huhn|hähnchen|fleisch|wurst|schinken|lachs|fisch|schnitzel/, 'Fleisch & Fisch'],
    [/brot|brötchen|gipfeli|croissant|sandwich|toast/, 'Brot & Backwaren'],
    [/reis|pasta|nudeln|mehl|hafer/, 'Getreide & Beilagen'],
    [/wasser|saft|cola|bier|wein|kaffee|tee/, 'Getränke'],
    [/tiefkühl|tk |glace|eis |pizza/, 'Tiefkühl'],
    [/konfitüre|honig|nutella|aufstrich/, 'Konserven & Saucen'],
    [/seife|waschmittel|putz|papier|folie/, 'Haushalt & Reinigung'],
  ]
  for (const [re, cat] of rules) {
    if (re.test(n)) return cat
  }
  return CATEGORIES[9] ?? 'Sonstiges'
}

function cleanProductName(name: string): string {
  return name
    .replace(/\b(migros|coop|denner|aldi|lidl|spar|m-budget|m classic|naturaplan|prix garantie)\b/gi, '')
    .replace(/[·•]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toAmount(qty: number, packHint?: string): string {
  if (packHint) {
    if (qty > 1) return `${qty} × ${packHint}`
    return packHint
  }
  if (qty > 1) return `${qty} Stück`
  return ''
}

/**
 * Parst OCR-/Bon-Text (DE/CH) in Artikelzeilen.
 * Robust genug für typische Migros/Coop-Zeilen; unklare Zeilen werden verworfen.
 */
export function parseReceiptText(text: string, store?: StorePreset | string): ParsedReceipt {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const items: ReceiptLineItem[] = []
  let total: number | undefined

  for (const line of lines) {
    if (/^\d{1,2}[.:]\d{2}/.test(line)) continue
    if (/^(mwst|vat|rundung|retour|gutschein|cumulus|supercard)/i.test(line)) continue

    const totalMatch = line.match(TOTAL_RE)
    if (totalMatch) {
      total = parseMoney(totalMatch[1]!)
      continue
    }

    let qtyMatch = line.match(QTY_PRICE_RE)
    let leadingQty = false
    if (!qtyMatch) {
      const lead = line.match(LEADING_QTY_RE)
      if (lead) {
        qtyMatch = [lead[0]!, lead[2]!, lead[1]!, lead[3]!] as unknown as RegExpMatchArray
        leadingQty = true
      }
    }
    if (qtyMatch) {
      const rawName = cleanProductName(qtyMatch[1]!)
      const quantity = Number(qtyMatch[2])
      const priceToken = parseMoney(qtyMatch[3]!)
      if (!rawName || !Number.isFinite(priceToken) || priceToken <= 0) continue
      // „Name 2 x 1.80“ → 1.80 ist Stückpreis; „4 x Name 7.20“ → 7.20 ist Zeilentotal.
      const unitPrice = leadingQty ? Math.round((priceToken / quantity) * 100) / 100 : priceToken
      const price = leadingQty ? priceToken : Math.round(unitPrice * quantity * 100) / 100
      const category = normalizeCategory(guessCategory(rawName))
      items.push({
        name: rawName,
        amount: toAmount(quantity),
        category,
        price,
        unitPrice,
        quantity,
      })
      continue
    }

    const amountPrice = line.match(NAME_AMOUNT_PRICE_RE)
    if (amountPrice) {
      const rawName = cleanProductName(amountPrice[1]!)
      const pack = amountPrice[2]!.replace(/\s+/g, ' ').trim()
      const price = parseMoney(amountPrice[3]!)
      if (!rawName || price <= 0) continue
      items.push({
        name: rawName,
        amount: pack,
        category: normalizeCategory(guessCategory(rawName)),
        price,
      })
      continue
    }

    const priceOnly = line.match(NAME_PRICE_RE)
    if (priceOnly) {
      const rawName = cleanProductName(priceOnly[1]!)
      const price = parseMoney(priceOnly[2]!)
      if (!rawName || rawName.length < 2 || price <= 0) continue
      if (/^(total|summe|mwst|subtotal)/i.test(rawName)) {
        total = price
        continue
      }
      items.push({
        name: rawName,
        amount: '',
        category: normalizeCategory(guessCategory(rawName)),
        price,
      })
    }
  }

  return {
    store: store || undefined,
    items,
    total,
    rawText: text,
  }
}

/** Versucht JSON aus Claude-Bon-Import zu lesen. */
export function parseReceiptJson(text: string): ParsedReceipt | null {
  try {
    const data = JSON.parse(text) as {
      store?: string
      total?: number
      items?: Array<{
        name?: string
        amount?: string
        category?: string
        price?: number
        unitPrice?: number
        quantity?: number
        wasSale?: boolean
      }>
    }
    if (!data || !Array.isArray(data.items)) return null
    const items: ReceiptLineItem[] = []
    for (const raw of data.items) {
      const name = String(raw.name || '').trim()
      const price = Number(raw.price)
      if (!name || !Number.isFinite(price) || price <= 0) continue
      items.push({
        name,
        amount: String(raw.amount || '').trim(),
        category: normalizeCategory(String(raw.category || guessCategory(name))),
        price: Math.round(price * 100) / 100,
        unitPrice: raw.unitPrice,
        quantity: raw.quantity,
        wasSale: raw.wasSale,
      })
    }
    if (!items.length) return null
    return {
      store: data.store,
      total: data.total,
      items,
      rawText: text,
    }
  } catch {
    return null
  }
}

export function parseReceiptInput(text: string, store?: string): ParsedReceipt {
  const trimmed = text.trim()
  if (!trimmed) return { items: [], rawText: '' }
  const asJson = parseReceiptJson(trimmed)
  if (asJson) {
    return { ...asJson, store: asJson.store || store }
  }
  return parseReceiptText(trimmed, store)
}
