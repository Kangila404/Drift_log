import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import type { CitySurface } from '../city/CitySurfaces'

export type CoastalHomeKind = 'stone' | 'hip' | 'workshop' | 'flat' | 'thatch'

// Outer envelopes include eaves. Base y=0, entrance side +Z; placement determines flood depth.
export const HOME_SPECS = {
  stone: { width: 11, depth: 8, eave: 5.6, ridge: 7.4 },
  hip: { width: 14, depth: 10, eave: 5.1, ridge: 7.3 },
  workshop: { width: 15, depth: 9, eave: 5.8, ridge: 6.8 },
  flat: { width: 9, depth: 9, eave: 8.3, ridge: 8.3 },
  thatch: { width: 9, depth: 7, eave: 4.5, ridge: 6.1 },
} as const

type Point = [number, number, number]
type Opening = { x: number; bottom: number; width: number; height: number; door?: boolean; inset?: number }
type Wall = { width: number; height: number; origin: Point; angle: number; openings: Opening[] }
const WALL_THICKNESS = 0.52

function random(seed: number): number {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return value - Math.floor(value)
}

function localPoint(wall: Wall, x: number, y: number, z: number): Point {
  const c = Math.cos(wall.angle), s = Math.sin(wall.angle)
  return [wall.origin[0] + c * x + s * z, y, wall.origin[2] - s * x + c * z]
}

function wallBox(kit: CityBuilder, wall: Wall, finish: CityFinish, size: Point, p: Point, surface?: CitySurface) {
  kit.box(finish, size, localPoint(wall, ...p), [0, wall.angle, 0], surface)
}

function polygon(points: [number, number][]): THREE.Shape {
  const shape = new THREE.Shape()
  shape.moveTo(...points[0])
  points.slice(1).forEach(p => shape.lineTo(...p))
  shape.closePath()
  return shape
}

function wallExtrusion(kit: CityBuilder, wall: Wall, shape: THREE.Shape, depth: number, offset: number, finish: CityFinish, name: string, surface: CitySurface) {
  const relief = name === 'basalt-relief'
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: relief, bevelSize: .045, bevelThickness: .025, bevelSegments: 1, steps: 1, curveSegments: 1 })
  geometry.translate(0, 0, offset)
  geometry.rotateY(wall.angle)
  geometry.translate(...wall.origin)
  geometry.name = name
  kit.add(finish, geometry, surface)
}

