import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { roofShell, windowWall, type WallOpening } from '../city/CityDetails'

type Point = [number, number, number]
const WATER = 4.25

// All footprints are centred on XZ, with their front facing +Z and foundation at Y=0.
function masonry(kit: CityBuilder, shape: THREE.Shape, thickness: number, z: number, finish: CityFinish = 'concrete', curveSegments = 16) {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments })
  kit.add(finish, geometry.translate(0, 0, z - thickness), 'masonry')
}

function polygon(points: [number, number][]) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)))
  shape.closePath()
  return shape
}

// Sample each endpoint once: CurvePath can insert near-zero connector edges at arc joins.
function arcPoints(x: number, y: number, radius: number, start: number, end: number, segments: number): [number, number][] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const angle = start + (end - start) * i / segments
    return [x + radius * Math.cos(angle), y + radius * Math.sin(angle)]
  })
}

function roofSurface(points: Point[], indices: number[]) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3))
  geometry.setIndex(indices)
  return geometry
}

function flatRoof(kit: CityBuilder, width: number, depth: number, y: number) {
  roofShell(kit, roofSurface([
    [-width / 2, y, -depth / 2], [-width / 2, y, depth / 2],
    [width / 2, y, depth / 2], [width / 2, y, -depth / 2],
  ], [0, 1, 2, 0, 2, 3]), .22, 'steel', 'sheet')
}

function hipRoof(kit: CityBuilder, width: number, depth: number, eave: number) {
  const x = width / 2, z = depth / 2
  const rise = Math.min(width, depth) * .2
  const ridge = Math.max(width * .12, x - depth * .43)
  roofShell(kit, roofSurface([
    [-x, eave, -z], [-x, eave, z], [x, eave, z], [x, eave, -z],
    [-ridge, eave + rise, 0], [ridge, eave + rise, 0],
  ], [0, 1, 4, 1, 2, 5, 1, 5, 4, 2, 3, 5, 3, 0, 4, 3, 4, 5]), .2, 'paint', 'sheet')
  kit.beam('edge', [-ridge, eave + rise + .035, 0], [ridge, eave + rise + .035, 0], .12, .12, 'sheet')
  for (const end of [-1, 1]) {
    for (const side of [-1, 1]) {
      kit.beam('edge', [end * ridge, eave + rise + .02, 0], [end * x, eave + .02, side * z], .075, .09, 'sheet')
    }
  }
  const courses = Math.ceil(width / .9)
  for (let i = 1; i < courses; i++) {
    const sx = -x + width * i / courses
    const fraction = Math.min(1, (x - Math.abs(sx)) / (x - ridge))
    for (const side of [-1, 1]) {
      kit.beam('faded', [sx, eave + .025, side * z],
        [sx, eave + rise * fraction + .025, side * z * (1 - fraction)], .027, .035, 'sheet')
    }
  }
}

// The spandrel rests on the arch ring, leaving its curved soffit free of overlapping faces.
function loadingArch(kit: CityBuilder, x: number, radius: number, spring: number, eave: number, z: number, thickness: number) {
  const ring = Math.max(.22, radius * .19), outer = radius + ring
  const angle = Math.acos(radius / outer)
  const shape = polygon([
    [x - radius, eave],
    ...arcPoints(x, spring, outer, Math.PI - angle, angle, 32),
    [x + radius, eave],
  ])
  masonry(kit, shape, thickness, z)

  for (let i = 0; i < 13; i++) {
    const a = i * Math.PI / 13, b = (i + 1) * Math.PI / 13
    const wedge = polygon([
      ...arcPoints(x, spring, radius, a, b, 3),
      ...arcPoints(x, spring, outer, b, a, 3),
    ])
    masonry(kit, wedge, thickness + .12, z + .12, i === 6 ? 'concrete' : 'faded', 3)
  }
  for (const side of [-1, 1]) {
    kit.box('concrete', [ring, spring, thickness + .12],
      [x + side * (radius + ring / 2), spring / 2, z - thickness / 2 + .06], undefined, 'masonry')
    const courses = Math.max(3, Math.ceil((spring - WATER) / .85))
    const course = (spring - WATER) / courses
    for (let row = 0; row < courses; row++) {
      kit.box('concrete', [ring, course - .025, .06],
        [x + side * (radius + ring / 2), WATER + (row + .5) * course, z + .12], undefined, 'masonry')
    }
    kit.box('edge', [ring + .09, .16, thickness + .12],
      [x + side * (radius + ring / 2), spring - .08, z - thickness / 2 + .04], undefined, 'masonry')
  }
}

