import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { uid } from '@/utils/id'
import { importFromJSON } from '@/utils/import'
import { todayKey, updateStreak, type StreakState } from '@/utils/date'
import type { CalculatorEntry, PantryItem, PurchaseLogEntry, ShoppingItem, ShoppingList, Theme } from '@/types'

const STORE_VERSION = 1
const STORE_NAME = 'alexshop-store'

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
  purchaseLog: PurchaseLogEntry[]
  streak: StreakState
  filtered: FilteredEntry[]
  settings: { theme: Theme }
  calculatorEntries: CalculatorEntry[]

  activeList: () => ShoppingList | undefined
  filteredForActiveList: () => ShoppingItem[]

  importIntoActiveList: (text: string) => { ok: boolean; error?: string; keptCount?: number; filteredCount?: number }
  toggleItemDone: (itemId: string) => void
  deleteItem: (itemId: string) => void
  restoreFilteredItem: (itemId: string) => void
  clearFilteredNote: () => void

  createList: (name: string) => void
  switchList: (listId: string) => void
  renameList: (listId: string, name: string) => void
  deleteList: (listId: string) => void

  addPantryItem: (name: string, category: string) => void
  removePantryItem: (id: string) => void

  setTheme: (theme: Theme) => void
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
      purchaseLog: [],
      streak: { current: 0, longest: 0, lastDate: '' },
      filtered: [],
      settings: { theme: 'system' },
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
        }))
        return { ok: true, keptCount: result.kept.length, filteredCount: result.filtered?.length ?? 0 }
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
          streak: nowDone ? updateStreak(state.streak) : state.streak,
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
        }))
      },

      clearFilteredNote: () => {
        const list = get().activeList()
        if (!list) return
        set((state) => ({ filtered: state.filtered.filter((f) => f.listId !== list.id) }))
      },

      createList: (name) => {
        const list = newList(name.trim() || 'Neue Liste')
        set((state) => ({ lists: [...state.lists, list], activeListId: list.id }))
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

      setTheme: (theme) => set((state) => ({ settings: { ...state.settings, theme } })),

      resetAll: () =>
        set(() => {
          const list = newList('Wocheneinkauf')
          return {
            lists: [list],
            activeListId: list.id,
            pantry: defaultPantry(),
            purchaseLog: [],
            streak: { current: 0, longest: 0, lastDate: '' },
            filtered: [],
            settings: { theme: 'system' },
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

      resetStats: () => set({ purchaseLog: [], streak: { current: 0, longest: 0, lastDate: '' } }),
    }),
    {
      name: STORE_NAME,
      version: STORE_VERSION,
      partialize: (state) => ({
        lists: state.lists,
        activeListId: state.activeListId,
        pantry: state.pantry,
        purchaseLog: state.purchaseLog,
        streak: state.streak,
        filtered: state.filtered,
        settings: state.settings,
        calculatorEntries: state.calculatorEntries,
      }),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<AppState>) || {}
        const hasPersisted = persisted.lists && persisted.lists.length > 0
        if (hasPersisted) {
          return {
            ...currentState,
            ...persisted,
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
      },
    }
  )
)
