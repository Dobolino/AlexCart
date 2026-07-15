export type PropKind = 'tree' | 'rock' | 'gate' | 'ramp' | 'flag'

export interface Prop {
  id: number
  kind: PropKind
  x: number
  z: number
  radius: number
  height: number
  /** Ramp lift strength 0–1 */
  boost: number
  scored?: boolean
}

export interface WorldSample {
  groundY: number
  slope: number
  jumpBoost: number
}

let nextId = 1

function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export class World {
  readonly length = 2400
  readonly halfWidth = 38
  props: Prop[] = []
  private rampZones: { z: number; x: number; w: number; boost: number }[] = []

  constructor() {
    this.generate()
  }

  generate(): void {
    this.props = []
    this.rampZones = []
    nextId = 1

    // Trees along edges + scattered
    for (let z = 40; z < this.length - 80; z += 8 + hash(z) * 10) {
      const side = hash(z + 1) > 0.5 ? 1 : -1
      const edgeX = side * (22 + hash(z + 2) * 14)
      this.props.push({
        id: nextId++,
        kind: 'tree',
        x: edgeX,
        z,
        radius: 1.2,
        height: 4 + hash(z + 3) * 3,
        boost: 0,
      })

      if (hash(z + 4) > 0.72) {
        this.props.push({
          id: nextId++,
          kind: 'tree',
          x: (hash(z + 5) - 0.5) * 28,
          z: z + 3,
          radius: 1.1,
          height: 3.5 + hash(z + 6) * 2.5,
          boost: 0,
        })
      }
    }

    // Rocks
    for (let i = 0; i < 40; i++) {
      const z = 60 + hash(i * 17) * (this.length - 140)
      const x = (hash(i * 19) - 0.5) * 50
      this.props.push({
        id: nextId++,
        kind: 'rock',
        x,
        z,
        radius: 1.4 + hash(i) * 1.2,
        height: 1 + hash(i + 1),
        boost: 0,
      })
    }

    // Gates (score)
    for (let i = 0; i < 18; i++) {
      const z = 100 + i * 110 + hash(i * 3) * 30
      const x = Math.sin(i * 0.9) * 12
      this.props.push({
        id: nextId++,
        kind: 'gate',
        x,
        z,
        radius: 3.5,
        height: 3.2,
        boost: 0,
        scored: false,
      })
      this.props.push({
        id: nextId++,
        kind: 'flag',
        x: x - 3.2,
        z,
        radius: 0.4,
        height: 3.2,
        boost: 0,
      })
      this.props.push({
        id: nextId++,
        kind: 'flag',
        x: x + 3.2,
        z,
        radius: 0.4,
        height: 3.2,
        boost: 0,
      })
    }

    // Ramps / jumps
    const rampZs = [180, 320, 480, 640, 820, 980, 1180, 1380, 1580, 1780, 1980, 2150]
    for (let i = 0; i < rampZs.length; i++) {
      const z = rampZs[i]!
      const x = Math.sin(i * 1.3) * 8
      const boost = 0.55 + hash(i * 9) * 0.45
      this.rampZones.push({ z, x, w: 7, boost })
      this.props.push({
        id: nextId++,
        kind: 'ramp',
        x,
        z,
        radius: 5,
        height: 2.2,
        boost,
      })
    }
  }

  /** Height field — gentle bowls + ridges */
  heightAt(x: number, z: number): number {
    const bowl = Math.abs(x) * 0.015
    const wave = Math.sin(z * 0.012) * 1.8 + Math.sin(z * 0.031 + x * 0.02) * 0.9
    const ridge = Math.sin(z * 0.007) * Math.cos(x * 0.04) * 1.2
    return bowl + wave + ridge
  }

  /** Forward slope magnitude (positive = downhill) */
  slopeAt(x: number, z: number): number {
    const dz = 0.6
    const h0 = this.heightAt(x, z)
    const h1 = this.heightAt(x, z + dz)
    // Going +z downhill means height decreases
    return Math.max(0.15, (h0 - h1) / dz + 0.55)
  }

  sample(x: number, z: number, speed: number): WorldSample {
    const groundY = this.heightAt(x, z)
    const slope = this.slopeAt(x, z)
    let jumpBoost = 0

    for (const r of this.rampZones) {
      const dz = z - r.z
      const dx = x - r.x
      if (dz > -2 && dz < 4 && Math.abs(dx) < r.w) {
        // Peak boost near ramp lip
        const t = 1 - Math.abs(dz - 2) / 4
        jumpBoost = Math.max(jumpBoost, r.boost * t * Math.min(1, speed / 18))
      }
    }

    return { groundY, slope, jumpBoost }
  }

  propsNear(z: number, range = 80): Prop[] {
    return this.props.filter((p) => Math.abs(p.z - z) < range)
  }

  finished(z: number): boolean {
    return z >= this.length
  }
}
