import type { SkierState } from './Skier'
import type { Prop, World } from './World'

interface Particle {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  max: number
  size: number
}

export class Renderer {
  private ctx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private dpr = 1
  private particles: Particle[] = []
  private snowflakes: { x: number; y: number; s: number; v: number }[] = []
  private time = 0
  private camShake = 0

  constructor(private canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D unavailable')
    this.ctx = ctx
    for (let i = 0; i < 80; i++) {
      this.snowflakes.push({
        x: Math.random(),
        y: Math.random(),
        s: 0.6 + Math.random() * 1.8,
        v: 0.08 + Math.random() * 0.2,
      })
    }
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.w = window.innerWidth
    this.h = window.innerHeight
    this.canvas.width = Math.floor(this.w * this.dpr)
    this.canvas.height = Math.floor(this.h * this.dpr)
    this.canvas.style.width = `${this.w}px`
    this.canvas.style.height = `${this.h}px`
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
  }

  shake(amount: number): void {
    this.camShake = Math.max(this.camShake, amount)
  }

  spray(skier: SkierState, amount: number): void {
    for (let i = 0; i < amount; i++) {
      this.particles.push({
        x: skier.x + (Math.random() - 0.5) * 1.2,
        y: skier.y + 0.2,
        z: skier.z - 0.5,
        vx: -skier.vx * 0.15 + (Math.random() - 0.5) * 4,
        vy: 1 + Math.random() * 3,
        vz: -skier.vz * 0.2 - Math.random() * 3,
        life: 0.4 + Math.random() * 0.5,
        max: 0.9,
        size: 1.5 + Math.random() * 3,
      })
    }
  }

  update(dt: number): void {
    this.time += dt
    this.camShake = Math.max(0, this.camShake - dt * 8)
    for (const p of this.particles) {
      p.life -= dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt
      p.vy -= 6 * dt
    }
    this.particles = this.particles.filter((p) => p.life > 0)
    for (const f of this.snowflakes) {
      f.y += f.v * dt
      f.x += Math.sin(this.time + f.y * 8) * 0.02 * dt
      if (f.y > 1.1) {
        f.y = -0.05
        f.x = Math.random()
      }
    }
  }

  render(world: World, skier: SkierState): void {
    const ctx = this.ctx
    const w = this.w
    const h = this.h
    const shakeX = (Math.random() - 0.5) * this.camShake * 4
    const shakeY = (Math.random() - 0.5) * this.camShake * 3

    ctx.save()
    ctx.translate(shakeX, shakeY)

    this.drawSky(ctx, w, h)
    this.drawMountains(ctx, w, h, skier.z)
    this.drawSlope(ctx, w, h, world, skier)

    const props = world.propsNear(skier.z, 90)
    props.sort((a, b) => b.z - a.z)
    for (const p of props) {
      if (p.z < skier.z - 8) continue
      this.drawProp(ctx, w, h, skier, p)
    }

    for (const p of this.particles) {
      this.drawParticle(ctx, w, h, skier, p)
    }

    this.drawSkier(ctx, w, h, skier)
    this.drawSnowOverlay(ctx, w, h)
    this.drawVignette(ctx, w, h)

    ctx.restore()
  }

