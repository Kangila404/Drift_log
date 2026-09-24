import * as THREE from 'three'
import { WAKE_CAPACITY, WAKE_STERN_Z, wakeEnvelope, type WakePose, type WakeTrail } from './WakeTrail'

export interface WakeSheet {
  geometry: THREE.BufferGeometry
  rows: number
  columns: number
  positions: Float32Array
  strength: Float32Array
  crest: Float32Array
  uv: Float32Array
}

function sheet(rows: number, columns: number): WakeSheet {
  const count = (rows + 1) * columns
  const positions = new Float32Array(count * 3), strength = new Float32Array(count)
  const crest = new Float32Array(count), uv = new Float32Array(count * 2)
  const indices: number[] = []
  for (let row = 0; row <= rows; row++) for (let col = 0; col < columns; col++) {
    const i = row * columns + col
    uv.set([row / rows, col / (columns - 1)], i * 2)
    if (row < rows && col < columns - 1) indices.push(i, i + columns, i + 1, i + 1, i + columns, i + columns + 1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setIndex(indices)
  for (const [name, array, size] of [['position', positions, 3], ['strength', strength, 1], ['crest', crest, 1], ['uv', uv, 2]] as const) {
    geometry.setAttribute(name, new THREE.BufferAttribute(array, size).setUsage(THREE.DynamicDrawUsage))
  }
  return { geometry, rows, columns, positions, strength, crest, uv }
}

export function createWakeSheets() {
  return { shoulders: [sheet(32, 9), sheet(32, 9)], stern: sheet(WAKE_CAPACITY, 29) }
}
export type WakeSheets = ReturnType<typeof createWakeSheets>

const bell = (x: number, width: number) => Math.exp(-((x / width) ** 2))
const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t) }

export function waterlineBeam(t: number) {
  const beam = .025 + 1.17 * (1 - Math.exp(-t * 9)) * (1 - .24 * t * t)
  const sheer = .39 + .24 * (1 - t) ** 3 + .07 * t ** 4
  const keel = -.79 + .43 * (1 - t) ** 4 + .12 * t ** 5
  const cosine = 1 - Math.max(0, Math.min(1, ((-.7 / 1.8 + .16) - keel) / (sheer - keel)))
  return beam * Math.sqrt(1 - cosine * cosine) * 1.8
}

export function updateWakeSheets(sheets: WakeSheets, trail: WakeTrail, pose: WakePose, phase: number) {
  const speed = Math.max(0, Math.min(1, pose.speed))
  const c = Math.cos(pose.heading), s = Math.sin(pose.heading)
  sheets.shoulders.forEach((strip, sideIndex) => {
    const side = sideIndex ? 1 : -1
    for (let row = 0; row <= strip.rows; row++) {
      const t = row / strip.rows, z = -4.65 + t * 8.55
      const beam = waterlineBeam(t)
      const shoulder = bell(t - .23, .15) * .8 + bell(t - .9, .17)
      const ends = Math.min(1, t * 15) * Math.min(1, (1 - t) * 18)
      const energy = shoulder * ends * speed
      const width = .38 + .42 * shoulder
      const pulse = .83 + .12 * Math.sin(t * 18 - phase * 3.2 + side * 1.3) + .05 * Math.sin(t * 37 + phase * 2)
      for (let col = 0; col < strip.columns; col++) {
        const q = col / (strip.columns - 1), i = row * strip.columns + col
        const crestAt = .39 + .04 * Math.sin(t * 22 - phase * 2.4 + side)
        const profile = q < crestAt ? smooth(q / crestAt) : smooth((1 - q) / (1 - crestAt))
        const x = side * (beam - .025 + q * width)
        strip.positions.set([pose.x + x * c + z * s, .23 * profile * energy * pulse, -4 + z * c - x * s], i * 3)
        strip.strength[i] = energy * smooth(q / .12) * smooth((1 - q) / .23)
        strip.crest[i] = bell(q - crestAt, .15) * energy * pulse
        strip.uv.set([z - phase * 1.25, q], i * 2)
      }
    }
  })

  const strip = sheets.stern
  const attached = speed > .025 && trail.points.length > 0
  const count = Math.min(strip.rows + 1, trail.points.length + Number(attached))
  strip.geometry.setDrawRange(0, Math.max(0, count - 1) * (strip.columns - 1) * 6)
  for (let row = 0; row < count; row++) {
    const p = attached && row === 0 ? {
      x: pose.x + s * WAKE_STERN_Z, z: -4 + c * WAKE_STERN_Z,
      heading: pose.heading, age: 0, strength: speed, seed: trail.serial + trail.accumulator * 10 - 1,
    } : trail.points[row - Number(attached)]
    const fade = wakeEnvelope(p.age)
    const settle = 1 - smooth((p.age - .18) / .82)
    const envelope = fade * p.strength * settle
    const halfWidth = 1.95 + p.age * .75
    for (let col = 0; col < strip.columns; col++) {
      const u = col / (strip.columns - 1) * 2 - 1, i = row * strip.columns + col
      const side = u < 0 ? -1 : 1
      const ridgeAt = .74 - p.age * .025 + .035 * Math.sin(p.seed * .57 + side * 2)
      const lip = bell(Math.abs(u) - ridgeAt, .075)
      const water = Math.max(0, 1 - u * u)
      const broken = .64 + .23 * Math.sin(p.seed * .66 + side * 1.7) + .13 * Math.sin(p.seed * 1.57 - side)
      // Two short peeling lobes, separated by clean water rather than a foam carpet.
      const fold = bell(p.age - .28 - .2 * Math.abs(u), .2) * bell(u, .55) * .045
      const inner = ridgeAt - .2, lateral = Math.abs(u)
      const profile = lateral < ridgeAt ? smooth((lateral - inner) / .2) : smooth((1 - lateral) / (1 - ridgeAt))
      const release = .72 + .28 * smooth(p.age / .18)
      const lift = (.3 * profile * broken + fold * water) * envelope * release
      const x = u * halfWidth
      strip.positions.set([p.x + Math.cos(p.heading) * x, lift, p.z - Math.sin(p.heading) * x], i * 3)
      strip.strength[i] = envelope * smooth((lateral - inner) / .08) * smooth((1 - lateral) / .13)
      const breaking = bell(p.age - (side > 0 ? .22 : .12), side > 0 ? .58 : .42)
      strip.crest[i] = lip * broken * envelope * breaking
      strip.uv.set([p.seed * .27, u * 1.4], i * 2)
    }
  }
  // computeVertexNormals also visits indices outside drawRange. Collapse unused
  // rows to the final active row so stale geometry cannot affect its shading.
  if (count > 0) {
    const last = (count - 1) * strip.columns * 3
    for (let row = count; row <= strip.rows; row++) {
      strip.positions.copyWithin(row * strip.columns * 3, last, last + strip.columns * 3)
    }
    strip.strength.fill(0, count * strip.columns)
    strip.crest.fill(0, count * strip.columns)
  } else {
    strip.positions.fill(0); strip.strength.fill(0); strip.crest.fill(0)
  }
  for (const strip of [...sheets.shoulders, sheets.stern]) {
    for (const name of ['position', 'strength', 'crest', 'uv']) strip.geometry.attributes[name].needsUpdate = true
    strip.geometry.computeVertexNormals()
  }
}
