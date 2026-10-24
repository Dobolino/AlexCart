/** Canonical GTIN-14 identity. UPC-E needs expansion before using this function. */
export function normalizeGtin(raw: string): string | null {
  const value = raw.replace(/[\s-]/g, '')
  if (!/^(?:\d{8}|\d{12}|\d{13}|\d{14})$/.test(value)) return null
  let sum = 0
  for (let i = value.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3)
    sum += Number(value[i]) * weight
  if ((10 - (sum % 10)) % 10 !== Number(value[value.length - 1])) return null
  // Retailer-specific EAN prefixes must not become global catalog identities.
  if (value.length === 13 && /^2\d/.test(value)) return null
  return value.padStart(14, '0')
}

export function expandUpce(raw: string): string | null {
  if (!/^[01]\d{7}$/.test(raw)) return null
  const [system, a, b, c, d, e, last, check] = raw.split('')
  if ('012'.includes(last!)) return `${system}${a}${b}${last}0000${c}${d}${e}${check}`
  if (last === '3') return `${system}${a}${b}${c}00000${d}${e}${check}`
  if (last === '4') return `${system}${a}${b}${c}${d}00000${e}${check}`
  return `${system}${a}${b}${c}${d}${e}0000${last}${check}`
}
