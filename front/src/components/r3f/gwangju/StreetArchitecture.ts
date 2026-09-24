import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { roofShell, windowWall, type WallOpening } from '../city/CityDetails'
import type { Outline, Point } from '../city/CityPrimitives'
import type { CitySurface } from '../city/CitySurfaces'

// Ground is y=0, the shared flood is y=4.25, and the street-facing axis is +Z.
// Clockwise X/Z footprints keep each facade's local +Z pointed outside.
interface WindowRow { y: number; height: number; bay: number; width?: number }
const WALL = .55

function rectangle(x: number, z: number, width: number, depth: number): Outline {
  return [[x - width / 2, z + depth / 2], [x + width / 2, z + depth / 2],
    [x + width / 2, z - depth / 2], [x - width / 2, z - depth / 2]]
}

function slab(kit: CityBuilder, plan: Outline, y: number, thickness: number, finish: CityFinish = 'edge', surface: CitySurface = 'masonry') {
  const shape = new THREE.Shape(plan.map(([x, z]) => new THREE.Vector2(x, -z)))
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, steps: 1 })
  kit.add(finish, geometry.rotateX(-Math.PI / 2).translate(0, y, 0), surface)
}

function edgeFrame(a: Outline[number], b: Outline[number], y: number) {
  const dx = b[0] - a[0], dz = b[1] - a[1]
  const width = Math.hypot(dx, dz), yaw = Math.atan2(-dz, dx)
  const at: Point = [(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2]
  const point = (x: number, h: number, recess: number): Point =>
    [at[0] + Math.cos(yaw) * x + Math.sin(yaw) * recess, y + h,
      at[2] - Math.sin(yaw) * x + Math.cos(yaw) * recess]
  return { at, width, yaw, point }
}

function facade(kit: CityBuilder, a: Outline[number], b: Outline[number], y: number, height: number,
  rows: WindowRow[], finish: CityFinish, surface: CitySurface, seed = 0) {
  const frame = edgeFrame(a, b, y)
  const openings: WallOpening[] = []
  for (const row of rows) {
    const count = Math.max(1, Math.floor((frame.width - .9) / row.bay))
    const pitch = (frame.width - 1.1) / count
    for (let i = 0; i < count; i++) openings.push({
      x: (i - (count - 1) / 2) * pitch, y: row.y, height: row.height,
      width: Math.min(row.width ?? row.bay - .8, pitch - .65),
    })
  }
  windowWall(kit, finish, frame.at, frame.width, height, openings,
    { depth: WALL, yaw: frame.yaw, surface, seed })
  // WindowWall supplies the deep pane and sill; these are inset frame members.
  for (const { x, y: wy, width: w, height: h } of openings) {
    const member = (size: Point, px: number, py: number, recess = -.38) =>
      kit.box('steel', size, frame.point(px, py, recess), [0, frame.yaw, 0], 'sheet')
    for (const side of [-1, 1]) {
      member([.075, h, .09], x + side * (w / 2 - .08), wy)
      member([w, .075, .09], x, wy + side * (h / 2 - .08))
    }
    member([w - .15, .065, .085], x, wy + h * .22)
    if (w > 2.1) member([.075, h - .15, .085], x + w * .16, wy)
    // A projecting masonry head makes the opening's wall thickness legible.
    kit.box('edge', [w + .24, .14, .19], frame.point(x, wy + h / 2 + .08, -.035),
      [0, frame.yaw, 0], surface)
  }
}

function shell(kit: CityBuilder, plan: Outline, y: number, height: number, rows: WindowRow[],
  finish: CityFinish, surface: CitySurface, seed = 0) {
  plan.forEach((a, i) => facade(kit, a, plan[(i + 1) % plan.length], y, height, rows, finish, surface, seed + i))
}

function parapet(kit: CityBuilder, plan: Outline, y: number, height: number, finish: CityFinish = 'concrete') {
  plan.forEach((a, i) => {
    const f = edgeFrame(a, plan[(i + 1) % plan.length], y)
    kit.box(finish, [f.width, height, .34], f.point(0, height / 2, -.17), [0, f.yaw, 0], 'plaster')
    kit.box('edge', [f.width, .12, .43], f.point(0, height - .06, -.17), [0, f.yaw, 0], 'sheet')
  })
}

function roofQuad(kit: CityBuilder, points: Point[]) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3))
  geometry.setIndex([0, 1, 2, 0, 2, 3])
  geometry.computeVertexNormals()
  roofShell(kit, geometry, .16, 'steel', 'sheet')
}

