/** YYYY-MM-DD im lokalen Zeitzonen-Kontext (zeitzonensicherer als toISOString). */
export function todayKey(): string {
  return new Date().toLocaleDateString('sv-SE')
}

export interface StreakState {
  current: number
  longest: number
  lastDate: string
}

export function updateStreak(state: StreakState, today = todayKey()): StreakState {
  if (state.lastDate === today) return state

  const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE')
  const current = state.lastDate === yesterday ? state.current + 1 : 1
  const longest = Math.max(state.longest, current)
  return { current, longest, lastDate: today }
}
