/** Dual-thumb PC controls inspired by Grand Mountain Adventure */

export type Side = 'left' | 'right'

export interface ControlState {
  left: boolean
  right: boolean
  brake: boolean
  switch180: boolean
  flipUp: boolean
  flipDown: boolean
  grabLeft: boolean
  grabRight: boolean
  /** Edge presses this frame (for tap-to-push) */
  leftTap: boolean
  rightTap: boolean
}

const LEFT_KEYS = new Set(['KeyA', 'ArrowLeft'])
const RIGHT_KEYS = new Set(['KeyD', 'ArrowRight'])

export class Controls {
  state: ControlState = this.empty()
  private prevLeft = false
  private prevRight = false
  private keys = new Set<string>()
  private mouseLeft = false
  private mouseRight = false
  private listenersBound = false

  private empty(): ControlState {
    return {
      left: false,
      right: false,
      brake: false,
      switch180: false,
      flipUp: false,
      flipDown: false,
      grabLeft: false,
      grabRight: false,
      leftTap: false,
      rightTap: false,
    }
  }

  bind(canvas: HTMLCanvasElement): void {
    if (this.listenersBound) return
    this.listenersBound = true

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)

    canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    canvas.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
  }

  unbind(): void {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    window.removeEventListener('mouseup', this.onMouseUp)
    this.listenersBound = false
  }

  update(): ControlState {
    const left = this.keysHasLeft() || this.mouseLeft
    const right = this.keysHasRight() || this.mouseRight
    const both = left && right
    const shift = this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')
    const ctrl = this.keys.has('ControlLeft') || this.keys.has('ControlRight')

    this.state = {
      left,
      right,
      brake: both && shift,
      switch180: both && ctrl,
      flipUp: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      flipDown: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      grabLeft: this.keys.has('KeyQ'),
      grabRight: this.keys.has('KeyE'),
      leftTap: left && !this.prevLeft,
      rightTap: right && !this.prevRight,
    }

    this.prevLeft = left
    this.prevRight = right
    return this.state
  }

  private keysHasLeft(): boolean {
    for (const k of LEFT_KEYS) if (this.keys.has(k)) return true
    return false
  }

  private keysHasRight(): boolean {
    for (const k of RIGHT_KEYS) if (this.keys.has(k)) return true
    return false
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault()
    this.keys.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code)
  }

  private onBlur = (): void => {
    this.keys.clear()
    this.mouseLeft = false
    this.mouseRight = false
  }

  private onMouseDown = (e: MouseEvent): void => {
    e.preventDefault()
    if (e.button === 0) this.mouseLeft = true
    if (e.button === 2) this.mouseRight = true
  }

  private onMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) this.mouseLeft = false
    if (e.button === 2) this.mouseRight = false
  }
}
