interface PdfTextItem {
  str: string
  transform: number[]
  width: number
  height: number
}

/** PDF content order is not reading order: amounts can precede their product labels. */
export function receiptPdfText(items: unknown[]): string {
  const positioned = items
    .filter(
      (item): item is PdfTextItem =>
        !!item &&
        typeof item === 'object' &&
        'str' in item &&
        typeof item.str === 'string' &&
        'transform' in item &&
        Array.isArray(item.transform)
    )
    .filter((item) => item.str.trim())
  const lines: Array<{ y: number; height: number; items: PdfTextItem[] }> = []
  for (const item of positioned.sort((a, b) => b.transform[5]! - a.transform[5]!)) {
    const y = item.transform[5]!
    const height = Math.abs(item.height || item.transform[3]! || 10)
    const line = lines.find((line) => Math.abs(line.y - y) <= Math.min(3, height * 0.25, line.height * 0.25))
    if (line) line.items.push(item)
    else lines.push({ y, height, items: [item] })
  }
  return lines
    .map((line) => {
      const sorted = line.items.sort((a, b) => a.transform[4]! - b.transform[4]!)
      return sorted
        .map((item, index) => {
          const previous = sorted[index - 1]
          // Keep separate table cells readable, while retaining words split into glyphs.
          const gap = previous ? item.transform[4]! - previous.transform[4]! - previous.width : 0
          return `${previous && gap > Math.max(0.5, line.height * 0.12) ? ' ' : ''}${item.str}`
        })
        .join('')
        .trim()
    })
    .filter(Boolean)
    .join('\n')
}
