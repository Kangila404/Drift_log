import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'
import { roofShell } from '../city/CityDetails'

export interface TileRoofOptions {
  width: number
  depth: number
  eaveY: number
  ridgeY: number
  hip?: boolean
}

type Point = [number, number, number]
const soffitThickness = .18

// Shared with gable infill and rafters: t=0 at the eave, t=1 at the X ridge.
export function createTileRoofProfile({ width, depth, eaveY, ridgeY, hip = true }: TileRoofOptions) {
  if (![width, depth, eaveY, ridgeY].every(Number.isFinite) || width <= 0 || depth <= 0 || ridgeY <= eaveY) {
    throw new Error('Tile roof requires finite positive dimensions and ridgeY above eaveY')
  }
  const halfW = width / 2, halfD = depth / 2, rise = ridgeY - eaveY
  const breakT = .5, hipRun = hip ? Math.min(depth * .2, width * .22) : 0
  const lift = Math.min(.22, rise * .07)
  const halfSpan = (t: number) => halfW - hipRun * Math.min(1, t / breakT)
  const height = (t: number) => eaveY + rise * (.55 * t + .45 * t * t)
  const point = (u: number, t: number, side = 1): Point => [
    u * halfSpan(t), height(t) + lift * Math.pow(u, 8) * Math.pow(1 - t, 3), side * halfD * (1 - t),
  ]
  const soffit = (u: number, t: number, side = 1): Point => {
    const p = point(u, t, side)
    p[1] -= soffitThickness
    return p
  }
  return { halfSpan, height, point, soffit, breakT, lift }
}

// Exact barycentric height on the gable deck's 8-by-6 mesh, without building geometry.
export function getGableSoffitHeight(options: TileRoofOptions, x: number, z: number): number {
  const profile = createTileRoofProfile({ ...options, hip: false })
  if (![x, z].every(Number.isFinite) || Math.abs(x) > options.width / 2 || Math.abs(z) > options.depth / 2) {
    throw new Error('Gable soffit sample must lie within the roof footprint')
  }
  const column = (x / options.width + .5) * 8, row = (1 - Math.abs(z) * 2 / options.depth) * 6
  const i = Math.min(7, Math.floor(column)), j = Math.min(5, Math.floor(row))
  const u = column - i, t = row - j
  const y = (a: number, b: number) => profile.soffit(a / 4 - 1, b / 6)[1]
  return u + t <= 1
    ? y(i, j) * (1 - u - t) + y(i + 1, j) * u + y(i, j + 1) * t
    : y(i + 1, j + 1) * (u + t - 1) + y(i, j + 1) * (1 - u) + y(i + 1, j) * (1 - t)
}