function gable(kit: CityBuilder, profile: Outline, z: number, depth: number, finish: CityFinish = 'faded') {
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)))
  kit.add(finish, new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false }).translate(0, 0, z), 'masonry')
}

function northlight(kit: CityBuilder, left: number, right: number, back: number, front: number, peak: number) {
  const base = 9, low = 9.22
  for (const z of [back, front - WALL]) {
    gable(kit, [[left, base], [right, base], [right, peak - .16], [left, low - .16]], z, WALL, 'rust')
  }
  kit.box('rust', [WALL, low - .16 - base, front - back],
    [left + WALL / 2, (base + low - .16) / 2, (front + back) / 2], undefined, 'masonry')
  // A vertical glazed face closes the high side of each asymmetric roof tooth.
  facade(kit, [right, front], [right, back], base, peak - base,
    [{ y: (peak - base) / 2, height: peak - base - .55, bay: 3.2 }], 'edge', 'sheet', 3)
  roofQuad(kit, [[left, low, back], [left, low, front], [right, peak, front], [right, peak, back]])
  for (let z = back + .4; z < front; z += 1.15) {
    kit.beam('edge', [left, low + .035, z], [right, peak + .035, z], .055, .075, 'sheet')
  }
  kit.beam('edge', [left, low, back], [left, low, front], .16, .18, 'sheet')
}

/** Two-storey brick print hall with two northlights and an attached four-storey stair gallery. */
export function buildPrintworks(kit: CityBuilder, variant = 0) {
  const alternate = variant % 2 !== 0
  const workshopX = alternate ? 2.5 : -2.5
  const plan = rectangle(workshopX, 0, 18, 13)
  slab(kit, plan, 0, .22)
  shell(kit, plan, 0, 9, [
    { y: 2.1, height: 2.85, bay: 4.3, width: 3.1 },
    { y: 6.95, height: 2.65, bay: 4.3, width: 3.1 },
  ], 'rust', 'masonry')
  slab(kit, plan, 4.15, .24)
  const left = workshopX - 9, split = left + (alternate ? 10.5 : 8)
  northlight(kit, left, split, -6.5, 6.5, alternate ? 10.95 : 11.2)
  northlight(kit, split, workshopX + 9, -6.5, 6.5, alternate ? 11.2 : 10.85)

  const stairX = alternate ? -9 : 9, stairZ = alternate ? 2.5 : -2.5
  const stair = rectangle(stairX, stairZ, 5, 8)
  slab(kit, stair, 0, .22)
  shell(kit, stair, 0, 16.4, [
    { y: 2, height: 2.6, bay: 3.8, width: 1.65 },
    { y: 6.05, height: 2.65, bay: 3.8, width: 1.65 },
    { y: 10.1, height: 2.65, bay: 3.8, width: 1.65 },
    { y: 14.1, height: 2.55, bay: 3.8, width: 1.65 },
  ], 'concrete', 'plaster', 2)
  for (const y of [4, 8.05, 12.1, 16.15]) slab(kit, stair, y, .25)
  parapet(kit, stair, 16.4, .6)
  // Switchback flights are supported by full landings inside the enclosed gallery.
  for (let floor = 0; floor < 4; floor++) {
    for (let half = 0; half < 2; half++) {
      for (let step = 0; step < 7; step++) {
        const h = 2 * (step + 1) / 7
        const z = stairZ + (half ? 1 : -1) * (1.55 - step * .45)
        kit.box('edge', [1.6, h, .45], [stairX + (half ? .95 : -.95), floor * 4.025 + half * 2 + h / 2, z], undefined, 'masonry')
      }
      kit.box('edge', [3.65, .2, 1.05], [stairX, floor * 4.025 + half * 2 + 2, stairZ + (half ? 2.25 : -2.25)], undefined, 'masonry')
    }
  }
}

function cornerPlan(alternate: boolean, inset = 0): Outline {
  const left = -7 + inset, right = 7 - inset, back = -6.5 + inset, front = 6.5 - inset
  const chamfer = alternate ? 3.4 : 2.8
  return alternate
    ? [[left, front - chamfer], [left + chamfer, front], [right, front], [right, back], [left, back]]
    : [[left, front], [right - chamfer, front], [right, front - chamfer], [right, back], [left, back]]
}