function loadingDoor(kit: CityBuilder, x: number, radius: number, spring: number, z: number, left: boolean) {
  const base = .32, inset = .06, r = radius - inset
  const shape = polygon([
    [x - r, base], [x + r, base],
    ...arcPoints(x, spring, r, 0, Math.PI, 32),
  ])
  // Two parked sliding leaves expose a narrow slit beside each closed end bay.
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .1, bevelEnabled: false, curveSegments: 16 })
  const shift = (left ? -1 : 1) * radius * .24
  kit.add('paint', geometry.translate(shift, 0, z), 'sheet')
  for (let i = -2; i <= 2; i++) {
    const dx = r * i / 3
    const top = spring + Math.sqrt(r * r - dx * dx) - .08
    kit.box('faded', [.035, top - base, .035], [x + shift + dx, (top + base) / 2, z + .12], undefined, 'sheet')
  }
  for (const y of [WATER + .45, spring - .25]) {
    kit.box('steel', [2 * r, .105, .065], [x + shift, y, z + .145], undefined, 'sheet')
  }
  kit.box('steel', [.075, .38, .12], [x + shift + (left ? 1 : -1) * r * .76, WATER + 1.1, z + .19])
}

export function buildCustomsWarehouse(kit: CityBuilder, width: number, depth: number, eave: number) {
  const front = depth / 2, wall = Math.min(.95, width * .06)
  const radius = width * .13, spacing = width * .32
  const spring = WATER + (eave - WATER) * .81 - radius
  const centres = [-spacing, 0, spacing]
  kit.box('edge', [width, .32, depth], [0, .16, 0], undefined, 'masonry')
  kit.box('edge', [width - wall * 2, eave - .32, wall], [0, (eave + .32) / 2, -front + wall / 2], undefined, 'masonry')

  let start = -width / 2
  for (const x of centres) {
    const end = x - radius
    kit.box('concrete', [end - start, eave, wall], [(start + end) / 2, eave / 2, front - wall / 2], undefined, 'masonry')
    loadingArch(kit, x, radius, spring, eave, front, wall)
    start = x + radius
  }
  kit.box('concrete', [width / 2 - start, eave, wall], [(start + width / 2) / 2, eave / 2, front - wall / 2], undefined, 'masonry')

  for (const side of [-1, 1]) {
    const openings: WallOpening[] = [-.26, .26].map(fraction => ({
      x: depth * fraction, y: eave - 1.65, width: depth * .18, height: 1.5,
    }))
    windowWall(kit, 'concrete', [side * width / 2, 0, 0], depth, eave, openings,
      { depth: wall, yaw: side * Math.PI / 2, surface: 'masonry', seed: 2 })
    kit.box('edge', [wall + .12, .3, depth], [side * (width / 2 - wall / 2), WATER - .2, 0], undefined, 'masonry')
    kit.box('edge', [wall + .15, .24, depth + .18], [side * (width / 2 - wall / 2), eave - .22, 0], undefined, 'masonry')
    // Alternating corner stones return onto the side wall; joints rely on shallow relief.
    const courseCount = Math.ceil((eave - WATER) / 1.05), course = (eave - WATER) / courseCount
    for (let row = 0; row < courseCount; row++) {
      const length = Math.min(width * .045, row % 2 ? .65 : .9)
      const y = WATER + (row + .5) * course
      kit.box('concrete', [length, course - .025, .085],
        [side * (width / 2 - length / 2), y, front + .025], undefined, 'masonry')
      kit.box('concrete', [.085, course - .025, row % 2 ? .9 : .65],
        [side * (width / 2 + .025), y, front - (row % 2 ? .9 : .65) / 2], undefined, 'masonry')
    }
  }
  const crown = spring + radius
  for (let row = 0; row < 2; row++) {
    const y = crown + (eave - crown) * (.35 + row * .32)
    for (const x of [-spacing / 2, spacing / 2]) {
      kit.box('concrete', [spacing * .82, .42, .045], [x, y, front + .015], undefined, 'masonry')
    }
  }
  // The centre bay remains open all the way into the warehouse's shadowed volume.
  loadingDoor(kit, centres[0], radius, spring, front - wall - .26, true)
  loadingDoor(kit, centres[2], radius, spring, front - wall - .26, false)
  kit.box('dark', [width - 2 * wall, eave - .6, .14], [0, (eave + .32) / 2, -front + wall + .09])
  for (const z of [-depth * .23, depth * .12]) {
    kit.beam('steel', [-width / 2 + wall, eave - .65, z], [width / 2 - wall, eave - .65, z], .18, .23)
    for (const x of [-width * .23, width * .23]) {
      kit.beam('steel', [x, .32, z], [x, eave - .65, z], .18)
      kit.beam('steel', [x, eave - 1.5, z], [x + (x < 0 ? .7 : -.7), eave - .65, z], .11)
    }
  }
  for (const z of [-front, front]) {
    kit.box('concrete', [width + .22, .26, wall + .19], [0, eave - .15, z - Math.sign(z) * wall / 2], undefined, 'masonry')
  }
  hipRoof(kit, width + .65, depth + .65, eave + .12)
}

