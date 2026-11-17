import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

/** Minimaler DOM-Ersatz: genug, um Label → Switch-Klick und Event-Bubbling zu prüfen. */
function fakeDocument() {
  const created: Record<string, unknown>[] = []
  const bodyClicks = vi.fn()
  const el = (tag: string) => {
    const listeners: Record<string, ((e: { stopPropagation(): void }) => void)[]> = {}
    const node: Record<string, unknown> & { children: Record<string, unknown>[] } = {
      tag,
      children: [],
      style: {},
      attrs: {} as Record<string, string>,
      isConnected: false,
      checked: false,
      setAttribute(k: string, v: string) {
        ;(node.attrs as Record<string, string>)[k] = v
      },
      appendChild(child: Record<string, unknown>) {
        node.children.push(child)
      },
      addEventListener(type: string, fn: (e: { stopPropagation(): void }) => void) {
        ;(listeners[type] ??= []).push(fn)
      },
      click() {
        let stopped = false
        const event = { stopPropagation: () => (stopped = true) }
        for (const fn of listeners.click ?? []) fn(event)
        const input = node.children[0]
        if (input) input.checked = !input.checked
        if (!stopped) bodyClicks()
      },
    }
    created.push(node)
    return node
  }
  const body = {
    appendChild(child: Record<string, unknown>) {
      child.isConnected = true
    },
  }
  return { document: { createElement: el, body }, created, bodyClicks }
}

describe('haptics', () => {
  it('uses the Vibration API where it exists (Android)', async () => {
    const vibrate = vi.fn()
    const dom = fakeDocument()
    vi.stubGlobal('navigator', { vibrate })
    vi.stubGlobal('document', dom.document)
    const { hapticLight } = await import('./haptics')
    hapticLight()
    expect(vibrate).toHaveBeenCalledWith(12)
    expect(dom.created).toHaveLength(0)
  })

  it('falls back to toggling one reused hidden native switch on iOS, without the click escaping', async () => {
    const dom = fakeDocument()
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('document', dom.document)
    vi.stubGlobal('window', { setTimeout: (fn: () => void) => fn() })
    const { hapticLight, hapticSuccess } = await import('./haptics')
    hapticLight()
    hapticSuccess()
    const input = dom.created.find((n) => n.tag === 'input')!
    expect((input.attrs as Record<string, string>).switch).toBe('')
    expect(dom.created.filter((n) => n.tag === 'label')).toHaveLength(1)
    expect(input.checked).toBe(true) // 3 toggles: light (1) + success (2)
    expect(dom.bodyClicks).not.toHaveBeenCalled()
  })
})
