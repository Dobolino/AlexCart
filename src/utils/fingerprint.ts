/** Content identity for duplicate import detection, not an authentication primitive. */
export function fingerprint(value: unknown): string {
  let hash = 14695981039346656037n
  for (const char of JSON.stringify(value))
    hash = BigInt.asUintN(64, (hash ^ BigInt(char.charCodeAt(0))) * 1099511628211n)
  return hash.toString(16)
}
