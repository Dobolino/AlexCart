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

/** Dezente Akzentfarbe pro Kategorie – erledigte Artikel bleiben bewusst grau. */
export function getCategoryColor(category: string, done = false): CategoryColor {
  if (done) return NEUTRAL
  return CATEGORY_COLORS[category] ?? NEUTRAL
}
