import { parseRecipeText } from './recipe'
import type { CustomProduct } from '@/types'

export function normalizeListInput(text: string, custom: CustomProduct[] = []): string {
  const value = text.trim()
  if (value.length > 1024 * 1024) throw new Error('Die Liste ist zu groß (maximal 1 MB).')
  if (!value) return ''
  if (value.startsWith('{')) return value
  if (value.startsWith('[')) {
    try {
      return JSON.stringify({ items: JSON.parse(value) })
    } catch {
      return value
    }
  }
  const items = parseRecipeText(value, custom)
  if (!items.length) throw new Error('Keine Artikel erkannt. Bitte eine Liste oder gültiges JSON einfügen.')
  return JSON.stringify({ items })
}