// Closed convex solids: orient every face against its interior, including roof bottoms.
function solid(kit: CityBuilder, finish: CityFinish, vertices: Point[], faces: number[][], name: string, surface: CitySurface) {
  const points = vertices.map(p => new THREE.Vector3(...p))
  const center = points.reduce((sum, p) => sum.add(p), new THREE.Vector3()).multiplyScalar(1 / points.length)
  const positions: number[] = []
  for (const face of faces) {
    for (let i = 1; i < face.length - 1; i++) {
      const a = points[face[0]], b = points[face[i]], c = points[face[i + 1]]
      const normal = b.clone().sub(a).cross(c.clone().sub(a))
      const outward = a.clone().add(b).add(c).multiplyScalar(1 / 3).sub(center)
      const triangle = normal.dot(outward) > 0 ? [a, b, c] : [a, c, b]
      triangle.forEach(p => positions.push(p.x, p.y, p.z))
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  geometry.name = name
  kit.add(finish, geometry, surface)
}

function roofPatch(kit: CityBuilder, corners: Point[], thickness: number, name: string, surface: CitySurface = 'tile') {
  solid(kit, 'rust', [...corners, ...corners.map(([x, y, z]): Point => [x, y - thickness, z])],
    [[0, 1, 2, 3], [7, 6, 5, 4], [0, 4, 5, 1], [1, 5, 6, 2], [2, 6, 7, 3], [3, 7, 4, 0]], name, surface)
}

function roofCap(kit: CityBuilder, from: Point, to: Point, radius: number) {
  const start = new THREE.Vector3(...from), end = new THREE.Vector3(...to)
  const direction = end.clone().sub(start)
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 8, 1, false)
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
  geometry.translate(...start.add(end).multiplyScalar(0.5).toArray())
  geometry.name = 'closed-roof-cap'
  kit.add('rust', geometry, 'tile')
}

function wallFabric(kit: CityBuilder, wall: Wall, seed: number, stone: boolean) {
  // Plaster wear belongs to the shared shader; relief is confined to masonry walls.
  if (!stone) return
  const rows = Math.floor((wall.height - 0.28) / 0.64)
  for (let row = 0; row < rows; row++) {
    const y = 0.38 + row * 0.64
    if (y > 2.1) continue
    const count = Math.ceil(wall.width / 0.88)
    const step = wall.width / count
    for (let col = 0; col < count; col++) {
      const n = seed + row * 53 + col * 17
      const x = -wall.width / 2 + step * (col + 0.5) + (row % 2 ? 0.16 : -0.08)
      const w = step * (0.9 + random(n) * 0.05), h = 0.55 + random(n + 1) * 0.035
      if (Math.abs(x) + w / 2 > wall.width / 2 - 0.04) continue
      if (wall.openings.some(o => Math.abs(x - o.x) < o.width / 2 + w / 2 + 0.15 && y + h / 2 > o.bottom - 0.13 && y - h / 2 < o.bottom + o.height + 0.13)) continue
      const cut = w * (0.09 + random(n + 2) * 0.08)
      const shape = polygon([
        [x - w / 2 + cut, y - h / 2], [x + w / 2 - cut, y - h * 0.46],
        [x + w / 2, y + h * 0.2], [x + w / 2 - cut, y + h / 2],
        [x - w / 2 + cut, y + h * 0.46], [x - w / 2, y - h * 0.1],
      ])
      wallExtrusion(kit, wall, shape, 0.055 + random(n + 3) * 0.025, -0.03, 'edge', 'basalt-relief', 'masonry')
    }
  }
}

function buildWall(kit: CityBuilder, wall: Wall, seed: number, stone: boolean, warm: boolean) {
  const shape = polygon([[-wall.width / 2, 0.18], [wall.width / 2, 0.18], [wall.width / 2, wall.height], [-wall.width / 2, wall.height]])
  for (const o of wall.openings) {
    const hole = new THREE.Path()
    hole.moveTo(o.x - o.width / 2, o.bottom)
    hole.lineTo(o.x - o.width / 2, o.bottom + o.height)
    hole.lineTo(o.x + o.width / 2, o.bottom + o.height)
    hole.lineTo(o.x + o.width / 2, o.bottom)
    hole.closePath()
    shape.holes.push(hole)
  }
  wallExtrusion(kit, wall, shape, WALL_THICKNESS, -WALL_THICKNESS, stone ? 'edge' : 'concrete', 'perforated-wall', stone ? 'masonry' : 'plaster')
  wallFabric(kit, wall, seed, stone)
  for (const [index, o] of wall.openings.entries()) {
    const cy = o.bottom + o.height / 2, inset = o.inset ?? 0.72
    const jamb = o.inset ? 0.2 : 0.16
    // Frames penetrate the reveal by 3 cm, avoiding coincident masonry/wood faces.
    for (const side of [-1, 1]) {
      wallBox(kit, wall, 'trim', [jamb, o.height - 0.2, 0.36], [o.x + side * (o.width / 2 + 0.03 - jamb / 2), cy - 0.08, -0.26], 'timber')
    }
    wallBox(kit, wall, 'trim', [o.width + 0.06, 0.21, 0.38], [o.x, o.bottom + o.height - 0.075, -0.25], 'timber')
    wallBox(kit, wall, 'edge', [o.width + 0.18, 0.16, 0.64], [o.x, o.bottom - 0.04, -0.16], 'masonry')
    // A complete recessed box behind the hole supplies side returns and a dark interior.
    for (const side of [-1, 1]) wallBox(kit, wall, 'dark', [0.08, o.height, inset], [o.x + side * (o.width / 2 + 0.04), cy, -inset / 2])
    wallBox(kit, wall, 'dark', [o.width, 0.08, inset], [o.x, o.bottom + o.height + 0.04, -inset / 2])
    wallBox(kit, wall, 'dark', [o.width, o.height, 0.1], [o.x, cy, -inset - 0.08])
    if (!o.door) {
      wallBox(kit, wall, 'glass', [o.width - 0.29, o.height - 0.3, 0.06], [o.x, cy, -inset + 0.03])
      wallBox(kit, wall, 'trim', [0.075, o.height - 0.24, 0.1], [o.x - o.width * 0.12, cy, -inset + 0.09], 'timber')
      const divider = o.x - o.width * 0.12
      for (const [left, right] of [[o.x - o.width / 2 + 0.12, divider - 0.0375], [divider + 0.0375, o.x + o.width / 2 - 0.12]]) {
        wallBox(kit, wall, 'trim', [right - left, 0.065, 0.1], [(left + right) / 2, cy + o.height * 0.18, -inset + 0.09], 'timber')
      }
      const shutterWidth = Math.min(0.6, o.width * 0.28)
      wallBox(kit, wall, 'paint', [shutterWidth, o.height - 0.18, 0.1], [o.x + o.width / 2 - shutterWidth / 2 - 0.13, cy, -0.45], 'timber')
    } else {
      const leaf = o.width * 0.32
      wallBox(kit, wall, 'paint', [leaf, o.height - 0.2, 0.13], [o.x - o.width / 2 + leaf / 2 + 0.12, cy, -0.48], 'timber')
      for (let j = 0; j < 3; j++) wallBox(kit, wall, 'trim', [0.035, o.height - 0.32, 0.045], [o.x - o.width / 2 + 0.2 + j * leaf / 3, cy, -0.395], 'timber')
      wallBox(kit, wall, 'steel', [0.06, 0.26, 0.06], [o.x - o.width / 2 + leaf - 0.02, cy - 0.14, -0.37])
      if (warm && index === 0) {
        wallBox(kit, wall, 'glazing', [o.width * .28, o.height * .78, .04], [o.x + o.width * .25, cy, -inset + .01])
        for (let slat = 0; slat < 3; slat++) wallBox(kit, wall, 'dark', [.025, o.height * .78, .055], [o.x + o.width * (.14 + slat * .11), cy, -inset + .04], 'timber')
      }
    }
  }
}

function thatchRoof(kit: CityBuilder) {
  const { width: w, depth: d, eave, ridge } = HOME_SPECS.thatch
  const halfAt = (z: number) => w / 2 - .4 * (Math.abs(z) / (d / 2)) ** 8
  const heightAt = (x: number, z: number) => {
    const end = Math.max(0, Math.abs(x) - 1.7) / (halfAt(z) - 1.7)
    const height = Math.min(Math.sqrt(Math.max(0, 1 - (z / (d / 2)) ** 2)), Math.sqrt(Math.max(0, 1 - end ** 2)))
    return eave + .08 + (ridge - eave - .08) * height
  }
  const nx = 24, nz = 16, positions: number[] = [], indices: number[] = []
  for (const bottom of [false, true]) for (let j = 0; j <= nz; j++) {
    const z = -d / 2 + d * j / nz
    for (let i = 0; i <= nx; i++) {
      const x = (-1 + 2 * i / nx) * halfAt(z)
      positions.push(x, bottom ? eave - .25 : heightAt(x, z), z)
    }
  }
  const count = (nx + 1) * (nz + 1)
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = b + nx + 1, d0 = a + nx + 1
    indices.push(a, d0, b, b, d0, c, a + count, b + count, d0 + count, b + count, c + count, d0 + count)
  }
  const outline = [
    ...Array.from({ length: nx }, (_, i) => i),
    ...Array.from({ length: nz }, (_, j) => j * (nx + 1) + nx),
    ...Array.from({ length: nx }, (_, i) => nz * (nx + 1) + nx - i),
    ...Array.from({ length: nz }, (_, j) => (nz - j) * (nx + 1)),
  ]
  for (let i = 0; i < outline.length; i++) {
    const a = outline[i], b = outline[(i + 1) % outline.length]
    indices.push(a, b, b + count, a, b + count, a + count)
  }
  const roof = new THREE.BufferGeometry()
  roof.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  roof.setIndex(indices)
  roof.computeVertexNormals()
  kit.add('faded', roof, 'timber')
  // Wind ties follow the curved thatch instead of hovering over a rigid tiled hip.
  const tie = (points: THREE.Vector3[]) => kit.add('edge', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, .023, 4, false), 'timber')
  for (let i = 0; i < 7; i++) {
    const x = -3.55 + i * 7.1 / 6
    tie(Array.from({ length: 13 }, (_, j) => {
      const z = -d / 2 + .06 + j * (d - .12) / 12
      return new THREE.Vector3(x, heightAt(x, z) + .04, z)
    }))
  }
  for (const z of [-2.4, -.85, .85, 2.4]) tie(Array.from({ length: 13 }, (_, j) => {
    const x = (-1 + 2 * j / 12) * (halfAt(z) - .06)
    return new THREE.Vector3(x, heightAt(x, z) + .045, z)
  }))
  for (const side of [-1, 1]) for (let i = 0; i < 37; i++) {
    const x = -4.02 + i * 8.04 / 36
    kit.beam('faded', [x, eave - .19 + random(i) * .045, side * (d / 2 - .015)],
      [x, heightAt(x, side * (d / 2 - .16)), side * (d / 2 - .16)], .095, .075, 'timber')
  }
}

