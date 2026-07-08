import { useStore } from '@/store/useStore'
import { buildQuickPicks } from '@/utils/quickAdd'
import { QuickAddRow } from '@/components/QuickAddRow'
import type { QuickPick } from '@/utils/quickAdd'

interface QuickAddSectionProps {
  onAdded?: (name: string) => void
}

export function QuickAddSection({ onAdded }: QuickAddSectionProps) {
  const list = useStore((s) => s.activeList())
  const lists = useStore((s) => s.lists)
  const customProducts = useStore((s) => s.customProducts)
  const addItemToActiveList = useStore((s) => s.addItemToActiveList)

  if (!list) return null

  const picks = buildQuickPicks(list, lists, customProducts)

  function handleAdd(pick: QuickPick) {
    addItemToActiveList({
      name: pick.name,
      amount: pick.amount,
      category: pick.category,
      note: pick.note,
    })
    onAdded?.(pick.name)
  }

  return <QuickAddRow picks={picks} onAdd={handleAdd} />
}
