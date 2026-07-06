import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Rendert fixed/overlays auf document.body – außerhalb von framer-motion transform-Vorfahren (iOS-Safari). */
export function FloatingPortal({ children }: { children: ReactNode }) {
  return createPortal(children, document.body)
}
