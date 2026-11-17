/**
 * Haptisches Feedback.
 * - Android/Chrome: Vibration API.
 * - iOS (Safari 18+, auch als Home-Bildschirm-App): Es gibt keine Vibration API. WebKit
 *   löst aber beim Umschalten eines nativen `<input type="checkbox" switch>` das System-
 *   Taptic-Feedback aus. Wir schalten dafür einen unsichtbaren Switch über sein Label um.
 *   Ältere iOS-Versionen ignorieren das stillschweigend.
 * Muss aus einer Nutzer-Geste heraus (Tap/Klick) aufgerufen werden.
 */
let iosSwitchLabel: HTMLLabelElement | null = null

function iosTick(): void {
  if (typeof document === 'undefined' || !document.body) return
  if (!iosSwitchLabel || !iosSwitchLabel.isConnected) {
    const label = document.createElement('label')
    label.setAttribute('aria-hidden', 'true')
    label.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;left:-100px'
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.setAttribute('switch', '')
    input.tabIndex = -1
    label.appendChild(input)
    // Der Klick soll nirgends sonst ankommen (z. B. "ausserhalb geklickt"-Logik).
    const stop = (event: Event) => event.stopPropagation()
    label.addEventListener('click', stop)
    input.addEventListener('click', stop)
    document.body.appendChild(label)
    iosSwitchLabel = label
  }
  iosSwitchLabel.click()
}

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

function pulse(pattern: number | number[], iosTicks: number): void {
  try {
    if (canVibrate()) {
      navigator.vibrate(pattern)
      return
    }
    iosTick()
    for (let i = 1; i < iosTicks; i++) window.setTimeout(iosTick, i * 60)
  } catch {
    // ignore – nicht überall verfügbar
  }
}

/** Leichtes haptisches Feedback, z. B. bei Auswahl. */
export function hapticLight(): void {
  pulse(12, 1)
}

/** Bestätigung, z. B. beim Abhaken. */
export function hapticSuccess(): void {
  pulse([10, 40, 10], 2)
}
