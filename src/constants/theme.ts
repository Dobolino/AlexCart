/** Einheitliche Theme-Farben für CSS, Meta-Tags und PWA-Manifest. */
export const THEME_COLORS = {
  light: { bg: '#f2f2f7', themeColor: '#f2f2f7' },
  dark: { bg: '#000000', themeColor: '#000000' },
} as const

export function themeColorFor(resolved: 'light' | 'dark'): string {
  return THEME_COLORS[resolved].themeColor
}
