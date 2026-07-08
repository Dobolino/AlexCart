import { normalize } from './text'
import { parseAmount, joinAmount } from './amount'
import { searchProducts } from './search'
import { normalizeCategory } from './icon'
import type { CustomProduct, ImportItemPayload } from '@/types'

const SKIP_LINE =
  /^(zutaten|ingredients|ingredient|anleitung|instructions|zubereitung|directions|method|servings|portionen|für\s+\d|for\s+\d|\d+\s*(personen|portions?|servings?))/i

const UNITS =
  'g|kg|ml|l|cl|dl|EL|TL|Stück|Stk|Dose|Packung|Bund|Becher|Glas|Flasche|Prise|Tasse|Zehe|Scheibe|x|×'

export function parseRecipeLine(line: string): ImportItemPayload | null {
  const text = line
    .replace(/^\s*[-*•·]\s*/, '')
    .replace(/^\s*\d+[.)]\s*/, '')
    .trim()

  if (!text || text.length < 2) return null
  if (SKIP_LINE.test(text)) return null
  if (/^#{1,6}\s/.test(text)) return null

  const amountFirst = text.match(
    new RegExp(`^(\\d+(?:[.,]\\d+)?)(?:\\s*(?:${UNITS}))?\\s+(.+)$`, 'iu')
  )
  if (amountFirst) {
    const unitMatch = text.match(
      new RegExp(`^(\\d+(?:[.,]\\d+)?)\\s*(${UNITS})\\s+(.+)$`, 'iu')
    )
    if (unitMatch) {
      return {
        name: unitMatch[3]!.trim(),
        amount: joinAmount(unitMatch[1]!.replace(',', '.'), unitMatch[2]!),
      }
    }
    return { name: amountFirst[2]!.trim(), amount: amountFirst[1]!.replace(',', '.') }
  }

  const parsed = parseAmount(text)
  if (parsed) {
    const withoutAmount = text.replace(/^(\d+(?:[.,]\d+)?)\s*\S*\s*/, '').trim()
    if (withoutAmount.length >= 2) {
      return {
        name: withoutAmount,
        amount: parsed.unit ? joinAmount(String(parsed.value), parsed.unit) : String(parsed.value),
      }
    }
  }

  if (text.length >= 2 && !/^\d+$/.test(text)) {
    return { name: text, amount: '' }
  }

  return null
}

export function parseRecipeText(text: string, customProducts: CustomProduct[] = []): ImportItemPayload[] {
  const items: ImportItemPayload[] = []
  const seen = new Set<string>()

  for (const rawLine of text.split(/\r?\n/)) {
    const parsed = parseRecipeLine(rawLine)
    if (!parsed) continue

    const key = normalize(parsed.name)
    if (!key || seen.has(key)) continue
    seen.add(key)

    const hit = searchProducts(parsed.name, customProducts, 1)[0]
    items.push({
      name: parsed.name,
      amount: parsed.amount || hit?.amount || '',
      category: normalizeCategory(hit?.category || 'Sonstiges'),
    })
  }

  return items
}