function hipRoof(kit: CityBuilder, kind: Exclude<CoastalHomeKind, 'flat'>) {
  if (kind === 'thatch') { thatchRoof(kit); return }
  const { width: w, depth: d, eave, ridge } = HOME_SPECS[kind]
  const sheet = kind === 'workshop'
  const top = ridge - (sheet ? 0.13 : 0.19), bottom = eave - 0.22
  const run = d * .37, rx = w / 2 - run
  const y0 = eave + 0.08
  const vertices: Point[] = [[-w / 2, y0, -d / 2], [w / 2, y0, -d / 2], [w / 2, y0, d / 2], [-w / 2, y0, d / 2], [-rx, top, 0], [rx, top, 0],
    [-w / 2, bottom, -d / 2], [w / 2, bottom, -d / 2], [w / 2, bottom, d / 2], [-w / 2, bottom, d / 2]]
  solid(kit, 'rust', vertices, [[0, 1, 5, 4], [1, 2, 5], [2, 3, 4, 5], [3, 0, 4], [0, 6, 7, 1], [1, 7, 8, 2], [2, 8, 9, 3], [3, 9, 6, 0], [6, 9, 8, 7]], 'closed-hip-roof', sheet ? 'sheet' : 'tile')
  const roofY = (x: number, z: number) => y0 + (top - y0) * Math.max(0, Math.min(1 - Math.abs(z) / (d / 2), (w / 2 - Math.abs(x)) / run))
  // Individual broad overlapping tiles keep their courses horizontal and terminate at hips.
  if (!sheet) {
    const rows = Math.ceil(d / 1.45)
    for (const side of [-1, 1]) {
      for (let row = 0; row < rows; row++) {
        const t0 = row / rows, t1 = Math.min(0.985, (row + 1.14) / rows)
        const half0 = w / 2 - run * t0, half1 = w / 2 - run * t1
        const columns = Math.ceil(2 * half0 / .65)
        for (let col = 0; col < columns; col++) {
          const a = col / columns, b = (col + 0.95) / columns
          const z0 = side * d / 2 * (1 - t0), z1 = side * d / 2 * (1 - t1)
          const x00 = -half0 + 2 * half0 * a, x01 = -half0 + 2 * half0 * b
          const x10 = -half1 + 2 * half1 * a, x11 = -half1 + 2 * half1 * b
          roofPatch(kit, [[x00, roofY(x00, z0) + 0.15, z0], [x01, roofY(x01, z0) + 0.15, z0], [x11, roofY(x11, z1) + 0.025, z1], [x10, roofY(x10, z1) + 0.025, z1]], 0.17, 'tile-course')
        }
      }
      for (let row = 0; row < rows; row++) {
        const t0 = row / rows, t1 = Math.min(0.985, (row + 1.14) / rows)
        const z0 = d / 2 * (1 - t0), z1 = d / 2 * (1 - t1)
        const columns = Math.max(1, Math.ceil(z0 * 2 / .65))
        for (let col = 0; col < columns; col++) {
          const a = col / columns, b = (col + 0.95) / columns
          const x0 = side * (w / 2 - run * t0), x1 = side * (w / 2 - run * t1)
          roofPatch(kit, [[x0, y0 + (top - y0) * t0 + 0.15, -z0 + 2 * z0 * a], [x0, y0 + (top - y0) * t0 + 0.15, -z0 + 2 * z0 * b], [x1, y0 + (top - y0) * t1 + 0.025, -z1 + 2 * z1 * b], [x1, y0 + (top - y0) * t1 + 0.025, -z1 + 2 * z1 * a]], 0.17, 'hip-tile-course')
        }
      }
    }
  }
  {
    if (sheet) kit.box('rust', [rx * 2 + 0.16, 0.13, 0.22], [0, ridge - 0.065, 0], undefined, 'sheet')
    else {
      roofCap(kit, [-rx - 0.08, ridge - 0.13, 0], [rx + 0.08, ridge - 0.13, 0], 0.13)
      for (const xSign of [-1, 1]) for (const zSign of [-1, 1]) {
        const x = xSign * (w / 2 - 0.16), z = zSign * (d / 2 - 0.16)
        roofCap(kit, [x, roofY(x, z) + 0.12, z], [xSign * rx, top + 0.075, 0], 0.1)
      }
    }
    if (sheet) {
      for (let i = 0; i < 14; i++) {
        const x = -w / 2 + 0.35 + i * (w - 0.7) / 13
        for (const side of [-1, 1]) {
          const z = Math.max(0.05, (1 - (w / 2 - Math.abs(x)) / run) * d / 2)
          kit.beam('rust', [x, y0 + 0.045, side * (d / 2 - 0.04)], [x, roofY(x, z) + 0.045, side * z], 0.045, 0.055, 'sheet')
        }
      }
    }
  }
  for (const side of [-1, 1]) {
    kit.box('trim', [w - 0.32, 0.16, 0.15], [0, eave - 0.32, side * (d / 2 - 0.62)], undefined, 'timber')
    for (let i = 0; i < Math.floor(w / 0.67); i++) {
      const x = -w / 2 + 0.43 + i * (w - 0.86) / (Math.floor(w / 0.67) - 1)
      kit.beam('trim', [x, eave - 0.34, side * (d / 2 - 0.08)], [x, eave - 0.18, side * (d / 2 - 0.94)], 0.12, 0.16, 'timber')
    }
    for (let i = 0; i < Math.floor(d / 0.75); i++) {
      const z = -d / 2 + 0.4 + i * (d - 0.8) / (Math.floor(d / 0.75) - 1)
      kit.beam('trim', [side * (w / 2 - 0.08), eave - 0.34, z], [side * (w / 2 - 0.87), eave - 0.18, z], 0.12, 0.16, 'timber')
    }
  }
}

