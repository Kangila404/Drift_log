import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'

// Primary visual reference: VisitJeju, Bukchon Dolharubang Museum entry photograph.
// https://api.cdn.visitjeju.net/photomng/imgpath/201804/30/eb398171-d78d-4526-87b0-652fe69af7e4.webp
// This is an interpretation of photographed museum guardians, not a surveyed replica.
const PROFILE: readonly [number, number, number][] = [
  [0, 0.48, 0.38], [0.2, 0.52, 0.405], [0.65, 0.57, 0.43],
  [1.1, 0.59, 0.44], [1.5, 0.55, 0.4], [1.8, 0.45, 0.35],
  [2.05, 0.52, 0.39], [2.4, 0.635, 0.43], [2.9, 0.65, 0.43],
  [3.08, 0.62, 0.41], [3.13, 0.7, 0.49], [3.2, 0.75, 0.52],
  [3.29, 0.73, 0.5], [3.5, 0.61, 0.435], [3.68, 0.38, 0.29],
  [3.78, 0.12, 0.1], [3.8, 0, 0],
]

const HEIGHTS = [
  0, 0.16, 0.35, 0.55, 0.75, 0.9, 1, 1.08, 1.12, 1.16, 1.2, 1.24, 1.28, 1.32, 1.36, 1.4,
  1.44, 1.48, 1.52, 1.58, 1.72, 1.9, 2.02, 2.1, 2.16, 2.22, 2.3, 2.38, 2.46,
  2.54, 2.62, 2.68, 2.74, 2.77, 2.8, 2.86, 2.92, 3, 3.08, 3.11, 3.13,
  3.16, 3.2, 3.26, 3.32, 3.4, 3.48, 3.56, 3.64, 3.7, 3.75, 3.78,
] as const

function falloff(value: number, width: number): number {
  return Math.exp(-((value / width) ** 2) * 2)
}

function carvedOval(x: number, y: number, width: number, height: number): number {
  const distance = (x / width) ** 2 + (y / height) ** 2
  return Math.exp(-distance * distance * 2)
}

function sculptHeight(y: number): number {
  if (y <= 0.9) return y * 0.5 / 0.9
  if (y <= 1.58) return 0.5 + (y - 0.9) * 0.9 / 0.68
  if (y <= 2.02) return 1.4 + (y - 1.58) * 0.45 / 0.44
  if (y <= 3.08) return 1.85 + (y - 2.02) * 1.34 / 1.06
  return 3.19 + (y - 3.08) * 0.61 / 0.72
}

function radii(y: number): [number, number] {
  const upper = PROFILE.findIndex(p => p[0] >= y)
  if (upper <= 0) return [PROFILE[0][1], PROFILE[0][2]]
  const a = PROFILE[upper - 1], b = PROFILE[upper]
  const t = (y - a[0]) / (b[0] - a[0]), blend = t * t * (3 - 2 * t)
  return [THREE.MathUtils.lerp(a[1], b[1], blend), THREE.MathUtils.lerp(a[2], b[2], blend)]
}

