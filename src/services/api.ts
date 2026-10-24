export function apiBase(configured = ''): string {
  if (!configured.trim()) return `${window.location.origin}/api`
  const url = new URL(configured)
  if (
    url.protocol !== 'https:' &&
    !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))
  )
    throw new Error('Bitte eine HTTPS-Serveradresse angeben.')
  if (url.username || url.password || url.search || url.hash)
    throw new Error('Serveradresse ohne Zugangsdaten oder URL-Parameter angeben.')
  return url.href.replace(/\/$/, '')
}
export async function apiRequest<T>(base: string, path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${base}${path}`, {
    ...options,
    signal: options.signal ?? AbortSignal.timeout(10000),
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null
    throw new Error(payload?.error ?? `Server nicht erreichbar (${response.status}).`)
  }
  return response.json() as Promise<T>
}
