import { normalize } from './text'
import { PRODUCTS } from '@/data/products'
import { PRODUCT_ICON_PATHS } from '@/constants/productIcons'

const EXACT_INDEX = new Map<string, string>()
for (const p of PRODUCTS) {
  EXACT_INDEX.set(normalize(p.name), p.icon)
}

const CATEGORY_FALLBACK_ICON: Record<string, string> = {
  'fruchte & gemuse': 'gemuese',
  'milch & kase': 'kaese',
  'fleisch & fisch': 'fleisch',
  'getreide & beilagen': 'getreide',
  'brot & backwaren': 'brot',
  tiefkuhl: 'tiefkuehl',
  getranke: 'getraenk',
  sonstiges: 'default',
}

/** Bekannte Schreibweisen-Varianten für Zutatennamen (z.B. aus Essensplan-Imports). */
const PRODUCT_SYNONYMS: Record<string, string> = {
  krevetten: 'Garnelen',
  krevette: 'Garnelen',
  shrimps: 'Garnelen',
  shrimp: 'Garnelen',
  'gehackte tomaten': 'Passierte Tomaten',
  passata: 'Passierte Tomaten',
}

/** Letzte Instanz vor dem Kategorie-Fallback: grobe Schlüsselwort-Erkennung im Namen. */
const ICON_KEYWORDS: [string, string][] = [
  ['krevette', 'garnelen'],
  ['garnelen', 'garnelen'],
  ['shrimp', 'garnelen'],
  ['lachs', 'fisch'],
  ['forelle', 'fisch'],
  ['thunfisch', 'fisch'],
  ['fisch', 'fisch'],
  ['tomate', 'tomate'],
  ['reis', 'reis'],
  ['milch', 'milch'],
  ['brot', 'brot'],
]

/** Import-Kategorienamen (z.B. aus dem urspr. Essensplan-Format) auf die Produkt-DB-Kategorien abbilden. */
const CATEGORY_ALIASES: Record<string, string> = {
  'obst & gemuse': 'Früchte & Gemüse',
  'fruchte & gemuse': 'Früchte & Gemüse',
  milchprodukte: 'Milch & Käse',
  'milch & kase': 'Milch & Käse',
  'getreide & backwaren': 'Getreide & Beilagen',
  'getreide & beilagen': 'Getreide & Beilagen',
  'brot & backwaren': 'Brot & Backwaren',
  'fleisch & fisch': 'Fleisch & Fisch',
  tiefkuhl: 'Tiefkühl',
  getranke: 'Getränke',
  sonstiges: 'Sonstiges',
}

export function normalizeCategory(category: string): string {
  const key = normalize(category)
  return CATEGORY_ALIASES[key] || category || 'Sonstiges'
}

function guessIconFromName(name: string): string | null {
  const n = normalize(name)
  for (const [keyword, icon] of ICON_KEYWORDS) {
    if (n.includes(keyword)) return icon
  }
  return null
}

/** 4-Stufen-Fallback: 1) exakter Produkt-Match (inkl. Synonyme) 2) Substring-Match
 *  3) Schlüsselwort-Erkennung 4) Kategorie-Icon, sonst Default (Einkaufswagen). */
export function getIconKey(name: string, category: string): string {
  const n = normalize(name)

  const exact = EXACT_INDEX.get(n)
  if (exact) return exact

  const synonym = PRODUCT_SYNONYMS[n]
  if (synonym) {
    const synonymMatch = EXACT_INDEX.get(normalize(synonym))
    if (synonymMatch) return synonymMatch
  }

  let best: string | null = null
  let bestLen = 0
  for (const p of PRODUCTS) {
    const pn = normalize(p.name)
    if ((n.includes(pn) || pn.includes(n)) && pn.length > bestLen) {
      best = p.icon
      bestLen = pn.length
    }
  }
  if (best) return best

  const guessed = guessIconFromName(name)
  if (guessed) return guessed

  const catKey = normalize(normalizeCategory(category))
  if (CATEGORY_FALLBACK_ICON[catKey]) return CATEGORY_FALLBACK_ICON[catKey]

  return 'default'
}

export function getIconSvgPath(key: string): string {
  return PRODUCT_ICON_PATHS[key] || PRODUCT_ICON_PATHS.default
}