  private drawSky(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.55)
    g.addColorStop(0, '#1a3a55')
    g.addColorStop(0.45, '#3d6d8c')
    g.addColorStop(1, '#9ec4d8')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)

    // soft sun
    const sx = w * 0.72
    const sy = h * 0.18
    const sun = ctx.createRadialGradient(sx, sy, 0, sx, sy, h * 0.22)
    sun.addColorStop(0, 'rgba(255, 236, 200, 0.55)')
    sun.addColorStop(0.4, 'rgba(255, 210, 150, 0.15)')
    sun.addColorStop(1, 'transparent')
    ctx.fillStyle = sun
    ctx.fillRect(0, 0, w, h * 0.55)
  }

  private drawMountains(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    z: number,
  ): void {
    const parallax = (z * 0.02) % w
    const layers = [
      { y: h * 0.28, color: '#243f55', amp: 48, freq: 0.008, a: 0.3 },
      { y: h * 0.34, color: '#2c4f5f', amp: 36, freq: 0.012, a: 0.55 },
      { y: h * 0.4, color: '#355a68', amp: 24, freq: 0.018, a: 0.85 },
    ]
    for (const layer of layers) {
      ctx.beginPath()
      ctx.moveTo(0, h)
      ctx.lineTo(0, layer.y)
      for (let x = 0; x <= w; x += 8) {
        const n =
          Math.sin((x + parallax * layer.a) * layer.freq) * layer.amp +
          Math.sin((x + parallax) * layer.freq * 2.3) * layer.amp * 0.35
        ctx.lineTo(x, layer.y - n)
      }
      ctx.lineTo(w, h)
      ctx.closePath()
      ctx.fillStyle = layer.color
      ctx.fill()
    }
  }

  private project(
    skier: SkierState,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
  ): { sx: number; sy: number; scale: number; visible: boolean } {
    const relZ = z - skier.z
    const relX = x - skier.x
    const relY = y - skier.y

    const camHeight = 4.2
    const camBehind = 7.5
    const fov = 320

    const depth = relZ + camBehind
    if (depth < 0.5) return { sx: 0, sy: 0, scale: 0, visible: false }

    const scale = fov / depth
    const lean = skier.lean * 18
    const sx = w * 0.5 + relX * scale + lean
    const sy = h * 0.58 - (relY + camHeight) * scale + depth * 0.35
    return { sx, sy, scale, visible: depth < 110 }
  }

  private drawSlope(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    world: World,
    skier: SkierState,
  ): void {
    // Horizon fill
    const ground = ctx.createLinearGradient(0, h * 0.42, 0, h)
    ground.addColorStop(0, '#d8e8f2')
    ground.addColorStop(0.35, '#eef5fb')
    ground.addColorStop(1, '#f7fbfe')
    ctx.fillStyle = ground
    ctx.beginPath()
    ctx.moveTo(0, h * 0.42)
    ctx.lineTo(w, h * 0.42)
    ctx.lineTo(w, h)
    ctx.lineTo(0, h)
    ctx.closePath()
    ctx.fill()

    // Perspective track ribbons
    const rows = 28
    for (let i = rows; i >= 0; i--) {
      const z = skier.z + i * 3.2
      const width = world.halfWidth
      const yL = world.heightAt(-width, z)
      const yR = world.heightAt(width, z)
      const yC = world.heightAt(0, z)
      const pL = this.project(skier, -width, yL, z, w, h)
      const pR = this.project(skier, width, yR, z, w, h)
      const pC = this.project(skier, 0, yC, z, w, h)
      if (!pL.visible && !pR.visible) continue

      const stripe = Math.floor(z / 8) % 2 === 0
      ctx.strokeStyle = stripe ? 'rgba(180, 205, 220, 0.25)' : 'rgba(200, 220, 235, 0.18)'
      ctx.lineWidth = Math.max(1, pC.scale * 0.08)
      ctx.beginPath()
      ctx.moveTo(pL.sx, pL.sy)
      ctx.quadraticCurveTo(pC.sx, pC.sy - 2, pR.sx, pR.sy)
      ctx.stroke()

      // edge shadows (trees line feel)
      ctx.fillStyle = 'rgba(30, 61, 50, 0.06)'
      ctx.fillRect(pL.sx - 20, pL.sy, 20, 3)
      ctx.fillRect(pR.sx, pR.sy, 20, 3)
    }

    // Center guide faint
    ctx.strokeStyle = 'rgba(126, 200, 232, 0.12)'
    ctx.setLineDash([8, 14])
    ctx.beginPath()
    for (let i = 0; i < 20; i++) {
      const z = skier.z + 4 + i * 4
      const y = world.heightAt(skier.x * 0.3, z)
      const p = this.project(skier, skier.x * 0.3, y, z, w, h)
      if (i === 0) ctx.moveTo(p.sx, p.sy)
      else ctx.lineTo(p.sx, p.sy)
    }
    ctx.stroke()
    ctx.setLineDash([])
  }

  private drawProp(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    skier: SkierState,
    p: Prop,
  ): void {
    const base = this.project(skier, p.x, 0, p.z, w, h)
    if (!base.visible || base.scale < 0.5) return
    const top = this.project(skier, p.x, p.height, p.z, w, h)
    const s = base.scale

    if (p.kind === 'tree') {
      const trunkW = s * 0.35
      ctx.fillStyle = '#4a3428'
      ctx.fillRect(base.sx - trunkW / 2, top.sy + (base.sy - top.sy) * 0.55, trunkW, base.sy - top.sy)
      ctx.fillStyle = '#1e3d32'
      ctx.beginPath()
      ctx.moveTo(base.sx, top.sy)
      ctx.lineTo(base.sx + s * 1.4, base.sy - s * 0.4)
      ctx.lineTo(base.sx - s * 1.4, base.sy - s * 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#2a5545'
      ctx.beginPath()
      ctx.moveTo(base.sx, top.sy + s * 0.6)
      ctx.lineTo(base.sx + s * 1.1, base.sy - s * 0.15)
      ctx.lineTo(base.sx - s * 1.1, base.sy - s * 0.15)
      ctx.closePath()
      ctx.fill()
      // snow cap
      ctx.fillStyle = 'rgba(238, 245, 251, 0.85)'
      ctx.beginPath()
      ctx.moveTo(base.sx, top.sy)
      ctx.lineTo(base.sx + s * 0.55, top.sy + s * 0.7)
      ctx.lineTo(base.sx - s * 0.55, top.sy + s * 0.7)
      ctx.closePath()
      ctx.fill()
    } else if (p.kind === 'rock') {
      ctx.fillStyle = '#6a7a88'
      ctx.beginPath()
      ctx.ellipse(base.sx, base.sy - s * 0.3, s * p.radius * 0.7, s * p.height * 0.45, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(238, 245, 251, 0.35)'
      ctx.beginPath()
      ctx.ellipse(base.sx - s * 0.2, base.sy - s * 0.45, s * 0.35, s * 0.15, -0.4, 0, Math.PI * 2)
      ctx.fill()
    } else if (p.kind === 'ramp') {
      ctx.fillStyle = 'rgba(160, 190, 210, 0.7)'
      ctx.beginPath()
      ctx.moveTo(base.sx - s * 3, base.sy)
      ctx.lineTo(base.sx + s * 3, base.sy)
      ctx.lineTo(base.sx + s * 2.2, base.sy - s * 1.8)
      ctx.lineTo(base.sx - s * 2.2, base.sy - s * 0.4)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = 'rgba(240, 160, 90, 0.5)'
      ctx.lineWidth = 2
      ctx.stroke()
    } else if (p.kind === 'flag') {
      ctx.strokeStyle = '#c45c3a'
      ctx.lineWidth = Math.max(2, s * 0.12)
      ctx.beginPath()
      ctx.moveTo(base.sx, base.sy)
      ctx.lineTo(top.sx, top.sy)
      ctx.stroke()
      ctx.fillStyle = p.scored ? '#6bcf8e' : '#e8783a'
      ctx.beginPath()
      ctx.moveTo(top.sx, top.sy)
      ctx.lineTo(top.sx + s * 1.1, top.sy + s * 0.35)
      ctx.lineTo(top.sx, top.sy + s * 0.7)
      ctx.closePath()
      ctx.fill()
    } else if (p.kind === 'gate') {
      // invisible scoring volume — faint arch
      ctx.strokeStyle = p.scored ? 'rgba(107, 207, 142, 0.35)' : 'rgba(240, 160, 90, 0.25)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(base.sx - s * 3, base.sy)
      ctx.quadraticCurveTo(base.sx, base.sy - s * 3.5, base.sx + s * 3, base.sy)
      ctx.stroke()
    }
  }

  private drawParticle(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    skier: SkierState,
    p: Particle,
  ): void {
    const pr = this.project(skier, p.x, p.y, p.z, w, h)
    if (!pr.visible) return
    const a = Math.max(0, p.life / p.max)
    ctx.fillStyle = `rgba(255,255,255,${a * 0.85})`
    ctx.beginPath()
    ctx.arc(pr.sx, pr.sy, p.size * (pr.scale / 40), 0, Math.PI * 2)
    ctx.fill()
  }

  private drawSkier(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    skier: SkierState,
  ): void {
    const cx = w * 0.5
    const cy = h * 0.62
    const scale = 1.15
    const lean = skier.lean * 25
    const skiA = skier.skiAngle
    const pitch = skier.pitch
    const spin = skier.spin
    const airborne = skier.airborne

    ctx.save()
    ctx.translate(cx + lean, cy - (airborne ? Math.min(80, skier.y * 8) : 0))
    ctx.rotate(lean * 0.01 + spin * 0.15)
    ctx.scale(scale, scale * (1 + Math.sin(pitch) * 0.15))

    if (!skier.alive) {
      ctx.rotate(0.8)
      ctx.globalAlpha = 0.7
    }

    // shadow
    ctx.fillStyle = 'rgba(40, 70, 90, 0.25)'
    ctx.beginPath()
    ctx.ellipse(0, 28, 22, 6, 0, 0, Math.PI * 2)
    ctx.fill()

    // skis
    const skiSpread = 8 + Math.abs(skiA) * 14
    ctx.save()
    ctx.translate(-skiSpread, 22)
    ctx.rotate(skiA * 0.5)
    this.drawSki(ctx, skier.grab === 'left')
    ctx.restore()
    ctx.save()
    ctx.translate(skiSpread, 22)
    ctx.rotate(-skiA * 0.5)
    this.drawSki(ctx, skier.grab === 'right')
    ctx.restore()

    // body
    ctx.fillStyle = '#e8783a'
    this.roundRect(ctx, -7, -8, 14, 22, 4)
    ctx.fill()

    // jacket stripe
    ctx.fillStyle = '#0b1c2c'
    ctx.fillRect(-7, 0, 14, 4)

    // head
    ctx.fillStyle = '#f0d5b8'
    ctx.beginPath()
    ctx.arc(0, -14, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#1a3348'
    ctx.beginPath()
    ctx.arc(0, -16, 6.5, Math.PI, Math.PI * 2)
    ctx.fill()

    // poles
    const poleSwing = skier.polePhase * 20
    ctx.strokeStyle = '#c0c8d0'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-10, 0)
    ctx.lineTo(-18 - poleSwing, 24 - poleSwing * 0.3)
    ctx.moveTo(10, 0)
    ctx.lineTo(18 + poleSwing, 24 - poleSwing * 0.3)
    ctx.stroke()

    // grab indicator
    if (skier.grab !== 'none') {
      ctx.strokeStyle = '#7ec8e8'
      ctx.lineWidth = 2
      ctx.beginPath()
      const gx = skier.grab === 'left' ? -skiSpread : skiSpread
      ctx.moveTo(gx * 0.3, 8)
      ctx.quadraticCurveTo(gx, 14, gx, 20)
      ctx.stroke()
    }

    // flip arc hint
    if (airborne && Math.abs(pitch) > 0.3) {
      ctx.strokeStyle = 'rgba(240, 160, 90, 0.5)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 32, -1.2 + pitch * 0.3, 1.2 + pitch * 0.3)
      ctx.stroke()
    }

    ctx.restore()
  }

  private drawSki(ctx: CanvasRenderingContext2D, grabbed: boolean): void {
    ctx.fillStyle = grabbed ? '#7ec8e8' : '#2a3a48'
    this.roundRect(ctx, -3, -28, 6, 48, 3)
    ctx.fill()
    ctx.fillStyle = '#eef5fb'
    ctx.fillRect(-2, -26, 4, 6)
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    const rr = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x + rr, y)
    ctx.arcTo(x + w, y, x + w, y + h, rr)
    ctx.arcTo(x + w, y + h, x, y + h, rr)
    ctx.arcTo(x, y + h, x, y, rr)
    ctx.arcTo(x, y, x + w, y, rr)
    ctx.closePath()
  }

  private drawSnowOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    for (const f of this.snowflakes) {
      ctx.globalAlpha = 0.25 + f.s * 0.15
      ctx.beginPath()
      ctx.arc(f.x * w, f.y * h, f.s, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }

  private drawVignette(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85)
    g.addColorStop(0, 'transparent')
    g.addColorStop(1, 'rgba(11, 28, 44, 0.45)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }
}
