import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { uid } from '@/utils/id'
import { importFromJSON } from '@/utils/import'
import { todayKey } from '@/utils/date'
import { normalizeCategory } from '@/utils/icon'
import { groupByCategory } from '@/utils/group'
import type {
  AppSettings,
  AppStats,
  CalculatorEntry,
  CustomProduct,
  ListViewMode,
  PantryItem,
  PurchaseLogEntry,
  ShoppingItem,
  ShoppingList,
  Theme,
} from '@/types'

const STORE_VERSION = 2
const STORE_NAME = 'alexshop-store'

/** localStorage kann auf iOS PWA hängen oder werfen – Fehler abfangen statt Boot-Loader. */
const safeStorage = {
  getItem: (name: string): string | null => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name: string, value: string): void => {
    try {
      localStorage.setItem(name, value)
    } catch {
      /* quota / private mode */
    }
  },
  removeItem: (name: string): void => {
    try {
      localStorage.removeItem(name)
    } catch {
      /* ignore */
    }
  },
}

function defaultSettings(): AppSettings {
  return { theme: 'system', listViewMode: 'tiles', hasSeenOnboarding: false }
}

function defaultPantry(): PantryItem[] {
  return [
    { id: uid(), name: 'Salz', category: 'Sonstiges' },
    { id: uid(), name: 'Pfeffer', category: 'Sonstiges' },
    { id: uid(), name: 'Olivenöl', category: 'Sonstiges' },
    { id: uid(), name: 'Reis', category: 'Getreide & Beilagen' },
    { id: uid(), name: 'Zucker', category: 'Sonstiges' },
    { id: uid(), name: 'Mehl', category: 'Getreide & Beilagen' },
  ]
}

function newList(name: string): ShoppingList {
  return { id: uid(), name, weekLabel: '', items: [], createdAt: Date.now() }
}

function defaultStats(): AppStats {
  return { listsCreated: 1, importsCount: 0, manualProductsCreated: 0, itemsAddedTotal: 0 }
}

/** Stabile Referenz für den "keine gefilterten Items" Fall – ein neues [] bei jedem Aufruf
 *  würde useSyncExternalStore glauben lassen, der Store ändere sich ständig (Endlosschleife). */
const EMPTY_ITEMS: ShoppingItem[] = []

/** Übernimmt Daten aus der alten Single-File-Version (falls vorhanden), damit bestehende Nutzer nichts verlieren. */
function readLegacyState(): { pantry: PantryItem[]; list: ShoppingList } | null {
  try {
    const legacyWeekRaw = localStorage.getItem('alexshop_week')
    const legacyPantryRaw = localStorage.getItem('alexshop_pantry')
    if (!legacyWeekRaw && !legacyPantryRaw) return null

    const legacyWeek = legacyWeekRaw ? JSON.parse(legacyWeekRaw) : { label: '', items: [] }
    const legacyPantry = legacyPantryRaw ? JSON.parse(legacyPantryRaw) : defaultPantry()

    const list = newList('Wocheneinkauf')
    list.weekLabel = legacyWeek.label || ''
    list.items = Array.isArray(legacyWeek.items) ? legacyWeek.items : []
    return { pantry: legacyPantry, list }
  } catch {
    return null
  }
}

interface FilteredEntry {
  listId: string
  items: ShoppingItem[]
}

interface AppState {
  lists: ShoppingList[]
  activeListId: string
  pantry: PantryItem[]
  customProducts: CustomProduct[]
  purchaseLog: PurchaseLogEntry[]
  stats: AppStats
  filtered: FilteredEntry[]
  settings: AppSettings
  calculatorEntries: CalculatorEntry[]

  activeList: () => ShoppingList | undefined
  filteredForActiveList: () => ShoppingItem[]

  importIntoActiveList: (text: string) => { ok: boolean; error?: string; keptCount?: number; filteredCount?: number }
  addItemToActiveList: (item: { name: string; amount: string; category: string; note?: string }) => void
  updateItemInActiveList: (itemId: string, patch: Partial<Pick<ShoppingItem, 'name' | 'amount' | 'category' | 'note'>>) => void
  toggleItemDone: (itemId: string) => void
  toggleItemFavorite: (itemId: string) => void
  deleteItem: (itemId: string) => void
  restoreItem: (item: ShoppingItem) => void
  restoreFilteredItem: (itemId: string) => void
  clearFilteredNote: () => void
  reorderItemsInCategory: (category: string, orderedIds: string[]) => void
  reorderDoneItems: (orderedIds: string[]) => void