function panel(columns: number, rows: number, point: (u: number, t: number) => Point) {
  const vertices: number[] = [], indices: number[] = []
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= columns; i++) vertices.push(...point(i / columns * 2 - 1, j / rows))
  }
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * (columns + 1) + i, b = a + 1, c = a + columns + 1, d = c + 1
      const p = new THREE.Vector3().fromArray(vertices, a * 3)
      const q = new THREE.Vector3().fromArray(vertices, b * 3).sub(p)
      const r = new THREE.Vector3().fromArray(vertices, c * 3).sub(p)
      if (q.cross(r).y > 0) indices.push(a, b, c, b, d, c)
      else indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function tiledSlope(kit: CityBuilder, count: number, rows: number, point: (u: number, t: number) => Point, pitch: number, courseSpan?: (t: number) => number) {
  // Only the structural deck is shelled; the soffit has no tile corrugation.
  roofShell(kit, panel(8, rows, point), soffitThickness, 'steel', 'timber')
  const radiusU = .46 / count, capRise = Math.min(.16, pitch * .21)
  const cap = (center: number, u: number, t: number, overlap = 0): Point => {
    const angle = (u + 1) * Math.PI / 2
    let across = center - radiusU * Math.cos(angle)
    if (courseSpan) {
      // Tile courses stay parallel; outer courses terminate at the hip junction.
      const half = courseSpan(0), end = courseSpan(1), extent = (Math.abs(center) + radiusU) * half
      const length = extent > end ? .5 * (half - extent) / (half - end) : 1
      t *= length
      across *= half / courseSpan(t)
    }
    const p = point(across, t)
    p[1] += .028 + (capRise + overlap) * Math.sin(angle)
    return p
  }
  for (let i = 0; i < count; i++) {
    const center = -1 + (i * 2 + 1) / count
    kit.add('steel', panel(4, rows, (u, t) => cap(center, u, t)), 'tile')
    const vertices: number[] = [], middle = point(center, 0)
    middle[1] += .028
    const outward = new THREE.Vector3(...point(center, 0)).sub(new THREE.Vector3(...point(center, .01)))
    for (let j = 0; j < 6; j++) {
      const a = cap(center, j / 3 - 1, 0), b = cap(center, (j + 1) / 3 - 1, 0)
      const normal = new THREE.Vector3(...a).sub(new THREE.Vector3(...middle))
        .cross(new THREE.Vector3(...b).sub(new THREE.Vector3(...middle)))
      vertices.push(...middle, ...(normal.dot(outward) > 0 ? [...a, ...b] : [...b, ...a]))
    }
    const end = new THREE.BufferGeometry()
    end.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
    end.computeVertexNormals()
    kit.add('steel', end, 'tile')
    if (i % 4 === 1) {
      for (const t of [.28, .66]) {
        kit.add('steel', panel(6, 1, (u, v) => cap(center, u, t + v * .025, .023 * (1 - v))), 'tile')
      }
    }
  }
  for (let i = 0; !courseSpan && i <= count; i++) {
    const left = i === 0 ? -1 : -1 + (i * 2 - 1) / count + radiusU
    const right = i === count ? 1 : -1 + (i * 2 + 1) / count - radiusU
    kit.add('steel', panel(2, rows, (u, t) => {
      const p = point(left + (right - left) * (u + 1) / 2, t)
      p[1] += .008 + .02 * u * u
      return p
    }), 'tile')
  }
}

function ridge(kit: CityBuilder, points: Point[], radius: number, segments = 12) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
  kit.add('edge', new THREE.TubeGeometry(curve, segments, radius, 8, false), 'tile')
}

export function buildTileRoof(kit: CityBuilder, options: TileRoofOptions) {
  const { width, depth, ridgeY, hip = true } = options
  const profile = createTileRoofProfile(options)
  const { point, halfSpan, height, breakT, lift } = profile
  const count = Math.max(6, Math.min(24, Math.round(width / .7)))
  for (const side of [-1, 1]) {
    tiledSlope(kit, count, 6, (u, t) => point(u, t, side), width / count, hip ? halfSpan : undefined)
    if (hip) {
      const endCount = Math.max(4, Math.min(12, Math.round(depth / .8)))
      tiledSlope(kit, endCount, 3, (u, v) => {
        const t = v * breakT
        return [side * halfSpan(t), height(t) + lift * Math.pow(u, 8) * Math.pow(1 - t, 3), u * depth / 2 * (1 - t)]
      }, depth / endCount)
      const outline = new THREE.Shape()
      outline.moveTo(-depth / 2 * (1 - breakT), height(breakT) - .34)
      for (let j = 0; j <= 6; j++) {
        const p = profile.soffit(1, breakT + (1 - breakT) * j / 6, -1)
        outline.lineTo(p[2], p[1])
      }
      for (let j = 1; j <= 6; j++) {
        const p = profile.soffit(1, 1 - (1 - breakT) * j / 6)
        outline.lineTo(p[2], p[1])
      }
      outline.lineTo(depth / 2 * (1 - breakT), height(breakT) - .34)
      outline.closePath()
      kit.add('paint', new THREE.ExtrudeGeometry(outline, { depth: .14, bevelEnabled: false })
        .rotateY(Math.PI / 2).translate(side * (halfSpan(1) - .1), 0, 0), 'timber')
      kit.box('faded', [.24, .2, depth * (1 - breakT)],
        [side * halfSpan(1), height(breakT) - .18, 0], [0, 0, 0], 'timber')
      for (const face of [-1, 1]) {
        ridge(kit, Array.from({ length: 13 }, (_, i) => {
          const p = point(side, i / 12, face)
          p[1] += .09
          return p
        }), .14, 16)
      }
    }
  }
  ridge(kit, Array.from({ length: 9 }, (_, i) => {
    const u = i / 4 - 1
    return [u * halfSpan(1), ridgeY + .035 + (hip ? .07 * Math.pow(u, 8) : 0), 0]
  }), .21, 24)
}
