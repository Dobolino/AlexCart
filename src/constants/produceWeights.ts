/**
 * Typisches Durchschnittsgewicht pro Stück für gängiges Obst/Gemüse, in Gramm.
 * Schlüssel = Icon-Key aus `getIconKey`. Dient nur der Kostenschätzung, wenn eine Menge
 * in Stück angegeben ist, aber ein Kilopreis vorliegt (das echte Gewicht wird beim Wiegen
 * an der Kasse erfasst). Werte sind bewusst runde Richtwerte.
 */
export const PRODUCE_PIECE_GRAMS: Record<string, number> = {
  // Obst
  apfel: 180,
  banane: 120,
  birne: 170,
  orange: 200,
  mandarine: 75,
  clementine: 75,
  zitrone: 100,
  limette: 60,
  kiwi: 90,
  avocado: 200,
  mango: 350,
  pfirsich: 150,
  nektarine: 140,
  aprikose: 50,
  pflaume: 60,
  granatapfel: 300,
  ananas: 1300,
  melone: 1500,
  wassermelone: 4000,
  kokosnuss: 400,
  // Gemüse
  kartoffel: 150,
  zwiebel: 110,
  karotte: 70,
  tomate: 100,
  gurke: 400,
  paprika: 160,
  zucchini: 300,
  aubergine: 250,
  brokkoli: 400,
  blumenkohl: 800,
  fenchel: 250,
  lauch: 200,
  sellerie: 400,
  mais: 300,
  kuerbis: 1200,
  salat: 300,
  knoblauch: 60,
  ingwer: 60,
}

/** Fallback, wenn kein spezifisches Stückgewicht bekannt ist. */
export const DEFAULT_PIECE_GRAMS = 150
