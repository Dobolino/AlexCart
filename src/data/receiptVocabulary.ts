import { BRAND_CATALOG, findRetailer, brandSearchKey } from './retailCatalog'
import { normalize } from '@/utils/text'
import { fingerprint } from '@/utils/fingerprint'
import { baseQuantity } from '@/utils/quantity'

export interface ReceiptAlias {
  key: string
  retailer: string
  label: string
  amountKey: string
  name: string
  category: string
  brandName?: string
}
const fold = (value: string) => normalize(value).replace(/ß/g, 'ss')
/** Canonical synonym listed in the public Open Food Facts brands taxonomy. */
export const receiptBrandKey = (name: string) => {
  const key = brandSearchKey(name)
  return key === 'monsterenergy' ? 'monster' : key
}
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
export const receiptRetailerKey = (store: string | undefined, currency: string) =>
  `${currency}:${findRetailer(store ?? '')?.id ?? fold(store ?? '')}`
export function receiptAmountKey(amount: string, weighed?: boolean) {
  if (weighed) return 'weighed'
  const quantity = baseQuantity(amount)
  return quantity && quantity.unit !== 'piece' ? `${quantity.unit}:${quantity.value}` : 'count'
}
export function receiptAliasKey(retailer: string, label: string, amountKey: string) {
  return fingerprint([retailer, fold(label), amountKey])
}

