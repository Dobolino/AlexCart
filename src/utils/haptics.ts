/** Leichtes haptisches Feedback (iOS/Android), z. B. beim Abhaken. */
export function hapticLight(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(12)
    }
  } catch {
    // ignore – nicht überall verfügbar
  }
}

export function hapticSuccess(): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([10, 40, 10])
    }
  } catch {
    // ignore
  }
}
