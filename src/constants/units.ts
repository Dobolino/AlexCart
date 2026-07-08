/** Verfügbare Mengeneinheiten. Neue Einheiten können hier einfach ergänzt werden. */
export const UNITS: string[] = [
  'g',
  'Stück',
  'kg',
  'ml',
  'l',
  'Dose',
  'Packung',
  'Flasche',
  'Bund',
  'Becher',
  'Glas',
  'Tube',
  'Rolle',
]

export const DEFAULT_UNIT = 'g'

/** Sinnvolle Standard-Einheit je Icon-Schlüssel, z.B. Eier -> Stück, TK-Ware -> Packung.
 *  Deckt nicht jeden Schlüssel ab - unbekannte fallen auf DEFAULT_UNIT zurück. */
const DEFAULT_UNIT_BY_ICON: Record<string, string> = {
  // Stückgut: Obst, Gemüse, Backwaren, die man einzeln kauft/zählt
  ei: 'Stück',
  apfel: 'Stück',
  birne: 'Stück',
  banane: 'Stück',
  orange: 'Stück',
  zitrone: 'Stück',
  kiwi: 'Stück',
  avocado: 'Stück',
  gurke: 'Stück',
  zucchini: 'Stück',
  paprika: 'Stück',
  chili: 'Stück',
  aubergine: 'Stück',
  mango: 'Stück',
  pfirsich: 'Stück',
  pflaume: 'Stück',
  aprikose: 'Stück',
  granatapfel: 'Stück',
  feige: 'Stück',
  dattel: 'Stück',
  blumenkohl: 'Stück',
  kuerbis: 'Stück',
  melone: 'Stück',
  wassermelone: 'Stück',
  ananas: 'Stück',
  fenchel: 'Stück',
  sellerie: 'Stück',
  pastinake: 'Stück',
  zwiebel: 'Stück',
  knoblauch: 'Stück',
  salat: 'Stück',
  kohl: 'Stück',
  lauch: 'Stück',
  brot: 'Stück',
  broetchen: 'Stück',
  gebaeck: 'Stück',
  bagel: 'Stück',
  muffin: 'Stück',
  tofu: 'Stück',
  schokolade: 'Stück',
  kerze: 'Stück',
  schwamm: 'Stück',

  // Bund: Kräuter/Wurzelgemüse, das gebündelt verkauft wird
  radieschen: 'Bund',
  spargel: 'Bund',
  rhabarber: 'Bund',
  kraeuter: 'Bund',

  // Verpackt: Trockenware, Tiefkühl, Drogerie/Haushalt, Tierbedarf
  tiefkuehl: 'Packung',
  nudeln: 'Packung',
  reis: 'Packung',
  kekse: 'Packung',
  mueesli: 'Packung',
  chips: 'Packung',
  riegel: 'Packung',
  suessigkeit: 'Packung',
  backzutat: 'Packung',
  gewuerzmischung: 'Packung',
  samen: 'Packung',
  trockenfrucht: 'Packung',
  nuss: 'Packung',
  tee: 'Packung',
  kaffee: 'Packung',
  hygiene: 'Packung',
  papier: 'Packung',
  folie: 'Packung',
  beutel: 'Packung',
  reiniger: 'Packung',
  pflege: 'Packung',
  zahnpflege: 'Packung',
  rasur: 'Packung',
  hundefutter: 'Packung',
  katzenfutter: 'Packung',
  katzenstreu: 'Packung',
  tierleckerli: 'Packung',
  voegelfutter: 'Packung',
  batterie: 'Packung',
  medikament: 'Packung',
  proteinpulver: 'Packung',
  edamame: 'Packung',
  sprossen: 'Packung',
  nori: 'Packung',
  reispapier: 'Packung',
  erstehilfe: 'Packung',

  // Flüssigkeiten
  milch: 'l',
  wasser: 'l',
  saft: 'l',
  ol: 'ml',
  wein: 'Flasche',
  bier: 'Flasche',
  sekt: 'Flasche',
  spirituose: 'Flasche',
  essig: 'Flasche',
  sirup: 'Flasche',
  milchshake: 'Flasche',
  smoothie: 'Flasche',
  getraenk: 'Flasche',

  // Sonstige Gefäße
  dose: 'Dose',
  mais: 'Dose',
  sauce: 'Glas',
  aufstrich: 'Glas',
  honig: 'Glas',
  wuerzpaste: 'Tube',
  joghurt: 'Becher',
  sahne: 'Becher',
}

export function getDefaultUnitForCategory(category: string): string {
  if (category === 'Getränke' || category === 'Milch & Käse') return 'l'
  if (category === 'Brot & Backwaren' || category === 'Früchte & Gemüse') return 'Stück'
  if (category === 'Tiefkühl' || category === 'Getreide & Beilagen') return 'Packung'
  if (category === 'Fleisch & Fisch') return 'g'
  if (
    category === 'Haushalt & Reinigung' ||
    category === 'Drogerie & Kosmetik' ||
    category === 'Tierbedarf' ||
    category === 'Süßes & Snacks'
  ) {
    return 'Packung'
  }
  return DEFAULT_UNIT
}

export function getDefaultUnit(iconKey: string, category?: string): string {
  return DEFAULT_UNIT_BY_ICON[iconKey] ?? (category ? getDefaultUnitForCategory(category) : DEFAULT_UNIT)
}