// Receipt abbreviations are not manufacturer ownership rules. Generic labels such as Bio,
// IP-SUISSE, MSC, "Migros" or a lone "M" do not identify a product brand.
const abbreviations: Array<{ brand: string; prefix: RegExp; retailers?: string[] }> = [
  { brand: 'M-Budget', prefix: /^m[- .]?(?:budget|budg?)(?:\b|(?=[A-Z]))[ .-]*/i, retailers: ['migros'] },
  { brand: 'M Classic', prefix: /^m[- .]?class?(?:ic)?\b[ .-]*/i, retailers: ['migros'] },
  { brand: 'Migros Bio', prefix: /^m[- .]?bio\b[ .-]*/i, retailers: ['migros'] },
  { brand: 'Gut & Günstig', prefix: /^g\s*&\s*g[ .-]*/i, retailers: ['edeka', 'marktkauf'] },
  { brand: 'Edeka Herzstücke', prefix: /^herz(?:st(?:ue|ü)cke)?[. ]+/i, retailers: ['edeka', 'marktkauf'] },
  { brand: 'Edeka Bio', prefix: /^(?:bio\s+e\.|bioe\b)[ .-]*/i, retailers: ['edeka', 'marktkauf'] },
  { brand: 'YOU', prefix: /^YOU\s+/, retailers: ['migros'] },
  { brand: 'Edeka Genussmomente', prefix: /^e\.gen\.[ .]*/i, retailers: ['edeka', 'marktkauf'] },
  { brand: 'Elkos', prefix: /^e\.elk\.[ .]*/i, retailers: ['edeka', 'marktkauf'] },
  { brand: 'Ben & Jerry’s', prefix: /^(?:b\s*&\s*j|ben\s*&\s*jerr[yi][’'s]*)[ .]*/i },
  { brand: 'Alnatura', prefix: /^(?:bio\s+)?alna(?:tura)?\.[ .]*/i },
  { brand: 'Gervais', prefix: /^gervai[s.]\s*/i },
  { brand: 'Listerine', prefix: /^list\.[ .]*/i },
  { brand: 'Gustavo Gusto', prefix: /^(?:g\.gusto?|gustavo\s+gust\.?)[ .]*/i },
  { brand: 'Kikkoman', prefix: /^kikkom\.[ .]*/i },
  { brand: 'Kerrygold', prefix: /^kerryg\.[ .]*/i },
  { brand: 'Schöller', prefix: /^schoell\.[ .]*/i },
  { brand: 'Dr. Pepper', prefix: /^dr\.pepp?\.[ .]*/i },
  { brand: 'La Baleine', prefix: /^l\.ba\.[ .]*/i },
  { brand: 'Ritter Sport', prefix: /^r\.sport\b[ .]*/i },
  { brand: 'Cottonelle', prefix: /^cott\.[ .]*/i },
  { brand: 'Zentis', prefix: /^zent\.[ .]*/i },
  { brand: 'Ostmann', prefix: /^ostm\.[ .]*/i },
  { brand: 'Garnier', prefix: /^garn\.[ .]*/i },
  { brand: 'Nivea', prefix: /^niv\.[ .]*/i },
  { brand: 'Lotus Biscoff', prefix: /^lotus\s+biscoff\b[ .]*/i },
  { brand: 'Lamate', prefix: /^(?:migros\s+)?lamate\b[ .]*/i },
]
const genericBrands = BRAND_CATALOG.filter(
  (brand) => brand.name.length >= 3 && !['Extra', 'YOU', 'Migros Bio'].includes(brand.name)
)
  .sort((a, b) => b.name.length - a.name.length)
  .map((brand) => ({
    ...brand,
    expression: new RegExp(
      `^${escape(fold(brand.name)).replace(/\\ /g, '\\s+')}(?=[\\s.,:;-]|$)[\\s.,:;-]*`,
      'i'
    ),
  }))
const translations: Array<[RegExp, string]> = [
  [/^cottage\s*(?:cheese)?\s*schnitt$/i, 'Hüttenkäse Schnittlauch'],
  [/^cottage\s+cheese$/i, 'Hüttenkäse'],
  [/^k\.frischkaese$/i, 'Körniger Frischkäse'],
  [/^frischkaese$/i, 'Frischkäse'],
  [/^fr\.jogh\.erdb\.?$/i, 'Fruchtjoghurt Erdbeere'],
  [/^hae(?:hnchen)?\.?(?:brustfilet|brust|brus\.)$/i, 'Hähnchenbrustfilet'],
  [/^tor\.chips\s+pap\.?$/i, 'Tortilla Chips Paprika'],
  [/^huett\.kaese$/i, 'Hüttenkäse'],
  [/^kult\.heidelb\.?$/i, 'Kulturheidelbeeren'],
  [/^h-mil\.(.*)$/i, 'H-Milch $1'],
  [/^sch\.bonbons$/i, 'Schokoladenbonbons'],
]
export function recognizeReceiptLabel(
  label: string,
  retailer: string,
  aliases: ReceiptAlias[] = [],
  amount = '',
  weighed = false
) {
  const amountKey = receiptAmountKey(amount, weighed)
  const learned = aliases.find((entry) => entry.key === receiptAliasKey(retailer, label, amountKey))
  if (learned)
    return {
      name: learned.name,
      brandName: learned.brandName,
      category: learned.category,
      source: 'remembered' as const,
    }
  const retailerId = retailer.split(':').slice(1).join(':')
  const short = abbreviations.find(
    (entry) => (!entry.retailers || entry.retailers.includes(retailerId)) && entry.prefix.test(label)
  )
  const full =
    !short &&
    genericBrands.find(
      (entry) =>
        (!entry.retailerIds.length || entry.retailerIds.includes(retailerId)) &&
        entry.expression.test(fold(label))
    )
  const brandName = short?.brand ?? (full ? full.name : undefined)
  let name = short
    ? label.replace(short.prefix, '').trim()
    : full
      ? label.slice(fold(label).match(full.expression)![0].length).trim()
      : label
  for (const [expression, replacement] of translations)
    if (expression.test(name)) {
      name = name.replace(expression, replacement)
      break
    }
  if (brandName === 'Monster' && /^ultra\b/i.test(name)) name = `Energy ${name}`
  return {
    name: name || label,
    brandName,
    category: undefined,
    source: brandName ? ('explicit' as const) : ('none' as const),
  }
}

/** Candidates require a click; a common brand alone never proves that two variants are identical. */
export function receiptNameScore(receipt: string, item: string, retailer: string) {
  const canonical = (value: string) =>
    fold(recognizeReceiptLabel(value, retailer).name)
      .replace(/cottage cheese/g, 'huttenkase')
      .replace(/broccoli/g, 'brokkoli')
      .replace(/ruebli|rüebli|karotten/g, 'karotte')
      .replace(/clem(?:entine|entinen)?\.?/g, 'mandarinen')
      .replace(/kurbis oranger knirps/, 'hokkaido kurbis')
      .replace(/pouletbrust|hahnchenbrust(?:filet)?/, 'poulet brust')
      .replace(/^(?:extra|fairtrade|bio)\s+/, '')
      .replace(/\s+mit blatt$/, '')
  const a = canonical(receipt),
    b = canonical(item)
  if (a === b) return 1
  const words = (value: string) => new Set(value.split(/[^\p{L}\p{N}]+/u).filter((word) => word.length >= 3))
  const x = words(a),
    y = words(b),
    common = [...x].filter((word) => y.has(word)).length
  if (!common) return 0
  return common / Math.max(x.size, y.size)
}
