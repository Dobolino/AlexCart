export type TrickKind = 'frontflip' | 'backflip' | 'spin' | 'grab' | 'gate' | 'switch'

export interface TrickEvent {
  kind: TrickKind
  label: string
  points: number
}

export class TrickTracker {
  private airPitchAccum = 0
  private airSpinAccum = 0
  private lastGrab: 'none' | 'left' | 'right' = 'none'
  private grabTime = 0
  private airborne = false
  combo = 1
  comboTimer = 0
  totalScore = 0
  bestTrick = ''
  private banner = ''
  private bannerTimer = 0

  reset(): void {
    this.airPitchAccum = 0
    this.airSpinAccum = 0
    this.lastGrab = 'none'
    this.grabTime = 0
    this.airborne = false
    this.combo = 1
    this.comboTimer = 0
    this.totalScore = 0
    this.bestTrick = ''
    this.banner = ''
    this.bannerTimer = 0
  }

  getBanner(): string {
    return this.bannerTimer > 0 ? this.banner : ''
  }

  update(
    dt: number,
    airborne: boolean,
    pitchDelta: number,
    spinDelta: number,
    grab: 'none' | 'left' | 'right',
  ): TrickEvent[] {
    this.comboTimer = Math.max(0, this.comboTimer - dt)
    if (this.comboTimer <= 0) this.combo = 1
    this.bannerTimer = Math.max(0, this.bannerTimer - dt)

    const events: TrickEvent[] = []

    if (airborne && !this.airborne) {
      // takeoff
      this.airPitchAccum = 0
      this.airSpinAccum = 0
      this.grabTime = 0
      this.lastGrab = 'none'
    }

    if (airborne) {
      this.airPitchAccum += pitchDelta
      this.airSpinAccum += spinDelta

      if (grab !== 'none') {
        this.grabTime += dt
        this.lastGrab = grab
      }
    }

    if (!airborne && this.airborne) {
      // Landing — resolve tricks
      const flips = Math.floor(Math.abs(this.airPitchAccum) / (Math.PI * 2 - 0.35))
      const spins = Math.floor(Math.abs(this.airSpinAccum) / (Math.PI * 2 - 0.4))

      if (flips > 0) {
        const front = this.airPitchAccum < 0
        const label =
          flips === 1
            ? front
              ? 'Frontflip'
              : 'Backflip'
            : `${flips}× ${front ? 'Frontflip' : 'Backflip'}`
        events.push({
          kind: front ? 'frontflip' : 'backflip',
          label,
          points: 400 * flips,
        })
      }

      if (spins > 0) {
        const deg = spins * 360
        events.push({
          kind: 'spin',
          label: `${deg} Spin`,
          points: 300 * spins,
        })
      }

      if (this.lastGrab !== 'none' && this.grabTime > 0.25) {
        events.push({
          kind: 'grab',
          label: this.lastGrab === 'left' ? 'Method Grab' : 'Mute Grab',
          points: 200 + Math.floor(this.grabTime * 150),
        })
      }

      for (const e of events) this.apply(e)
    }

    this.airborne = airborne
    return events
  }

  scoreGate(): TrickEvent {
    const e: TrickEvent = { kind: 'gate', label: 'Gate', points: 150 }
    this.apply(e)
    return e
  }

  scoreSwitch(): TrickEvent {
    const e: TrickEvent = { kind: 'switch', label: 'Switch', points: 100 }
    this.apply(e)
    return e
  }

  private apply(e: TrickEvent): void {
    const pts = Math.round(e.points * this.combo)
    this.totalScore += pts
    this.combo = Math.min(8, this.combo + 0.5)
    this.comboTimer = 3.5
    this.banner = e.label
    this.bannerTimer = 1.4
    if (e.points >= 300) this.bestTrick = e.label
  }
}