export function buildPortOffice(kit: CityBuilder, width: number, depth: number, storeys: number, storeyHeight: number) {
  const floors = Math.max(1, Math.floor(storeys)), height = floors * storeyHeight
  const wall = Math.min(.8, width * .08), parapet = storeyHeight * .2
  kit.box('edge', [width, .36, depth], [0, .18, 0], undefined, 'masonry')

  const facade = (span: number, at: Point, yaw: number, seed: number) => {
    const columns = Math.max(2, Math.floor(span / 2.4)), pitch = span / (columns + .35)
    const openings: WallOpening[] = []
    for (let floor = 0; floor < floors; floor++) {
      for (let column = 0; column < columns; column++) {
        openings.push({
          x: (column - (columns - 1) / 2) * pitch,
          y: floor * storeyHeight + storeyHeight * .55,
          width: pitch * .53, height: storeyHeight * .59,
        })
      }
    }
    windowWall(kit, 'concrete', at, span, height, openings, { depth: wall, yaw, surface: 'masonry', seed })
    const matrix = new THREE.Matrix4().makeRotationY(yaw).setPosition(...at)
    const detail = (finish: CityFinish, size: Point, p: Point) => {
      kit.add(finish, new THREE.BoxGeometry(...size).translate(...p).applyMatrix4(matrix), 'masonry')
    }
    for (const opening of openings) {
      const { x, y, width: w, height: h } = opening
      detail('concrete', [w + .2, .16, wall + .13], [x, y + h / 2 + .09, -wall / 2 + .015])
      detail('steel', [w, .06, .065], [x, y + h * .06, -wall + .095])
    }
    for (let floor = 1; floor < floors; floor++) {
      detail('edge', [span, .13, .13], [0, floor * storeyHeight - .08, .035])
    }
    detail('edge', [span + .12, .25, wall + .18], [0, height - .21, -wall / 2 + .055])
    detail('concrete', [span, parapet, wall], [0, height + parapet / 2, -wall / 2])
    detail('edge', [span + .18, .14, wall + .2], [0, height + parapet + .07, -wall / 2])
  }
  facade(width, [0, 0, depth / 2], 0, 1)
  facade(width, [0, 0, -depth / 2], Math.PI, 3)
  facade(depth, [width / 2, 0, 0], Math.PI / 2, 2)
  facade(depth, [-width / 2, 0, 0], -Math.PI / 2, 4)

  for (let floor = 1; floor < floors; floor++) {
    kit.box('dark', [width - wall * 2, .2, depth - wall * 2], [0, floor * storeyHeight, 0])
  }
  for (const x of [-1, 1]) {
    for (const z of [-1, 1]) {
      kit.box('concrete', [wall + .14, height, wall + .14],
        [x * (width / 2 - wall / 2), height / 2, z * (depth / 2 - wall / 2)], undefined, 'masonry')
      kit.box('concrete', [wall + .24, parapet + .35, wall + .24],
        [x * (width / 2 - wall / 2), height + (parapet + .35) / 2, z * (depth / 2 - wall / 2)], undefined, 'masonry')
    }
  }
  flatRoof(kit, width - wall, depth - wall, height - .05)
  // A raised centre parapet gives the administration block its own civic silhouette.
  kit.box('concrete', [width * .34, parapet + .45, wall], [0, height + (parapet + .45) / 2, depth / 2 - wall / 2], undefined, 'masonry')
  kit.box('edge', [width * .34 + .18, .14, wall + .2], [0, height + parapet + .52, depth / 2 - wall / 2], undefined, 'masonry')
}

