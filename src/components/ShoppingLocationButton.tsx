import { useStore } from '@/store/useStore'
import { locationForList } from '@/store/shoppingLocation'

export function ShoppingLocationButton({
  onClick,
  showRoute = false,
}: {
  onClick: () => void
  showRoute?: boolean
}) {
  const list = useStore((s) => s.activeList())
  const settings = useStore((s) => s.settings)
  const stores = useStore((s) => s.retailStores)
  const session = useStore((s) => s.shoppingSession)
  if (!list) return null
  const current = session?.listId === list.id ? session : null
  const store =
    stores.find((store) => store.id === current?.storeId) ?? locationForList(settings, stores, list)
  const unassigned = !!current?.checkedItemIds.length && !current.store
  return (
    <button
      className="mb-3 flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left"
      style={{ background: 'var(--surface)' }}
      onClick={onClick}
      aria-label="Einkaufsort ändern"
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold">
          {unassigned
            ? 'Einkaufsort wählen'
            : `${store.country === 'CH' ? 'Schweiz' : 'Deutschland'} · ${current?.store ?? store.name}${showRoute ? ' · Laufweg' : ''}`}
        </span>
        <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
          Preise in {current?.currency ?? store.currency} ·{' '}
          {unassigned ? 'Abgehakte Artikel nachträglich zuordnen' : 'Land und Geschäft ändern'}
        </span>
      </span>
      <span aria-hidden="true" style={{ color: 'var(--accent)' }}>
        ▾
      </span>
    </button>
  )
}