  createList: (name: string) => void
  switchList: (listId: string) => void
  renameList: (listId: string, name: string) => void
  deleteList: (listId: string) => void

  addPantryItem: (name: string, category: string) => void
  removePantryItem: (id: string) => void

  addCustomProduct: (input: { name: string; category: string; amount: string; note?: string }) => CustomProduct
  updateCustomProduct: (id: string, patch: Partial<Omit<CustomProduct, 'id' | 'createdAt'>>) => void
  removeCustomProduct: (id: string) => void

  setTheme: (theme: Theme) => void
  setListViewMode: (mode: ListViewMode) => void
  setHasSeenOnboarding: () => void
  resetAll: () => void

  addCalculatorEntry: (amount: number) => void
  removeCalculatorEntry: (id: string) => void
  clearCalculator: () => void

  resetStats: () => void
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      lists: [newList('Wocheneinkauf')],
      activeListId: '',
      pantry: defaultPantry(),
      customProducts: [],
      purchaseLog: [],
      stats: defaultStats(),
      filtered: [],
      settings: defaultSettings(),
      calculatorEntries: [],

      activeList: () => {
        const { lists, activeListId } = get()
        return lists.find((l) => l.id === activeListId) ?? lists[0]
      },
      filteredForActiveList: () => {
        const list = get().activeList()
        if (!list) return EMPTY_ITEMS
        return get().filtered.find((f) => f.listId === list.id)?.items ?? EMPTY_ITEMS
      },