/** A chamfered commercial corner with a full third floor set back from the street. */
export function buildCornerShops(kit: CityBuilder, variant = 0) {
  const alternate = variant % 2 !== 0
  const lower = cornerPlan(alternate), upper = cornerPlan(alternate, alternate ? 1.45 : 1.1)
  slab(kit, lower, 0, .2)
  shell(kit, lower, 0, 8.6, [
    { y: 2.15, height: 2.95, bay: 4, width: 3.2 },
    { y: 6.25, height: 2.95, bay: 4, width: 3.2 },
  ], 'concrete', 'plaster', 1)
  slab(kit, lower, 4.05, .27)
  slab(kit, lower, 8.35, .25)
  parapet(kit, lower, 8.6, .45, 'faded')
  shell(kit, upper, 8.6, 3.95, [
    { y: 1.95, height: 2.55, bay: 3.9, width: 2.9 },
  ], 'faded', 'plaster', 3)
  slab(kit, upper, 12.3, .25)
  parapet(kit, upper, 12.55, .45)
  // Wide masonry corner piers continue through both commercial floors.
  const corner = alternate ? 0 : 1
  const f = edgeFrame(lower[corner], lower[corner + 1], 0)
  for (const x of [-f.width / 2 + .23, f.width / 2 - .23]) {
    kit.box('edge', [.38, 8.35, .18], f.point(x, 4.175, .04), [0, f.yaw, 0], 'masonry')
  }
}

function pitchedShop(kit: CityBuilder, x: number, z: number, width: number, depth: number, reverse: boolean) {
  const base = 8.05, low = 8.6, high = 10.4
  const left = x - width / 2, right = x + width / 2
  const back = z - depth / 2, front = z + depth / 2
  const yl = reverse ? high : low, yr = reverse ? low : high
  for (const end of [back, front - WALL]) {
    gable(kit, [[left, base], [right, base], [right, yr - .16], [left, yl - .16]], end, WALL, 'rust')
  }
  for (const [sx, y] of [[left, yl], [right, yr]]) {
    kit.box('rust', [WALL, y - base, depth], [sx + (sx === left ? WALL / 2 : -WALL / 2), (base + y) / 2, z], undefined, 'masonry')
  }
  roofQuad(kit, [[left, yl, back], [left, yl, front], [right, yr, front], [right, yr, back]])
  for (let rz = back + .3; rz < front; rz += .85) {
    kit.beam('edge', [left, yl + .035, rz], [right, yr + .035, rz], .055, .07, 'sheet')
  }
}

