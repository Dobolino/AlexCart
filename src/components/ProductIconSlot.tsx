import type { CSSProperties } from 'react'
import { SHOW_PRODUCT_ICONS } from '@/constants/features'
import { ProductIcon } from '@/components/product-icons/ProductIcon'

interface ProductIconSlotProps {
  iconKey: string
  size?: number
  className?: string
  /** Optionaler Wrapper für Kachel-Ansicht (farbiger Kreis). */
  wrapClassName?: string
  wrapStyle?: CSSProperties
}

/** Reservierter Platz für zukünftige Produkt-Icons – aktuell per Feature-Flag ausblendbar. */
export function ProductIconSlot({ iconKey, size = 20, className, wrapClassName, wrapStyle }: ProductIconSlotProps) {
  if (!SHOW_PRODUCT_ICONS) return null

  const icon = <ProductIcon iconKey={iconKey} size={size} className={className} />

  if (wrapClassName || wrapStyle) {
    return (
      <span className={wrapClassName} style={wrapStyle}>
        {icon}
      </span>
    )
  }

  return icon
}
