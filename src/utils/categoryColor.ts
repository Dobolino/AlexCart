export interface CategoryColor {
  bg: string
  fg: string
}

const NEUTRAL: CategoryColor = { bg: 'var(--chip-bg)', fg: 'var(--text-muted)' }

const CATEGORY_COLORS: Record<string, CategoryColor> = {
  'Früchte & Gemüse': { bg: 'var(--cat-fruits-bg)', fg: 'var(--cat-fruits-fg)' },
  'Milch & Käse': { bg: 'var(--cat-dairy-bg)', fg: 'var(--cat-dairy-fg)' },
  'Fleisch & Fisch': { bg: 'var(--cat-meat-bg)', fg: 'var(--cat-meat-fg)' },
  'Getreide & Beilagen': { bg: 'var(--cat-grains-bg)', fg: 'var(--cat-grains-fg)' },
  'Brot & Backwaren': { bg: 'var(--cat-bread-bg)', fg: 'var(--cat-bread-fg)' },
  Tiefkühl: { bg: 'var(--cat-frozen-bg)', fg: 'var(--cat-frozen-fg)' },
  Getränke: { bg: 'var(--cat-drinks-bg)', fg: 'var(--cat-drinks-fg)' },
  Sonstiges: NEUTRAL,
}

const CATEGORY_TILE_COLORS: Record<string, CategoryColor> = {
  'Früchte & Gemüse': { bg: '#c75b54', fg: '#ffffff' },
  'Milch & Käse': { bg: '#4a9a9a', fg: '#ffffff' },
  'Fleisch & Fisch': { bg: '#b85c4a', fg: '#ffffff' },
  'Getreide & Beilagen': { bg: '#b8863a', fg: '#ffffff' },
  'Brot & Backwaren': { bg: '#a67c52', fg: '#ffffff' },
  Tiefkühl: { bg: '#4a7eb8', fg: '#ffffff' },
  Getränke: { bg: '#5b7fb8', fg: '#ffffff' },
  Sonstiges: { bg: '#6b6b70', fg: '#ffffff' },
}

/** Dezente Akzentfarbe pro Kategorie – erledigte Artikel bleiben bewusst grau. */
export function getCategoryColor(category: string, done = false): CategoryColor {
  if (done) return NEUTRAL
  return CATEGORY_COLORS[category] ?? NEUTRAL
}

/** Volle Kachel-Farben für Bring!-Ansicht. */
export function getCategoryTileColor(category: string, done = false): CategoryColor {
  if (done) return { bg: 'var(--done-bg)', fg: 'var(--text-muted)' }
  return CATEGORY_TILE_COLORS[category] ?? CATEGORY_TILE_COLORS.Sonstiges
}
