import { Icon } from './Icon'
import { ProduceWeightInput } from './ProduceWeightInput'
import { ICON_PATHS } from '@/constants/icons'
import { shouldUseExactProduceWeight } from '@/utils/producePrice'
import type { ShoppingItem } from '@/types'

interface ItemAmountColumnProps {
  item: ShoppingItem
  showStepper: boolean
  onAdjustAmount: (item: ShoppingItem, direction: 1 | -1) => void
  onProduceWeightChange?: (item: ShoppingItem, amount: string) => void
  /** Kachel-Ansicht: helle Buttons auf farbigem Grund */
  variant?: 'row' | 'tile'
  accentColor?: string
}

export function ItemAmountColumn({
  item,
  showStepper,
  onAdjustAmount,
  onProduceWeightChange,
  variant = 'row',
  accentColor,
}: ItemAmountColumnProps) {
  const useProduceWeight =
    !item.done && shouldUseExactProduceWeight(item.category, item.amount) && !!onProduceWeightChange

  if (!item.amount && !showStepper && !useProduceWeight) return null

  if (useProduceWeight) {
    return (
      <ProduceWeightInput
        amount={item.amount}
        compact
        onChange={(amount) => onProduceWeightChange(item, amount)}
      />
    )
  }

  const isTile = variant === 'tile'
  const textColor = isTile ? accentColor : 'var(--text-muted)'
  const stepBg = isTile ? 'rgba(255,255,255,0.22)' : 'var(--chip-bg)'
  const stepFg = isTile ? accentColor : 'var(--text)'
  const btnSize = isTile ? 'h-6 w-6' : 'h-7 w-7'
  const iconSize = isTile ? 12 : 13

  if (showStepper) {
    return (
      <div
        className="flex flex-none items-center gap-1"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={`tap-scale flex ${btnSize} items-center justify-center rounded-full`}
          style={{ background: stepBg, color: stepFg }}
          onClick={() => onAdjustAmount(item, -1)}
          aria-label={`${item.name} Menge verringern`}
        >
          <Icon path={ICON_PATHS.minus} size={iconSize} />
        </button>
        <span
          className="min-w-[2.75rem] text-right text-[13px] font-semibold tabular-nums"
          style={{ color: isTile ? accentColor : 'var(--text)' }}
        >
          {item.amount}
        </span>
        <button
          className={`tap-scale flex ${btnSize} items-center justify-center rounded-full`}
          style={{ background: stepBg, color: stepFg }}
          onClick={() => onAdjustAmount(item, 1)}
          aria-label={`${item.name} Menge erhöhen`}
        >
          <Icon path={ICON_PATHS.plus} size={iconSize} />
        </button>
      </div>
    )
  }

  return (
    <span
      className="flex-none text-right text-[12px] font-medium tabular-nums"
      style={{ color: textColor, opacity: isTile ? 0.85 : 0.9 }}
    >
      {item.amount}
    </span>
  )
}
