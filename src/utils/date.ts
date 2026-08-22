/** YYYY-MM-DD im lokalen Zeitzonen-Kontext (zeitzonensicherer als toISOString). */
export function todayKey(): string {
  return new Date().toLocaleDateString('sv-SE')
}

/** Timestamp → YYYY-MM-DD (lokal). */
export function timestampToDateKey(ms: number): string {
  return new Date(ms).toLocaleDateString('sv-SE')
}

/** YYYY-MM-DD → Timestamp (Mittag lokal, damit TZ-Umstellungen harmlos bleiben). */
export function dateKeyToTimestamp(dateKey: string, hour = 12): number {
  const [y, m, d] = dateKey.split('-').map(Number)
  if (!y || !m || !d) return Date.now()
  return new Date(y, m - 1, d, hour, 0, 0, 0).getTime()
}

/** Anzeige DD.MM.YYYY für date inputs / Labels. */
export function formatDateKeyDe(dateKey: string): string {
  const [y, m, d] = dateKey.split('-')
  if (!y || !m || !d) return dateKey
  return `${d}.${m}.${y}`
}

/** Bon-Datum aus OCR-Text (DD.MM.YYYY / DD.MM.YY). */
export function parseReceiptDate(text: string): string | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined

  const match =
    trimmed.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/) ||
    trimmed.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{2})\b/)
  if (!match) return undefined

  const day = Number(match[1])
  const month = Number(match[2])
  let year = Number(match[3])
  if (year < 100) year += year >= 70 ? 1900 : 2000
  if (day < 1 || day > 31 || month < 1 || month > 12) return undefined

  const date = new Date(year, month - 1, day)
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return undefined
  }
  return date.toLocaleDateString('sv-SE')
}

/** Erstes erkennbares Bon-Datum im Fliesstext. */
export function findReceiptDateInText(text: string): string | undefined {
  for (const line of text.split(/\r?\n/)) {
    const parsed = parseReceiptDate(line)
    if (parsed) return parsed
  }
  return parseReceiptDate(text)
}
