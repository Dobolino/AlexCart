import { parseAmount, parsePackAmount, priceQuantityFromAmount } from './amount'

export interface ListItemDisplay {
  /** z. B. "4×" – leer wenn Menge 1 oder nur Gewicht */
  countPrefix: string
  /** Packungs-/Stückgrösse oder Mengenlabel, z. B. "200 g", "Becher", "500 g" */
  detailLine: string
}

/**
 * Migros-ähnliche Anzeige: Anzahl als Präfix (4×), Packungsgrösse/Einheit in der Detailzeile.
 */
export function formatListItemDisplay(amount: string): ListItemDisplay {
  const trimmed = amount.trim()
  if (!trimmed) return { countPrefix: '', detailLine: '' }

  const pack = parsePackAmount(trimmed)
  if (pack) {
    const unit = pack.packUnit.trim()
    const detail = `${formatCompactNumber(pack.packValue)} ${unit}`.trim()
    return {
      countPrefix: pack.count > 1 ? `${pack.count}×` : '',
      detailLine: detail,
    }
  }

  const parsed = parseAmount(trimmed)
  if (!parsed) return { countPrefix: '', detailLine: trimmed }

  const qty = priceQuantityFromAmount(trimmed)
  const unit = parsed.unit.trim()
  const unitLower = unit.toLowerCase()

  const countUnits = new Set([
    'stück',
    'stk',
    'stck',
    'st',
    'packung',
    'packungen',
    'pack',
    'dose',
    'dosen',
    'becher',
    'flasche',
    'flaschen',
    'bund',
    'glas',
    'tube',
    'rolle',
    'rollen',
  ])

  if (countUnits.has(unitLower) && qty >= 1) {
    return {
      countPrefix: qty > 1 ? `${Math.round(qty)}×` : '',
      detailLine: unit || 'Stück',
    }
  }

  // Gewicht/Volumen ohne Multiplikator – volle Menge in der Detailzeile
  return {
    countPrefix: '',
    detailLine: trimmed,
  }
}

function formatCompactNumber(n: number): string {
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace('.', ',')
}
