export function shoppingProgressPercent(done: number, total: number): number {
  if (total <= 0) return 0
  return Math.round((done / total) * 100)
}

export function formatShoppingProgress(done: number, total: number): string {
  const percent = shoppingProgressPercent(done, total)
  const productLabel = total === 1 ? 'Produkt' : 'Produkte'
  return `${done} / ${total} ${productLabel} gekauft • ${percent}%`
}

/** Nächste Kategorie mit offenen Artikeln nach Abschluss der aktuellen. */
export function nextOpenCategory(
  categories: string[],
  completedCategory: string
): string | null {
  const index = categories.indexOf(completedCategory)
  if (index < 0) return categories[0] ?? null
  return categories[index + 1] ?? null
}
