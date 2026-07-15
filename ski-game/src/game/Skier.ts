import type { ControlState } from './Controls'

export type Surface = 'snow' | 'air'

export interface SkierState {
  x: number
  z: number
  y: number
  vx: number
  vz: number
  vy: number
  heading: number
  skiAngle: number
  lean: number
  speed: number
  airborne: boolean
  switchFacing: boolean
  alive: boolean
  crashTimer: number
  /** Pitch for flips (radians) */
  pitch: number
  /** Yaw spin in air */
  spin: number
  grab: 'none' | 'left' | 'right'
  polePhase: number
}

const GRAVITY = 28
const MAX_SPEED = 42
const PUSH_FORCE = 18
const DRAG = 0.35
const EDGE_BRAKE = 12
const HARD_BRAKE = 28
const TURN_RATE = 2.4

export class Skier {
  state: SkierState = {
    x: 0,
    z: 0,
    y: 0,
    vx: 0,
    vz: 8,
    vy: 0,
    heading: 0,
    skiAngle: 0,
    lean: 0,
    speed: 8,
    airborne: false,
    switchFacing: false,
    alive: true,
    crashTimer: 0,
    pitch: 0,
    spin: 0,
    grab: 'none',
    polePhase: 0,
  }

  private switchCooldown = 0
  private pushCooldown = 0

  reset(): void {
    this.state = {
      x: 0,
      z: 0,
      y: 0,
      vx: 0,
      vz: 10,
      vy: 0,
      heading: 0,
      skiAngle: 0,
      lean: 0,
      speed: 10,
      airborne: false,
      switchFacing: false,
      alive: true,
      crashTimer: 0,
      pitch: 0,
      spin: 0,
      grab: 'none',
      polePhase: 0,
    }
    this.switchCooldown = 0
    this.pushCooldown = 0
  }

  update(
    dt: number,
    ctrl: ControlState,
    groundY: number,
    slope: number,
    jumpBoost: number,
  ): void {
    const s = this.state
    if (!s.alive) {
      s.crashTimer += dt
      return
    }

    this.switchCooldown = Math.max(0, this.switchCooldown - dt)
    this.pushCooldown = Math.max(0, this.pushCooldown - dt)

    const aboveGround = s.y > groundY + 0.15
    s.airborne = aboveGround || s.vy > 0.5

    if (s.airborne) {
      this.updateAir(dt, ctrl, groundY, jumpBoost)
    } else {
      this.updateGround(dt, ctrl, groundY, slope, jumpBoost)
    }

    s.x += s.vx * dt
    s.z += s.vz * dt
    s.speed = Math.hypot(s.vx, s.vz)
  }