      importIntoActiveList: (text) => {
        const list = get().activeList()
        if (!list) return { ok: false, error: 'Keine aktive Liste.' }
        const result = importFromJSON(text, get().pantry)
        if (!result.ok || !result.kept) return { ok: false, error: result.error }

        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === list.id ? { ...l, weekLabel: result.weekLabel || l.weekLabel, items: result.kept! } : l
          ),
          filtered: [
            ...state.filtered.filter((f) => f.listId !== list.id),
            ...(result.filtered && result.filtered.length ? [{ listId: list.id, items: result.filtered }] : []),
          ],
          stats: {
            ...state.stats,
            importsCount: state.stats.importsCount + 1,
            itemsAddedTotal: state.stats.itemsAddedTotal + result.kept!.length,
          },
        }))
        return { ok: true, keptCount: result.kept.length, filteredCount: result.filtered?.length ?? 0 }
      },

      addItemToActiveList: (item) => {
        const list = get().activeList()
        if (!list || !item.name.trim()) return
        const newItem: ShoppingItem = {
          id: uid(),
          name: item.name.trim(),
          amount: item.amount.trim(),
          category: normalizeCategory(item.category),
          note: item.note?.trim() || undefined,
          done: false,
          favorite: false,
          addedAt: Date.now(),
        }
        set((state) => ({
          lists: state.lists.map((l) => (l.id !== list.id ? l : { ...l, items: [...l.items, newItem] })),
          stats: { ...state.stats, itemsAddedTotal: state.stats.itemsAddedTotal + 1 },
        }))
      },

      updateItemInActiveList: (itemId, patch) => {
        const list = get().activeList()
        if (!list) return
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id !== list.id
              ? l
              : {
                  ...l,
                  items: l.items.map((i) =>
                    i.id !== itemId
                      ? i
                      : {
                          ...i,
                          ...(patch.name !== undefined ? { name: patch.name.trim() || i.name } : {}),
                          ...(patch.amount !== undefined ? { amount: patch.amount.trim() } : {}),
                          ...(patch.category !== undefined ? { category: normalizeCategory(patch.category) } : {}),
                          ...(patch.note !== undefined ? { note: patch.note.trim() || undefined } : {}),
                        }
                  ),
                }
          ),
        }))
      },

      toggleItemFavorite: (itemId) => {
        const list = get().activeList()
        if (!list) return
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id !== list.id
              ? l
              : { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, favorite: !i.favorite } : i)) }
          ),
        }))
      },

      toggleItemDone: (itemId) => {
        const list = get().activeList()
        if (!list) return
        const item = list.items.find((i) => i.id === itemId)
        if (!item) return
        const nowDone = !item.done

        set((state) => ({
          lists: state.lists.map((l) =>
            l.id !== list.id
              ? l
              : { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: nowDone } : i)) }
          ),
          purchaseLog: nowDone
            ? [...state.purchaseLog, { name: item.name, category: item.category, date: todayKey() }]
            : state.purchaseLog,
        }))
      },

      deleteItem: (itemId) => {
        const list = get().activeList()
        if (!list) return
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id !== list.id ? l : { ...l, items: l.items.filter((i) => i.id !== itemId) }
          ),
        }))
      },

      /** Setzt ein zuvor gelöschtes Artikel-Objekt unverändert (gleiche id, done, favorite, ...)
       *  zurück in die aktive Liste - für "Rückgängig" nach dem Löschen. */
      restoreItem: (item) => {
        const list = get().activeList()
        if (!list) return
        set((state) => ({
          lists: state.lists.map((l) => (l.id !== list.id ? l : { ...l, items: [...l.items, item] })),
        }))
      },

      restoreFilteredItem: (itemId) => {
        const list = get().activeList()
        if (!list) return
        const entry = get().filtered.find((f) => f.listId === list.id)
        const item = entry?.items.find((i) => i.id === itemId)
        if (!item) return
        set((state) => ({
          lists: state.lists.map((l) => (l.id !== list.id ? l : { ...l, items: [...l.items, item] })),
          filtered: state.filtered.map((f) =>
            f.listId !== list.id ? f : { ...f, items: f.items.filter((i) => i.id !== itemId) }
          ),
          stats: { ...state.stats, itemsAddedTotal: state.stats.itemsAddedTotal + 1 },
        }))
      },

      clearFilteredNote: () => {
        const list = get().activeList()
        if (!list) return
        set((state) => ({ filtered: state.filtered.filter((f) => f.listId !== list.id) }))
      },

      reorderDoneItems: (orderedIds) => {
        const list = get().activeList()
        if (!list) return
        const doneItems = list.items.filter((i) => i.done)
        if (doneItems.length !== orderedIds.length) return
        const byId = new Map(doneItems.map((i) => [i.id, i]))
        if (!orderedIds.every((id) => byId.has(id))) return
        const reorderedDone = orderedIds.map((id) => byId.get(id)!)
        let di = 0
        const newItems = list.items.map((item) => (item.done ? reorderedDone[di++]! : item))
        set((state) => ({
          lists: state.lists.map((l) => (l.id !== list.id ? l : { ...l, items: newItems })),
        }))
      },
      reorderItemsInCategory: (category, orderedIds) => {
        const list = get().activeList()
        if (!list) return
        const groups = groupByCategory(list.items)
        const group = groups.find((g) => g.category === category)
        if (!group || group.items.length !== orderedIds.length) return
        const byId = new Map(group.items.map((i) => [i.id, i]))
        if (!orderedIds.every((id) => byId.has(id))) return
        const reordered = orderedIds.map((id) => byId.get(id)!)
        const newItems = groups.flatMap((g) => (g.category === category ? reordered : g.items))
        set((state) => ({
          lists: state.lists.map((l) => (l.id !== list.id ? l : { ...l, items: newItems })),
        }))
      },

      createList: (name) => {
        const list = newList(name.trim() || 'Neue Liste')
        set((state) => ({
          lists: [...state.lists, list],
          activeListId: list.id,
          stats: { ...state.stats, listsCreated: state.stats.listsCreated + 1 },
        }))
      },
      switchList: (listId) => set({ activeListId: listId }),
      renameList: (listId, name) =>
        set((state) => ({
          lists: state.lists.map((l) => (l.id === listId ? { ...l, name: name.trim() || l.name } : l)),
        })),
      deleteList: (listId) =>
        set((state) => {
          const remaining = state.lists.filter((l) => l.id !== listId)
          const lists = remaining.length ? remaining : [newList('Wocheneinkauf')]
          const activeListId = state.activeListId === listId ? lists[0].id : state.activeListId
          return { lists, activeListId, filtered: state.filtered.filter((f) => f.listId !== listId) }
        }),

      addPantryItem: (name, category) => {
        const trimmed = name.trim()
        if (!trimmed) return
        set((state) => ({ pantry: [...state.pantry, { id: uid(), name: trimmed, category }] }))
      },
      removePantryItem: (id) => set((state) => ({ pantry: state.pantry.filter((p) => p.id !== id) })),

      addCustomProduct: (input) => {
        const product: CustomProduct = {
          id: uid(),
          name: input.name.trim(),
          category: normalizeCategory(input.category),
          defaultAmount: input.amount.trim(),
          note: input.note?.trim() || undefined,
          createdAt: Date.now(),
        }
        set((state) => ({
          customProducts: [...state.customProducts, product],
          stats: { ...state.stats, manualProductsCreated: state.stats.manualProductsCreated + 1 },
        }))
        return product
      },
      updateCustomProduct: (id, patch) =>
        set((state) => ({
          customProducts: state.customProducts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removeCustomProduct: (id) =>
        set((state) => ({ customProducts: state.customProducts.filter((p) => p.id !== id) })),

      setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),
      setListViewMode: (listViewMode) => set((state) => ({ settings: { ...state.settings, listViewMode } })),
      setHasSeenOnboarding: () =>
        set((state) => ({ settings: { ...state.settings, hasSeenOnboarding: true } })),

      resetAll: () =>
        set(() => {
          const list = newList('Wocheneinkauf')
          return {
            lists: [list],
            activeListId: list.id,
            pantry: defaultPantry(),
            customProducts: [],
            purchaseLog: [],
            stats: defaultStats(),
            filtered: [],
            settings: defaultSettings(),
            calculatorEntries: [],
          }
        }),

      addCalculatorEntry: (amount) => {
        if (!Number.isFinite(amount) || amount <= 0) return
        set((state) => ({ calculatorEntries: [...state.calculatorEntries, { id: uid(), amount }] }))
      },
      removeCalculatorEntry: (id) =>
        set((state) => ({ calculatorEntries: state.calculatorEntries.filter((e) => e.id !== id) })),
      clearCalculator: () => set({ calculatorEntries: [] }),

      resetStats: () => set({ purchaseLog: [], stats: defaultStats() }),
    }),
    {
      name: STORE_NAME,
      version: STORE_VERSION,
      storage: createJSONStorage(() => safeStorage),
      skipHydration: true,
      migrate: (persisted, version) => {
        try {
          const state = (persisted as Partial<AppState>) ?? {}
          if (version < 2) {
            state.settings = {
              ...defaultSettings(),
              ...(state.settings as Partial<AppSettings>),
              hasSeenOnboarding: true,
            }
          }
          return state as AppState
        } catch (err) {
          console.error('AlexShop: Store-Migration fehlgeschlagen', err)
          return { settings: defaultSettings() } as AppState
        }
      },
      partialize: (state) => ({
        lists: state.lists,
        activeListId: state.activeListId,
        pantry: state.pantry,
        customProducts: state.customProducts,
        purchaseLog: state.purchaseLog,
        stats: state.stats,
        filtered: state.filtered,
        settings: state.settings,
        calculatorEntries: state.calculatorEntries,
      }),
      merge: (persistedState, currentState) => {
        try {
          const persisted = (persistedState as Partial<AppState>) || {}
          const hasPersisted = persisted.lists && persisted.lists.length > 0
          if (hasPersisted) {
            return {
              ...currentState,
              ...persisted,
              stats: { ...defaultStats(), ...persisted.stats },
              settings: { ...defaultSettings(), ...persisted.settings },
              activeListId: persisted.activeListId || persisted.lists![0].id,
            }
          }

          const legacy = readLegacyState()
          if (legacy) {
            return {
              ...currentState,
              lists: [legacy.list],
              activeListId: legacy.list.id,
              pantry: legacy.pantry,
            }
          }

          return { ...currentState, activeListId: currentState.lists[0].id }
        } catch (err) {
          console.error('AlexShop: Store-Merge fehlgeschlagen', err)
          return { ...currentState, activeListId: currentState.lists[0]?.id ?? '' }
        }
      },
      onRehydrateStorage: () => (_state, err) => {
        if (err) console.error('AlexShop: Store-Rehydration fehlgeschlagen', err)
      },
    }
  )
)