export function buildNorthlightShed(kit: CityBuilder, width: number, depth: number, eave: number) {
  const wall = Math.min(.4, width * .045), teeth = width >= 11 ? 3 : 2
  const bays = width >= 11 ? 4 : 3, pitch = width / bays
  kit.box('edge', [width, .3, depth], [0, .15, 0], undefined, 'masonry')
  for (const side of [-1, 1]) {
    const openings: WallOpening[] = Array.from({ length: bays }, (_, i) => ({
      x: (i - (bays - 1) / 2) * pitch, y: WATER + (eave - WATER) * .43,
      width: pitch * .76, height: (eave - WATER) * .43,
    }))
    windowWall(kit, 'faded', [0, 0, side * depth / 2], width, eave, openings,
      { depth: wall, yaw: side < 0 ? Math.PI : 0, surface: 'sheet', seed: 2 })
    for (let i = 0; i <= bays; i++) {
      const x = -width / 2 + i * pitch
      kit.box('steel', [.13, eave, wall + .1], [x, eave / 2, side * (depth / 2 - wall / 2)], undefined, 'sheet')
    }
    kit.box('edge', [width + .22, .18, wall + .17], [0, eave - .09, side * (depth / 2 - wall / 2)], undefined, 'sheet')
  }
  for (const side of [-1, 1]) {
    windowWall(kit, 'faded', [side * width / 2, 0, 0], depth, eave,
      [{ x: 0, y: WATER + (eave - WATER) * .43, width: depth * .65, height: (eave - WATER) * .38 }],
      { depth: wall, yaw: side * Math.PI / 2, surface: 'sheet', seed: 1 })
  }

  // Teeth run across X, so the front camera sees each triangular end even at modest yaw.
  const run = width / teeth, rise = Math.min(2.1, Math.max(1.4, run * .44))
  const lightCount = Math.max(2, Math.floor(depth / 2.2)), lightPitch = depth / lightCount
  for (let tooth = 0; tooth < teeth; tooth++) {
    const left = -width / 2 + tooth * run, right = left + run
    const low = eave, high = low + rise, half = depth / 2 + .19
    roofShell(kit, roofSurface([
      [left, high, -half], [left, high, half], [right, low, half], [right, low, -half],
    ], [0, 1, 2, 0, 2, 3]), .12, 'paint', 'sheet')
    // Each steep north face is a recessed glazed clerestory in a load-bearing frame.
    const lights: WallOpening[] = Array.from({ length: lightCount }, (_, i) => ({
      x: (i - (lightCount - 1) / 2) * lightPitch, y: rise * .53,
      width: lightPitch * .83, height: rise * .64,
    }))
    windowWall(kit, 'steel', [left, low, 0], depth, rise, lights,
      { depth: .14, yaw: -Math.PI / 2, surface: 'sheet', seed: tooth + 1 })
    for (const side of [-1, 1]) {
      const shape = polygon([[left, low], [right, low], [left, high]])
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: .12, bevelEnabled: false })
      geometry.translate(0, 0, side < 0 ? -depth / 2 : depth / 2 - .12)
      kit.add('faded', geometry, 'sheet')
      kit.beam('steel', [left, high, side * depth / 2], [right, low, side * depth / 2], .12, .14)
      kit.beam('steel', [left, low, side * depth / 2], [left, high, side * depth / 2], .12, .14)
    }
    kit.beam('edge', [left, high + .02, -half], [left, high + .02, half], .13, .15, 'sheet')
    kit.beam('edge', [right, low, -half], [right, low, half], .12, .16, 'sheet')
    for (let i = 1; i < Math.ceil(depth / 1.1); i++) {
      const z = -depth / 2 + depth * i / Math.ceil(depth / 1.1)
      kit.beam('faded', [left, high + .025, z], [right, low + .025, z], .025, .035, 'sheet')
    }
  }
}

export function buildQuay(kit: CityBuilder, width: number, depth: number) {
  const top = WATER + .18, cap = .24
  const outline: [number, number][] = [
    [-width / 2, -depth / 2], [width / 2, -depth / 2], [width / 2, depth * .13],
    [width * .37, depth * .13], [width * .31, depth * .33], [width * .12, depth * .29],
    [width * .03, depth / 2], [-width / 2, depth / 2],
  ]
  for (const [base, height, finish] of [[0, top - cap, 'edge'], [top - cap, cap, 'concrete']] as const) {
    const geometry = new THREE.ExtrudeGeometry(polygon(outline), { depth: height, bevelEnabled: false })
    kit.add(finish, geometry.rotateX(Math.PI / 2).translate(0, base + height, 0), 'masonry')
  }
  const scale = Math.min(1, width / 4, depth / 2)
  const x = -width * .25, z = -depth * .05
  kit.box('steel', [.72 * scale, .12 * scale, .63 * scale], [x, top + .06 * scale, z])
  const profile = [[0, .1], [.29, .1], [.27, .21], [.18, .28], [.16, .65], [.3, .72], [.34, .82], [.29, .93], [0, .93]]
  const bollard = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * scale, y * scale)), 16)
  kit.add('steel', bollard.translate(x, top, z))
}