export function buildCoastalHome(kit: CityBuilder, kind: CoastalHomeKind): void {
  const spec = HOME_SPECS[kind], flat = kind === 'flat'
  const w = spec.width - (flat ? 0.5 : 1.3), d = spec.depth - (flat ? 0.5 : 1.3)
  const h = flat ? 7.72 : spec.eave - 0.29
  const front: Opening[] = kind === 'stone'
    ? [{ x: -2.1, bottom: 0.42, width: 1.65, height: 3.8, door: true }, { x: 1.95, bottom: 2.05, width: 2.25, height: 1.85 }]
    : kind === 'hip'
      ? [{ x: -1.55, bottom: 0.42, width: 4.2, height: 3.7, door: true, inset: 1.3 }, { x: 3.65, bottom: 1.85, width: 2.0, height: 1.9 }]
      : kind === 'workshop'
        ? [{ x: 2.3, bottom: 0.35, width: 5.4, height: 4.7, door: true, inset: 1.45 }, { x: -4.55, bottom: 1.95, width: 2.0, height: 1.65 }]
        : kind === 'flat'
          ? [{ x: -1.8, bottom: 0.4, width: 1.65, height: 3.8, door: true }, { x: 1.65, bottom: 2.0, width: 2.2, height: 1.85 }, { x: 0.9, bottom: 5.7, width: 2.9, height: 0.95 }]
          : [{ x: -1.25, bottom: 0.4, width: 1.6, height: 3.0, door: true }, { x: 1.9, bottom: 1.7, width: 1.45, height: 1.45 }]
  const walls: Wall[] = [
    { width: w, height: h, origin: [0, 0, d / 2], angle: 0, openings: front },
    { width: d - WALL_THICKNESS * 2, height: h, origin: [w / 2, 0, 0], angle: Math.PI / 2, openings: [{ x: -0.75, bottom: flat ? 2.2 : 1.85, width: kind === 'workshop' ? 3.1 : 1.55, height: flat ? 2.0 : 1.5 }] },
    { width: w, height: h, origin: [0, 0, -d / 2], angle: Math.PI, openings: [{ x: w * 0.18, bottom: 2.1, width: 1.2, height: 1.2 }] },
    { width: d - WALL_THICKNESS * 2, height: h, origin: [-w / 2, 0, 0], angle: -Math.PI / 2, openings: [{ x: 0.6, bottom: 1.95, width: 1.4, height: 1.4 }] },
  ]
  kit.box('edge', [w, 0.24, d], [0, 0.12, 0], undefined, 'masonry')
  kit.box('dark', [w - 0.4, 0.15, d - 0.4], [0, 0.28, 0])
  walls.forEach((wall, i) => buildWall(kit, wall, i * 103 + spec.width * 17, kind === 'stone' || kind === 'thatch', i === 0 && (kind === 'stone' || kind === 'hip')))
  kit.box('dark', [w, 0.24, d], [0, h + 0.04, 0])
  if (flat) {
    kit.box('concrete', [spec.width, 0.3, spec.depth], [0, 7.87, 0], undefined, 'plaster')
    kit.box('dark', [spec.width - 0.44, 0.07, spec.depth - 0.44], [0, 8.035, 0])
    for (const side of [-1, 1]) {
      kit.box('concrete', [spec.width, 0.28, 0.22], [0, 8.16, side * (spec.depth / 2 - 0.11)], undefined, 'plaster')
      kit.box('concrete', [0.22, 0.28, spec.depth - 0.44], [side * (spec.width / 2 - 0.11), 8.16, 0], undefined, 'plaster')
    }
    kit.box('concrete', [5.5, 0.18, 0.57], [-0.35, 4.52, d / 2 - 0.04], undefined, 'plaster')
    kit.box('steel', [0.12, 6.95, 0.12], [w / 2 - 0.25, 3.75, d / 2 + 0.12])
  } else hipRoof(kit, kind)
  if (kind === 'hip' || kind === 'workshop') {
    const bay = front[0], wall = walls[0]
    if (kind === 'hip') wallBox(kit, wall, 'trim', [0.16, bay.height - 0.2, 0.22], [bay.x - 0.25, bay.bottom + bay.height / 2 - 0.08, -0.26], 'timber')
    else wallBox(kit, wall, 'steel', [bay.width + 0.35, 0.1, 0.17], [bay.x, bay.bottom + bay.height + 0.31, 0.12])
  }
}