  private updateGround(
    dt: number,
    ctrl: ControlState,
    groundY: number,
    slope: number,
    jumpBoost: number,
  ): void {
    const s = this.state
    s.y = groundY
    s.vy = 0
    s.pitch *= Math.pow(0.2, dt)
    s.spin *= Math.pow(0.15, dt)
    s.grab = 'none'

    // Gravity along slope → forward acceleration
    const slopeAccel = slope * 22
    const forwardX = Math.sin(s.heading)
    const forwardZ = Math.cos(s.heading)

    s.vx += forwardX * slopeAccel * dt
    s.vz += forwardZ * slopeAccel * dt

    // Dual-thumb logic
    const left = ctrl.left
    const right = ctrl.right

    if (ctrl.brake && left && right) {
      // Hard carve / snowplow
      s.skiAngle += (1.1 - s.skiAngle) * Math.min(1, 8 * dt)
      const brake = HARD_BRAKE * dt
      s.vx -= s.vx * Math.min(1, brake / Math.max(1, s.speed))
      s.vz -= s.vz * Math.min(1, brake / Math.max(1, s.speed))
    } else if (left && right) {
      // Both sides: pole plant / accelerate
      s.skiAngle += (0 - s.skiAngle) * Math.min(1, 6 * dt)
      if ((ctrl.leftTap || ctrl.rightTap) && this.pushCooldown <= 0) {
        s.vx += forwardX * PUSH_FORCE * 0.55
        s.vz += forwardZ * PUSH_FORCE * 0.55
        s.polePhase = 1
        this.pushCooldown = 0.28
      } else {
        s.vx += forwardX * PUSH_FORCE * 0.35 * dt
        s.vz += forwardZ * PUSH_FORCE * 0.35 * dt
      }
      // Mild drag when both held steadily
      s.vx *= 1 - DRAG * 0.15 * dt
      s.vz *= 1 - DRAG * 0.15 * dt
    } else if (right && !left) {
      // Right brake → turn left
      s.heading -= TURN_RATE * dt * (0.6 + Math.min(1, s.speed / 20))
      s.skiAngle += (-0.55 - s.skiAngle) * Math.min(1, 7 * dt)
      this.applyEdgeBrake(dt, 0.7)
    } else if (left && !right) {
      // Left brake → turn right
      s.heading += TURN_RATE * dt * (0.6 + Math.min(1, s.speed / 20))
      s.skiAngle += (0.55 - s.skiAngle) * Math.min(1, 7 * dt)
      this.applyEdgeBrake(dt, 0.7)
    } else {
      // Coast
      s.skiAngle += (0 - s.skiAngle) * Math.min(1, 4 * dt)
      s.vx *= 1 - DRAG * 0.4 * dt
      s.vz *= 1 - DRAG * 0.4 * dt
    }

    if (ctrl.switch180 && left && right && this.switchCooldown <= 0) {
      s.heading += Math.PI
      s.switchFacing = !s.switchFacing
      this.switchCooldown = 0.8
      // Reverse velocity along heading slightly
      s.vx *= 0.55
      s.vz *= 0.55
    }

    // Align velocity toward heading with ski grip
    const grip = 1 - Math.abs(s.skiAngle) * 0.35
    const desiredVx = Math.sin(s.heading) * s.speed
    const desiredVz = Math.cos(s.heading) * s.speed
    s.vx += (desiredVx - s.vx) * Math.min(1, grip * 4 * dt)
    s.vz += (desiredVz - s.vz) * Math.min(1, grip * 4 * dt)

    // Speed cap
    const spd = Math.hypot(s.vx, s.vz)
    if (spd > MAX_SPEED) {
      s.vx *= MAX_SPEED / spd
      s.vz *= MAX_SPEED / spd
    }

    s.lean += ((right && !left ? -0.45 : left && !right ? 0.45 : 0) - s.lean) * Math.min(1, 6 * dt)
    s.polePhase = Math.max(0, s.polePhase - dt * 3)

    // Jump takeoff from ramp
    if (jumpBoost > 0.4) {
      s.vy = 6 + jumpBoost * 10 + s.speed * 0.12
      s.y = groundY + 0.2
      s.airborne = true
    }
  }

  private applyEdgeBrake(dt: number, amount: number): void {
    const s = this.state
    const brake = EDGE_BRAKE * amount * dt
    const spd = Math.hypot(s.vx, s.vz)
    if (spd > 0.1) {
      s.vx -= (s.vx / spd) * brake
      s.vz -= (s.vz / spd) * brake
    }
  }

  private updateAir(
    dt: number,
    ctrl: ControlState,
    groundY: number,
    jumpBoost: number,
  ): void {
    const s = this.state
    void jumpBoost

    s.vy -= GRAVITY * dt
    s.y += s.vy * dt

    // Air tricks
    if (ctrl.flipUp) s.pitch -= 5.5 * dt
    if (ctrl.flipDown) s.pitch += 5.5 * dt
    if (ctrl.left && !ctrl.right) s.spin -= 4.2 * dt
    if (ctrl.right && !ctrl.left) s.spin += 4.2 * dt

    if (ctrl.grabLeft) s.grab = 'left'
    else if (ctrl.grabRight) s.grab = 'right'
    else s.grab = 'none'

    s.lean *= Math.pow(0.4, dt)
    s.skiAngle *= Math.pow(0.5, dt)

    // Light air drag
    s.vx *= 1 - 0.08 * dt
    s.vz *= 1 - 0.08 * dt

    if (s.y <= groundY && s.vy <= 0) {
      // Landing
      const pitchErr = Math.abs(((s.pitch + Math.PI) % (Math.PI * 2)) - Math.PI)
      const spinFlat = Math.abs(Math.sin(s.spin))
      const badLanding = pitchErr > 1.1 || (spinFlat > 0.85 && Math.abs(s.pitch) > 0.8)

      s.y = groundY
      s.vy = 0
      s.airborne = false

      if (badLanding && s.speed > 12) {
        this.crash()
      } else {
        // Absorb landing
        s.vx *= 0.92
        s.vz *= 0.92
        s.pitch = 0
        // Keep some spin aesthetic then settle
        s.heading += s.spin
        s.spin = 0
        s.grab = 'none'
      }
    }
  }

  crash(): void {
    const s = this.state
    s.alive = false
    s.crashTimer = 0
    s.vx *= 0.2
    s.vz *= 0.2
    s.vy = 0
  }
}
