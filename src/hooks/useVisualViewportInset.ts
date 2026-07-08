import { useEffect, useState } from 'react'

/** Hält Sheets über der iOS-Tastatur (Visual Viewport API). */
export function useVisualViewportInset() {
  const [inset, setInset] = useState(() => ({
    bottom: 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  }))

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      setInset({
        bottom: Math.max(0, window.innerHeight - vv.height - vv.offsetTop),
        height: vv.height,
      })
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
