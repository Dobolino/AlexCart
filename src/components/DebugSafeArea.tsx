import { useEffect, useRef, useState } from 'react'

/**
 * Temporary on-device diagnostic overlay for the iOS "black strip below the
 * nav pill" bug - screenshots alone can't tell us what env(safe-area-inset-bottom)
 * or the viewport actually resolve to on the affected device. Remove once diagnosed.
 */
export function DebugSafeArea() {
  const probeRef = useRef<HTMLDivElement>(null)
  const [info, setInfo] = useState('measuring…')

  useEffect(() => {
    const update = () => {
      const nav = document.querySelector('.nav-liquid')
      const shell = document.querySelector('.app-shell')
      const navRect = nav?.getBoundingClientRect()
      const shellRect = shell?.getBoundingClientRect()
      const probeBottom = probeRef.current ? getComputedStyle(probeRef.current).paddingBottom : '?'
      const vv = window.visualViewport
      setInfo(
        [
          `probeSafeBottom:${probeBottom}`,
          `innerH:${window.innerHeight}`,
          `vvH:${vv?.height?.toFixed(1)} vvOffTop:${vv?.offsetTop?.toFixed(1)}`,
          `screenH:${window.screen.height}`,
          `shellTop:${shellRect?.top.toFixed(1)} shellBottom:${shellRect?.bottom.toFixed(1)}`,
          `navTop:${navRect?.top.toFixed(1)} navBottom:${navRect?.bottom.toFixed(1)}`,
          `standalone:${(navigator as unknown as { standalone?: boolean }).standalone}`,
          `dpr:${window.devicePixelRatio}`,
        ].join(' | ')
      )
    }
    update()
    const t1 = setTimeout(update, 300)
    const t2 = setTimeout(update, 1200)
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    window.visualViewport?.addEventListener('scroll', update)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('scroll', update)
    }
  }, [])

  return (
    <>
      <div ref={probeRef} style={{ position: 'absolute', top: -9999, paddingBottom: 'env(safe-area-inset-bottom)' }} />
      <div
        style={{
          position: 'fixed',
          top: 4,
          left: 4,
          right: 4,
          zIndex: 99999,
          fontSize: 9,
          lineHeight: 1.3,
          fontFamily: 'monospace',
          color: '#0f0',
          background: 'rgba(0,0,0,0.75)',
          padding: '3px 5px',
          borderRadius: 4,
          pointerEvents: 'none',
          wordBreak: 'break-all',
        }}
      >
        {info}
      </div>
    </>
  )
}
