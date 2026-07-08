import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { uid } from '@/utils/id'
import { importFromJSON } from '@/utils/import'
import { applyImportMode } from '@/utils/mergeList'
import { buildRepeatCandidates, candidatesToItems } from '@/utils/repeatWeek'
import { parseRecipeText } from '@/utils/recipe'
import { replenishPantryItem } from '@/utils/pantry'
import { normalize } from '@/utils/text'
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
  ImportMode,
} from '@/types'

const STORE_VERSION = 6
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
  return {
    theme: 'system',
    listViewMode: 'tiles',
    hasSeenOnboarding: false,
    askPriceOnCheckoff: false,
    weeklyBudget: 0,
    currency: 'CHF',
  }
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

  importIntoActiveList: (
    text: string,
    mode?: ImportMode
  ) => { ok: boolean; error?: string; keptCount?: number; filteredCount?: number; addedCount?: number }
  repeatLastWeekToActiveList: () => { ok: boolean; error?: string; addedCount: number }
  importRecipeToActiveList: (
    text: string,
    mode?: ImportMode
  ) => { ok: boolean; error?: string; keptCount?: number; filteredCount?: number; addedCount?: number }
  addItemToActiveList: (item: { name: string; amount: string; category: string; note?: string }) => void
  updateItemInActiveList: (itemId: string, patch: Partial<Pick<ShoppingItem, 'name' | 'amount' | 'category' | 'note'>>) => void
  toggleItemDone: (itemId: string, price?: number) => void
  updatePurchaseLogPrice: (name: string, category: string, price: number) => void
  toggleItemFavorite: (itemId: string) => void
  deleteItem: (itemId: string) => void
  restoreItem: (item: ShoppingItem) => void
  restoreFilteredItem: (itemId: string) => void
  clearFilteredNote: () => void
  reorderItemsInCategory: (category: string, orderedIds: string[]) => void
  reorderDoneItems: (orderedIds: string[]) => void
  clearDoneItems: () => void

  createList: (name: string) => void
  duplicateList: (listId: string) => void
  switchList: (listId: string) => void
  renameList: (listId: string, name: string) => void
  deleteList: (listId: string) => void

  addPantryItem: (name: string, category: string, amount?: string, minAmount?: string) => void
  updatePantryItem: (id: string, patch: Partial<Pick<PantryItem, 'name' | 'category' | 'amount' | 'minAmount'>>) => void
  removePantryItem: (id: string) => void

  addCustomProduct: (input: { name: string; category: string; amount: string; note?: string }) => CustomProduct
  updateCustomProduct: (id: string, patch: Partial<Omit<CustomProduct, 'id' | 'createdAt'>>) => void
  removeCustomProduct: (id: string) => void

  setTheme: (theme: Theme) => void
  setListViewMode: (mode: ListViewMode) => void
  setAskPriceOnCheckoff: (ask: boolean) => void
  setWeeklyBudget: (amount: number) => void
  setCurrency: (currency: AppSettings['currency']) => void
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

      importIntoActiveList: (text, mode = 'replace') => {
        const list = get().activeList()
        if (!list) return { ok: false, error: 'Keine aktive Liste.' }
        const result = importFromJSON(text, get().pantry)
        if (!result.ok || !result.kept) return { ok: false, error: result.error }

        const mergedItems = applyImportMode(list.items, result.kept, mode)
        const openBefore = list.items.filter((i) => !i.done).length
        const openAfter = mergedItems.filter((i) => !i.done).length

        set((state) => ({
          lists: state.lists.map((l) =>
            l.id === list.id
              ? { ...l, weekLabel: result.weekLabel || l.weekLabel, items: mergedItems }
              : l
          ),
          filtered: [
            ...state.filtered.filter((f) => f.listId !== list.id),
            ...(result.filtered && result.filtered.length ? [{ listId: list.id, items: result.filtered }] : []),
          ],
          stats: {
            ...state.stats,
            importsCount: state.stats.importsCount + 1,
            itemsAddedTotal: state.stats.itemsAddedTotal + Math.max(0, openAfter - openBefore),
          },
        }))
        return {
          ok: true,
          keptCount: result.kept.length,
          filteredCount: result.filtered?.length ?? 0,
          addedCount: Math.max(0, openAfter - openBefore),
        }
      },

      repeatLastWeekToActiveList: () => {
        const list = get().activeList()
        if (!list) return { ok: false, error: 'Keine aktive Liste.', addedCount: 0 }

        const candidates = buildRepeatCandidates(
          get().purchaseLog,
          get().lists,
          get().customProducts,
          get().pantry
        )
        if (!candidates.length) {
          return { ok: false, error: 'Keine Einkäufe von letzter Woche gefunden.', addedCount: 0 }
        }

        const openNames = new Set(list.items.filter((i) => !i.done).map((i) => normalize(i.name)))
        const toAdd = candidatesToItems(candidates.filter((c) => !openNames.has(normalize(c.name))))
        if (!toAdd.length) {
          return { ok: false, error: 'Alle Artikel von letzter Woche sind bereits auf der Liste.', addedCount: 0 }
        }

        const openBefore = list.items.filter((i) => !i.done).length
        const mergedItems = applyImportMode(list.items, toAdd, 'append')
        const openAfter = mergedItems.filter((i) => !i.done).length
        const addedCount = openAfter - openBefore

        set((state) => ({
          lists: state.lists.map((l) => (l.id === list.id ? { ...l, items: mergedItems } : l)),
          stats: { ...state.stats, itemsAddedTotal: state.stats.itemsAddedTotal + addedCount },
        }))

        return { ok: true, addedCount }
      },

      importRecipeToActiveList: (text, mode = 'append') => {
        const items = parseRecipeText(text, get().customProducts)
        if (!items.length) return { ok: false, error: 'Keine Zutaten im Text erkannt.' }
        return get().importIntoActiveList(JSON.stringify({ items }), mode)
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

      toggleItemDone: (itemId, price) => {
        const list = get().activeList()
        if (!list) return
        const item = list.items.find((i) => i.id === itemId)
        if (!item) return
        const nowDone = !item.done

        set((state) => {
          let purchaseLog = state.purchaseLog
          if (nowDone) {
            const entry: PurchaseLogEntry = { name: item.name, category: item.category, date: todayKey() }
            if (price !== undefined && price > 0) entry.price = price
            purchaseLog = [...purchaseLog, entry]
          } else {
            let idx = -1
            for (let i = purchaseLog.length - 1; i >= 0; i--) {
              const e = purchaseLog[i]!
              if (e.name === item.name && e.category === item.category && e.date === todayKey()) {
                idx = i
                break
              }
            }
            if (idx >= 0) purchaseLog = purchaseLog.filter((_, i) => i !== idx)
          }

          return {
            lists: state.lists.map((l) =>
              l.id !== list.id
                ? l
                : { ...l, items: l.items.map((i) => (i.id === itemId ? { ...i, done: nowDone } : i)) }
            ),
            purchaseLog,
            pantry: nowDone ? replenishPantryItem(state.pantry, item) : state.pantry,
          }
        })
      },

      updatePurchaseLogPrice: (name, category, price) => {
        const today = todayKey()
        set((state) => {
          let idx = -1
          for (let i = state.purchaseLog.length - 1; i >= 0; i--) {
            const e = state.purchaseLog[i]!
            if (e.name === name && e.category === category && e.date === today) {
              idx = i
              break
            }
          }
          if (idx < 0) return state
          const purchaseLog = [...state.purchaseLog]
          purchaseLog[idx] = { ...purchaseLog[idx]!, price: price > 0 ? price : undefined }
          return { purchaseLog }
        })
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
      clearDoneItems: () => {
        const list = get().activeList()
        if (!list) return
        set((state) => ({
          lists: state.lists.map((l) =>
            l.id !== list.id ? l : { ...l, items: l.items.filter((i) => !i.done) }
          ),
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
      duplicateList: (listId) => {
        const source = get().lists.find((l) => l.id === listId)
        if (!source) return
        const copy = newList(`${source.name} (Kopie)`)
        copy.weekLabel = source.weekLabel
        copy.items = source.items.map((item) => ({
          ...item,
          id: uid(),
          addedAt: Date.now(),
        }))
        set((state) => ({
          lists: [...state.lists, copy],
          activeListId: copy.id,
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

      addPantryItem: (name, category, amount, minAmount) => {
        const trimmed = name.trim()
        if (!trimmed) return
        set((state) => ({
          pantry: [
            ...state.pantry,
            {
              id: uid(),
              name: trimmed,
              category: normalizeCategory(category),
              amount: amount?.trim() || undefined,
              minAmount: minAmount?.trim() || undefined,
            },
          ],
        }))
      },
      updatePantryItem: (id, patch) =>
        set((state) => ({
          pantry: state.pantry.map((item) =>
            item.id !== id
              ? item
              : {
                  ...item,
                  ...(patch.name !== undefined ? { name: patch.name.trim() || item.name } : {}),
                  ...(patch.category !== undefined ? { category: normalizeCategory(patch.category) } : {}),
                  ...(patch.amount !== undefined ? { amount: patch.amount.trim() || undefined } : {}),
                  ...(patch.minAmount !== undefined ? { minAmount: patch.minAmount.trim() || undefined } : {}),
                }
          ),
        })),
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
      setAskPriceOnCheckoff: (askPriceOnCheckoff) =>
        set((state) => ({ settings: { ...state.settings, askPriceOnCheckoff } })),
      setWeeklyBudget: (weeklyBudget) =>
        set((state) => ({
          settings: {
            ...state.settings,
            weeklyBudget: Number.isFinite(weeklyBudget) && weeklyBudget > 0 ? Math.round(weeklyBudget * 100) / 100 : 0,
          },
        })),
      setCurrency: (currency) => set((state) => ({ settings: { ...state.settings, currency } })),
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
          if (version < 3) {
            state.settings = {
              ...defaultSettings(),
              ...(state.settings as Partial<AppSettings>),
              askPriceOnCheckoff: false,
            }
          }
          if (version < 4) {
            state.settings = {
              ...defaultSettings(),
              ...(state.settings as Partial<AppSettings>),
              weeklyBudget: 0,
            }
          }
          if (version < 5 && Array.isArray(state.pantry)) {
            state.pantry = state.pantry.map((item) => ({
              ...item,
              amount: item.amount || undefined,
              minAmount: item.minAmount || undefined,
            }))
          }
          if (version < 6) {
            state.settings = {
              ...defaultSettings(),
              ...(state.settings as Partial<AppSettings>),
              currency: 'CHF',
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
