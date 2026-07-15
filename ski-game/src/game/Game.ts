import { Controls } from './Controls'
import { Renderer } from './Renderer'
import { Skier } from './Skier'
import { TrickTracker } from './Tricks'
import { World } from './World'

export type GamePhase = 'menu' | 'playing' | 'finished' | 'crashed'

export interface HudSnapshot {
  score: number
  speedKmh: number
  combo: number
  trickBanner: string
  leftActive: boolean
  rightActive: boolean
  airHint: string
  phase: GamePhase
  finalMeta: string
  bestTrick: string
}

export class Game {
  readonly controls = new Controls()
  readonly skier = new Skier()
  readonly world = new World()
  readonly tricks = new TrickTracker()
  readonly renderer: Renderer

  phase: GamePhase = 'menu'
  private lastT = 0
  private raf = 0
  private prevPitch = 0
  private prevSpin = 0
  private prevSwitch = false
  private distance = 0
  private gates = 0
  private finishedEmitted = false
  private onHud: ((h: HudSnapshot) => void) | null = null

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new Renderer(canvas)
    this.controls.bind(canvas)
    this.renderer.resize()
    window.addEventListener('resize', () => this.renderer.resize())
  }

  onHudUpdate(cb: (h: HudSnapshot) => void): void {
    this.onHud = cb
  }

  start(): void {
    cancelAnimationFrame(this.raf)
    this.world.generate()
    this.skier.reset()
    this.tricks.reset()
    this.phase = 'playing'
    this.distance = 0
    this.gates = 0
    this.prevPitch = 0
    this.prevSpin = 0
    this.prevSwitch = false
    this.finishedEmitted = false
    this.lastT = performance.now()
    this.emitHud()
    this.loop()
  }

  stop(): void {
    cancelAnimationFrame(this.raf)
    this.phase = 'menu'
  }

  private loop = (): void => {
    this.raf = requestAnimationFrame(this.loop)
    const now = performance.now()
    let dt = (now - this.lastT) / 1000
    this.lastT = now
    dt = Math.min(0.033, dt)

    if (this.phase === 'playing' || this.phase === 'crashed') {
      this.tick(dt)
    } else if (this.phase === 'menu') {
      // idle preview — slow camera scroll via fake skier
      this.skier.state.z += 4 * dt
      this.skier.state.vz = 4
      this.renderer.update(dt)
      this.renderer.render(this.world, this.skier.state)
    } else {
      this.renderer.update(dt)
      this.renderer.render(this.world, this.skier.state)
    }
  }

  beginIdle(): void {
    cancelAnimationFrame(this.raf)
    this.phase = 'menu'
    this.skier.reset()
    this.world.generate()
    this.lastT = performance.now()
    this.loop()
  }

  private tick(dt: number): void {
    const ctrl = this.controls.update()
    const s = this.skier.state

    if (this.phase === 'crashed') {
      this.renderer.update(dt)
      this.renderer.render(this.world, s)
      if (s.crashTimer > 2.2) {
        this.phase = 'finished'
        this.finishedEmitted = true
        this.emitHud()
      }
      return
    }

    const sample = this.world.sample(s.x, s.z, s.speed)
    const wasAir = s.airborne
    this.prevPitch = s.pitch
    this.prevSpin = s.spin

    this.skier.update(dt, ctrl, sample.groundY, sample.slope, sample.jumpBoost)

    // Track trick deltas
    const pitchDelta = s.pitch - this.prevPitch
    const spinDelta = s.spin - this.prevSpin
    this.tricks.update(dt, s.airborne, pitchDelta, spinDelta, s.grab)

    if (ctrl.switch180 && ctrl.left && ctrl.right && !this.prevSwitch && !s.airborne) {
      this.tricks.scoreSwitch()
    }
    this.prevSwitch = ctrl.switch180 && ctrl.left && ctrl.right

    // Powder spray
    if (!s.airborne && s.speed > 8) {
      const spray = (ctrl.brake ? 4 : Math.abs(s.skiAngle) > 0.3 ? 3 : 1) * (s.speed / 20)
      if (Math.random() < spray * dt * 12) this.renderer.spray(s, 2)
    }
    if (wasAir && !s.airborne) this.renderer.shake(2.5)

    // Collisions
    this.checkCollisions()

    // Soft bounds
    const hw = this.world.halfWidth - 2
    if (Math.abs(s.x) > hw) {
      s.x = Math.sign(s.x) * hw
      s.vx *= -0.3
      this.renderer.shake(1.5)
    }

    this.distance = Math.max(this.distance, s.z)

    if (!s.alive) {
      this.phase = 'crashed'
      this.renderer.shake(6)
    } else if (this.world.finished(s.z)) {
      this.phase = 'finished'
      if (!this.finishedEmitted) {
        this.tricks.totalScore += Math.floor(this.distance * 0.5) + this.gates * 50
        this.finishedEmitted = true
      }
    }

    this.renderer.update(dt)
    this.renderer.render(this.world, s)
    this.emitHud()
  }

  private checkCollisions(): void {
    const s = this.skier.state
    if (!s.alive || s.airborne) {
      // still allow gate scoring in air
    }

    for (const p of this.world.propsNear(s.z, 20)) {
      const dx = s.x - p.x
      const dz = s.z - p.z
      const dist = Math.hypot(dx, dz)

      if (p.kind === 'gate' && !p.scored && Math.abs(dz) < 2 && Math.abs(dx) < p.radius) {
        p.scored = true
        this.gates++
        this.tricks.scoreGate()
        // mark nearby flags
        for (const f of this.world.props) {
          if (f.kind === 'flag' && Math.abs(f.z - p.z) < 1) f.scored = true
        }
      }

      if (s.airborne || !s.alive) continue

      if ((p.kind === 'tree' || p.kind === 'rock') && dist < p.radius + 0.8) {
        if (s.speed > 10) {
          this.skier.crash()
          this.renderer.shake(8)
        } else {
          s.vx *= -0.5
          s.vz *= 0.4
          s.x += Math.sign(dx || 1) * 0.5
        }
      }
    }
  }

  private emitHud(): void {
    if (!this.onHud) return
    const s = this.skier.state
    const ctrl = this.controls.state
    const kmh = Math.round(s.speed * 3.6)
    let airHint = ''
    if (s.airborne) {
      airHint = 'Luft: W/S Flip · A/D Spin · Q/E Grab'
    } else if (ctrl.brake) {
      airHint = 'Scharfe Kurve'
    } else if (ctrl.left && ctrl.right) {
      airHint = 'Abstoßen'
    } else if (ctrl.left) {
      airHint = 'Kurve rechts'
    } else if (ctrl.right) {
      airHint = 'Kurve links'
    }

    this.onHud({
      score: this.tricks.totalScore,
      speedKmh: kmh,
      combo: this.tricks.combo,
      trickBanner: this.tricks.getBanner(),
      leftActive: ctrl.left,
      rightActive: ctrl.right,
      airHint,
      phase: this.phase,
      finalMeta: `${Math.floor(this.distance)} m · ${this.gates} Tore`,
      bestTrick: this.tricks.bestTrick,
    })
  }
}
