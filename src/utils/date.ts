/** YYYY-MM-DD im lokalen Zeitzonen-Kontext (zeitzonensicherer als toISOString). */
export function todayKey(): string {
  return new Date().toLocaleDateString('sv-SE')
}
