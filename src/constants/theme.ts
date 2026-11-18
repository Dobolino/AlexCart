/** Einheitliche Theme-Farben für CSS, Meta-Tags und PWA-Manifest. */
export const THEME_COLORS = {
  light: { bg: '#f5f4f0', themeColor: '#f5f4f0' },
  dark: { bg: '#17181c', themeColor: '#17181c' },
} as const

export function themeColorFor(resolved: 'light' | 'dark'): string {
  return THEME_COLORS[resolved].themeColor
}