function carving(x: number, y: number): number {
  let relief = 0
  for (const side of [-1, 1]) {
    const eyeX = side * 0.29
    // Brows grow into the nose bridge; eyes remain carved relief in the same stone.
    const browY = 2.875 + 0.025 * (1 - Math.min(1, Math.abs(x - eyeX) / 0.2))
    relief += 0.19 * falloff(x - eyeX, 0.27) * falloff(y - browY, 0.095)
    relief -= 0.065 * falloff(x - eyeX, 0.24) * falloff(y - 2.725, 0.18)
    relief += 0.24 * carvedOval(x - eyeX, y - 2.735, 0.175, 0.105)
    relief -= 0.032 * falloff(x - eyeX, 0.045) * falloff(y - 2.74, 0.04)
    relief += 0.035 * falloff(x - side * 0.33, 0.17) * falloff(y - 2.43, 0.24)

    // Bent arms remain attached; offset hands cross the stomach at unequal heights.
    const handY = side < 0 ? 1.4 : 1.16
    const armY = handY + 0.34 + 0.38 * (Math.abs(x) - 0.3)
    relief += 0.18 * falloff(x - side * 0.46, 0.2) * falloff(y - armY, 0.42)
    relief += 0.17 * carvedOval(x - side * 0.265, y - handY, 0.29, 0.2)
    relief += 0.12 * falloff(x - side * 0.37, 0.1) * falloff(y - handY - 0.12, 0.09)
    for (let finger = 0; finger < 3; finger++) {
      relief += 0.075 * falloff(x - side * 0.22, 0.27) * falloff(y - (handY - 0.08 + finger * 0.08), 0.025)
    }
  }

  const noseHeight = THREE.MathUtils.smoothstep(y, 2.3, 2.48) * (1 - THREE.MathUtils.smoothstep(y, 2.85, 3.02))
  relief += 0.37 * Math.exp(-((x / 0.165) ** 4) * 1.5) * noseHeight
  relief += 0.09 * falloff(x, 0.27) * falloff(y - 2.43, 0.12)
  for (const side of [-1, 1]) relief -= 0.026 * falloff(x - side * 0.115, 0.05) * falloff(y - 2.36, 0.05)
  relief += 0.035 * falloff(x, 0.27) * falloff(y - 2.18, 0.065)
  relief -= 0.045 * falloff(x, 0.235) * falloff(y - 2.125, 0.028)
  relief += 0.022 * falloff(x, 0.23) * falloff(y - 2.085, 0.045)
  return relief
}

/** One closed carved surface; 3.8 high, 1.5 wide, base y=0, centered X/Z, front +Z. */
export function buildCoastalMarker(kit: CityBuilder): void {
  const segments = 48, positions: number[] = [], indices: number[] = []
  for (const y of HEIGHTS) {
    const [rx, rz] = radii(y)
    for (let i = 0; i < segments; i++) {
      // Three quarters of each ring samples the carved front; the back is quiet stone.
      const theta = i < 36 ? -Math.PI / 2 + i * Math.PI / 36 : Math.PI / 2 + (i - 36) * Math.PI / 12
      const sin = Math.sin(theta), cos = Math.cos(theta)
      const x = rx * sin
      const front = THREE.MathUtils.smoothstep(cos, 0.05, 0.6)
      const wear = 0.004 * Math.sin(theta * 11 + y * 17) * Math.sin(theta * 7 - y * 23)
      const ear = 0.024 * falloff(Math.abs(sin) - 1, 0.08) * falloff(y - 2.6, 0.24)
      const facePlane = cos > 0 ? THREE.MathUtils.lerp(cos, cos ** 0.45, falloff(y - 2.6, 0.9) * 0.8) : cos
      positions.push(x + sin * (ear + wear), sculptHeight(y), rz * facePlane + front * carving(x, y) + cos * wear)
    }
  }

  for (let row = 0; row < HEIGHTS.length - 1; row++) {
    for (let i = 0; i < segments; i++) {
      const next = (i + 1) % segments
      const a = row * segments + i, b = row * segments + next
      const c = (row + 1) * segments + next, d = (row + 1) * segments + i
      indices.push(a, b, c, a, c, d)
    }
  }
  const bottom = positions.length / 3
  positions.push(0, 0, 0)
  const top = positions.length / 3
  positions.push(0, 3.8, 0)
  for (let i = 0; i < segments; i++) {
    const next = (i + 1) % segments, last = (HEIGHTS.length - 1) * segments
    indices.push(bottom, next, i, top, last + i, last + next)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeBoundingBox()
  const bounds = geometry.boundingBox!, center = bounds.getCenter(new THREE.Vector3())
  geometry.translate(-center.x, 0, -center.z)
  geometry.scale(1.5 / (bounds.max.x - bounds.min.x), 1, 1)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  geometry.name = 'coastal-dol-hareubang'
  kit.add('faded', geometry, 'masonry')
}