function barrelShop(kit: CityBuilder, x: number, z: number, width: number, depth: number) {
  const spring = 8.05, rise = 1.7, segments = 16
  const profile: Outline = []
  for (let i = 0; i <= segments; i++) {
    const angle = Math.PI - i * Math.PI / segments
    profile.push([x + Math.cos(angle) * width / 2, spring + Math.sin(angle) * rise])
  }
  for (const end of [z - depth / 2, z + depth / 2 - WALL]) gable(kit, profile, end, WALL)
  const geometry = new THREE.BufferGeometry(), positions: number[] = [], indices: number[] = []
  profile.forEach(([px, py]) => positions.push(px, py + .16, z - depth / 2, px, py + .16, z + depth / 2))
  for (let i = 0; i < segments; i++) {
    const a = i * 2
    indices.push(a, a + 1, a + 3, a, a + 3, a + 2)
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  roofShell(kit, geometry, .16, 'paint', 'sheet')
  for (let rz = z - depth / 2 + .5; rz < z + depth / 2; rz += 1.25) {
    for (let i = 0; i < segments; i++) {
      kit.beam('steel', [profile[i][0], profile[i][1] + .19, rz],
        [profile[i + 1][0], profile[i + 1][1] + .19, rz], .035, .05, 'sheet')
    }
  }
}

/** Three party-wall shops: single pitch, barrel workshop and a taller brick shop-house. */
export function buildLaneTerrace(kit: CityBuilder, variant = 0) {
  const alternate = variant % 2 !== 0
  const widths = alternate ? [8, 6.5, 7.5] : [7, 8, 7]
  const kinds = alternate ? ['brick', 'pitch', 'barrel'] : ['pitch', 'barrel', 'brick']
  let left = -11
  widths.forEach((width, i) => {
    const kind = kinds[i], x = left + width / 2
    const depth = i === 1 ? 9 : 10, z = i === 1 ? -.5 : 0
    const height = kind === 'brick' ? (alternate ? 11.4 : 10.9) : 8.05
    const plan = rectangle(x, z, width, depth)
    slab(kit, plan, 0, .2)
    // Party walls are solid; only the group's end walls have side windows.
    plan.forEach((a, edge) => {
      const exposed = edge === 0 || edge === 2 || (edge === 3 && i === 0) || (edge === 1 && i === 2)
      facade(kit, a, plan[(edge + 1) % 4], 0, height, exposed ? [
        { y: 2.05, height: 2.85, bay: 3.6, width: 2.7 },
        { y: kind === 'brick' ? 7.85 : 6.15, height: kind === 'brick' ? 3.2 : 2.1, bay: 3.4, width: 2.25 },
      ] : [], kind === 'barrel' ? 'concrete' : 'rust', kind === 'barrel' ? 'plaster' : 'masonry', i + edge)
    })
    slab(kit, plan, kind === 'brick' ? 4.55 : 3.9, .23)
    if (kind === 'pitch') pitchedShop(kit, x, z, width, depth, alternate)
    else if (kind === 'barrel') barrelShop(kit, x, z, width, depth)
    else {
      slab(kit, plan, height - .22, .22)
      parapet(kit, plan, height, .6, 'faded')
    }
    // Solid shop fascia is tied into the wall above the submerged ground-floor glazing.
    kit.box('paint', [width - .5, .46, .16], [x, 3.95, z + depth / 2 + .04], undefined, 'sheet')
    left += width
  })
}

/** An enclosed three-storey L block; the first-floor inner face recedes behind a supported arcade. */
export function buildOfficeCourt(kit: CityBuilder, variant = 0) {
  const alternate = variant % 2 !== 0
  const plan: Outline = alternate
    ? [[-9, 7.5], [9, 7.5], [9, -7.5], [2, -7.5], [2, 1.5], [-9, 1.5]]
    : [[-9, 7.5], [-2, 7.5], [-2, -.5], [9, -.5], [9, -7.5], [-9, -7.5]]
  const inner = alternate ? [3, 4] : [1, 2]
  slab(kit, plan, 0, .2)
  plan.forEach((a, i) => {
    const b = plan[(i + 1) % plan.length]
    if (!inner.includes(i)) {
      facade(kit, a, b, 0, 13.4, [
        { y: 2.15, height: 2.75, bay: 3.6, width: 2.25 },
        { y: 6.55, height: 2.6, bay: 3.6, width: 2.25 },
        { y: 10.9, height: 2.55, bay: 3.6, width: 2.25 },
      ], 'concrete', 'plaster', i)
      return
    }
    const f = edgeFrame(a, b, 0), inset = 1.25
    const shift = (p: Outline[number]): Outline[number] =>
      [p[0] - Math.sin(f.yaw) * inset, p[1] - Math.cos(f.yaw) * inset]
    const recessedA = shift(a), recessedB = shift(b)
    facade(kit, recessedA, recessedB, 0, 4.8,
      [{ y: 2.25, height: 2.9, bay: 3.4, width: 2.2 }], 'faded', 'plaster', i)
    facade(kit, a, recessedA, 0, 4.8, [], 'concrete', 'plaster')
    facade(kit, recessedB, b, 0, 4.8, [], 'concrete', 'plaster')
    facade(kit, a, b, 4.8, 8.6, [
      { y: 1.8, height: 2.4, bay: 3.6, width: 2.25 },
      { y: 6.1, height: 2.55, bay: 3.6, width: 2.25 },
    ], 'concrete', 'plaster', i)
    const bays = Math.max(2, Math.round(f.width / 3.5))
    for (let p = 0; p <= bays; p++) {
      const px = -.5 * (f.width - .6) + p * (f.width - .6) / bays
      kit.box('edge', [.6, 4.65, .6], f.point(px, 2.325, -.3), [0, f.yaw, 0], 'masonry')
      kit.box('edge', [.83, .23, .86], f.point(px, 4.5, -.38), [0, f.yaw, 0], 'masonry')
    }
    kit.box('edge', [f.width, .38, 1.8], f.point(0, 4.61, -.9), [0, f.yaw, 0], 'masonry')
  })
  for (const y of [4.55, 8.85, 13.15]) slab(kit, plan, y, .25)
  parapet(kit, plan, 13.4, .6)

  const court = alternate ? rectangle(-3.5, -3, 11, 9) : rectangle(3.5, 3.5, 11, 8)
  slab(kit, court, 0, .14)
  const boundary: Outline = alternate ? [[-9, 1.5], [-9, -7.5], [2, -7.5]] : [[-2, 7.5], [9, 7.5], [9, -.5]]
  for (let i = 0; i < 2; i++) {
    facade(kit, boundary[i], boundary[i + 1], 0, 5.15,
      i === (alternate ? 1 : 0) ? [{ y: 2.45, height: 3.8, bay: 12, width: 2.8 }] : [], 'faded', 'masonry')
    const f = edgeFrame(boundary[i], boundary[i + 1], 0)
    kit.box('edge', [f.width, .18, .65], f.point(0, 5.24, -.25), [0, f.yaw, 0], 'masonry')
  }
}
