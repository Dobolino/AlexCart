import { useEffect } from 'react'
import { useStore } from '@/store/useStore'
import { themeColorFor } from '@/constants/theme'

function resolveTheme(theme: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (theme !== 'system') return theme
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme() {
  const theme = useStore((s) => s.settings.theme)

  useEffect(() => {
    const apply = () => {
      const resolved = resolveTheme(theme)
      document.documentElement.dataset.theme = resolved
      document.documentElement.style.colorScheme = resolved
      const meta = document.querySelector('meta[name="theme-color"]')
      if (meta) meta.setAttribute('content', themeColorFor(resolved))
    }
    apply()

    if (theme === 'system') {
      const mql = window.matchMedia('(prefers-color-scheme: dark)')
      mql.addEventListener('change', apply)
      return () => mql.removeEventListener('change', apply)
    }
  }, [theme])
}
