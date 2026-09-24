import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { roofShell, windowWall, type WallOpening } from '../city/CityDetails'
import type { CitySurface } from '../city/CitySurfaces'

type Point = [number, number, number]
type Profile = [number, number][]

// Local footprints include eaves; fronts face +Z. Placement owns the water offset.
function opening(x: number, y: number, width: number, height: number): WallOpening {
  return { x, y, width, height }
}

function enclosure(kit: CityBuilder, finish: CityFinish, center: Point, width: number,
  depth: number, height: number, front: WallOpening[], side: WallOpening[] = [],
  surface: CitySurface = 'plaster', thickness = .35) {
  const [x, y, z] = center
  windowWall(kit, finish, [x, y, z + depth / 2], width, height, front, { depth: thickness, surface })
  windowWall(kit, finish, [x, y, z - depth / 2], width, height, front, { depth: thickness, yaw: Math.PI, surface, seed: 3 })
  windowWall(kit, finish, [x + width / 2, y, z], depth, height, side, { depth: thickness, yaw: Math.PI / 2, surface })
  windowWall(kit, finish, [x - width / 2, y, z], depth, height, side, { depth: thickness, yaw: -Math.PI / 2, surface, seed: 2 })
}

function profileSolid(kit: CityBuilder, profile: Profile, z: number, depth: number,
  finish: CityFinish, surface: CitySurface) {
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)))
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 })
  kit.add(finish, geometry.translate(0, 0, z), surface)
}

function roof(kit: CityBuilder, vertices: Point[], faces: number[], surface: CitySurface = 'sheet', thickness = .22) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3))
  geometry.setIndex(faces)
  roofShell(kit, geometry, thickness, 'steel', surface)
}

// A continuous closed roof skin, with a separate structural end infill below it.
function longRoof(kit: CityBuilder, halfWidth: number, profile: Profile, thickness = .22) {
  const vertices: Point[] = []
  const faces: number[] = []
  for (const [z, y] of profile) vertices.push([-halfWidth, y, z], [halfWidth, y, z])
  for (let i = 0; i < profile.length - 1; i++) {
    const a = i * 2
    faces.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  roof(kit, vertices, faces, 'sheet', thickness)
}

function roofSeams(kit: CityBuilder, xs: number[], profile: Profile) {
  for (const x of xs) {
    for (let i = 0; i < profile.length - 1; i++) {
      const [az, ay] = profile[i], [bz, by] = profile[i + 1]
      const inset = .14 / (bz - az)
      const from: Point = [x, ay + (by - ay) * inset + .012, az + .14]
      const to: Point = [x, by - (by - ay) * inset + .012, bz - .14]
      kit.beam('steel', from, to, .045, .035, 'sheet')
    }
  }
}

function eaveGutter(kit: CityBuilder, width: number, y: number, z: number) {
  kit.box('edge', [width, .06, .24], [0, y, z], undefined, 'sheet')
  for (const offset of [-.1, .1]) {
    kit.box('steel', [width, .16, .04], [0, y + .11, z + offset], undefined, 'sheet')
  }
  for (const x of [-width / 2 + .03, width / 2 - .03]) {
    kit.box('steel', [.06, .16, .24], [x, y + .11, z], undefined, 'sheet')
  }
}

/** 18 X 9 footprint, Y=0..8. Five inset auction aisles under one low canopy. */
export function buildAuctionHall(kit: CityBuilder) {
  kit.box('edge', [18, .35, 9], [0, .175, 0], undefined, 'masonry')
  const bays = [-6.8, -3.4, 0, 3.4, 6.8]
  enclosure(kit, 'faded', [0, .35, -.95], 17.3, 6.2, 5.95,
    bays.map(x => opening(x, 3.8, 2.45, 2.8)),
    [opening(-1.5, 3.8, 1.4, 1.7), opening(1.5, 3.8, 1.4, 1.7)], 'plaster', .4)
  kit.box('edge', [17.3, .22, 6.2], [0, 6.19, -.95], undefined, 'masonry')
  for (const z of [-3.85, 1.95]) {
    kit.box('faded', [17.3, .24, .4], [0, 6.4, z], undefined, 'plaster')
  }
  longRoof(kit, 9, [[-4.5, 6.5], [-1, 8], [2.55, 6.5]])
  for (const x of [-8.65, 8.37]) {
    const shape = new THREE.Shape([
      new THREE.Vector2(-4.05, 6.28), new THREE.Vector2(2.15, 6.28),
      new THREE.Vector2(2.15, 6.28 + .4 / 3.55 * 1.5),
      new THREE.Vector2(-1, 7.78),
      new THREE.Vector2(-4.05, 6.28 + .45 / 3.5 * 1.5),
    ])
    const gable = new THREE.ExtrudeGeometry(shape, { depth: .28, bevelEnabled: false })
    kit.add('faded', gable.rotateY(-Math.PI / 2).translate(x + .28, 0, 0), 'plaster')
  }
  longRoof(kit, 9, [[1.8, 5.9], [4.5, 5.35]], .2)
  kit.box('edge', [17.5, .3, .35], [0, 5, 4.05], undefined, 'masonry')
  for (const x of [-8.55, -5.1, -1.7, 1.7, 5.1, 8.55]) {
    kit.box('concrete', [.38, 5.05, .42], [x, 2.875, 4.05], undefined, 'masonry')
    kit.beam('steel', [x, 5.03, 3.98], [x, 5.52, 2.2], .16, .2, 'sheet')
  }
  for (const x of [-8.45, 8.45]) {
    kit.box('faded', [.4, 4.65, 1.9], [x, 2.675, 3.05], undefined, 'plaster')
  }
  roofSeams(kit, [-6, -2, 2, 6], [[-4.5, 6.5], [-1, 8], [2.55, 6.5]])
  roofSeams(kit, [-6, -2, 2, 6], [[1.8, 5.9], [4.5, 5.35]])
  eaveGutter(kit, 17.8, 5.135, 4.36)
  kit.box('edge', [17.3, .15, .16], [0, 5.88, 2.09], undefined, 'sheet')
  kit.box('steel', [.12, 3.85, .12], [8.55, 3.23, 4.34], undefined, 'sheet')
}

/** 7 X 8 footprint, Y=0..13. Thick storage walls, deep slots, stepped cornice. */
export function buildColdStore(kit: CityBuilder) {
  kit.box('edge', [7, .4, 8], [0, .2, 0], undefined, 'masonry')
  const front = [-1.8, 0, 1.8].map(x => opening(x, 7.55, .62, 4.1))
  front.push(opening(0, 2.2, 2.05, 3.25))
  enclosure(kit, 'concrete', [0, .4, 0], 6.35, 7.35, 11.7, front,
    [-2.25, 0, 2.25].map(x => opening(x, 7.6, .55, 4.2)), 'masonry', .62)
  for (const y of [4.5, 10.75]) {
    kit.box('edge', [6.15, .25, 7.15], [0, y, 0], undefined, 'masonry')
  }
  for (const x of [-2.95, 2.95]) {
    kit.box('edge', [.37, 10.7, .22], [x, 6.05, 3.71], undefined, 'masonry')
  }
  for (const [width, depth, y, height] of [
    [6.5, 7.5, 11.9, .25], [6.75, 7.75, 12.2, .35], [7, 8, 12.55, .3],
  ]) kit.box('edge', [width, height, depth], [0, y, 0], undefined, 'masonry')
  kit.box('concrete', [6.7, .3, 7.7], [0, 12.85, 0], undefined, 'masonry')
}

/** 11 X 13 footprint, Y=0..10. Asymmetric segmental roof and a clear repair bay. */
export function buildRepairShed(kit: CityBuilder) {
  kit.box('edge', [11, .35, 13], [0, .175, 0], undefined, 'masonry')
  const arch: Profile = []
  for (let i = 0; i <= 16; i++) {
    const t = i / 16
    const x = -5.5 + 11 * t
    const y = t <= .375
      ? 7.25 + 2.75 * Math.sin(t / .375 * Math.PI / 2)
      : 6.7 + 3.3 * Math.cos((t - .375) / .625 * Math.PI / 2)
    arch.push([x, y])
  }
  const vertices: Point[] = [], faces: number[] = []
  for (const [x, y] of arch) vertices.push([x, y, -6.5], [x, y, 6.5])
  for (let i = 0; i < arch.length - 1; i++) {
    const a = i * 2
    faces.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
  }
  roof(kit, vertices, faces, 'sheet', .26)
  kit.box('faded', [.4, 7.02, 12.1], [-4.95, 3.86, 0], undefined, 'masonry')
  windowWall(kit, 'faded', [5.15, .35, 0], 12.1, 6.47,
    [opening(-3.4, 4.8, 2.5, 1.4), opening(.2, 4.8, 2.5, 1.4)],
    { depth: .4, yaw: Math.PI / 2, surface: 'masonry' })
  windowWall(kit, 'faded', [0, .35, -6.05], 10.3, 6.15,
    [opening(-2.1, 4.1, 2.3, 1.5), opening(2.1, 4.1, 2.3, 1.5)],
    { depth: .4, yaw: Math.PI, surface: 'masonry' })
  const cap: Profile = [[-5.5, 6.4], [5.5, 6.4], ...arch.slice().reverse().map(([x, y]): [number, number] => [x, y - .26])]
  profileSolid(kit, cap, -6.03, .28, 'paint', 'sheet')
  // One closed U-shaped extrusion follows the roof and leaves the tall bay empty.
  const clearArch: Profile = arch.slice(2, 15).map(([x, y]) => [x, y - .95])
  const portal: Profile = [
    [-5.5, .35], ...arch.map(([x, y]): [number, number] => [x, y - .26]),
    [5.5, .35], [4.125, .35], ...clearArch.slice().reverse(), [-4.125, .35],
  ]
  profileSolid(kit, portal, 5.65, .5, 'concrete', 'masonry')
  const lining: Profile = [
    ...clearArch.map(([x, y]): [number, number] => [x, y + .16]),
    ...clearArch.slice().reverse(),
  ]
  profileSolid(kit, lining, 5.61, .58, 'edge', 'sheet')
  for (const x of [-4.19, 4.19]) {
    const spring = clearArch[x < 0 ? 0 : clearArch.length - 1][1]
    kit.box('edge', [.13, spring - .35, .58], [x, (spring + .35) / 2, 5.9], undefined, 'sheet')
  }
  kit.box('edge', [2.3, .3, 10.85], [3.7, 4.65, 0], undefined, 'masonry')
  kit.box('edge', [6.3, .3, 2.1], [-.6, 4.65, -4.65], undefined, 'masonry')
  for (const z of [-4.8, 0, 4.8]) {
    kit.box('steel', [.22, 4.2, .22], [2.6, 2.45, z], undefined, 'sheet')
  }
  kit.box('paint', [.18, .8, 7.7], [2.58, 5.2, -.65], undefined, 'sheet')
  // Closed individual treads sit on a sloping solid slab; no collinear stair extrusion.
  kit.beam('edge', [-3.7, .48, .95], [-3.7, 4.5, -3.35], 1.05, .24, 'masonry')
  for (let i = 0; i < 12; i++) {
    kit.box('concrete', [1.1, .18, .39], [-3.7, .6 + i * .35, .8 - i * .36], undefined, 'masonry')
  }
}

/** 8 X 8 footprint, Y=0..12. Concrete lodging with a roof terrace and offset stairhead. */
export function buildCoastalLodging(kit: CityBuilder) {
  kit.box('edge', [8, .35, 8], [0, .175, 0], undefined, 'masonry')
  enclosure(kit, 'concrete', [0, .35, -.3], 7.4, 6.7, 6.85,
    [opening(-2, 2, 1.4, 2.5), opening(.3, 2, 1.1, 2.5), opening(-1.85, 5.2, 1.7, 1.65), opening(1.9, 5.2, 2.1, 1.65)],
    [opening(-1.9, 5.2, 1.3, 1.65), opening(1.6, 5.2, 1.5, 1.65)])
  kit.box('edge', [7.7, .24, 7], [0, 4.1, -.3], undefined, 'masonry')
  kit.box('edge', [7.8, .26, 7.5], [0, 7.22, -.15], undefined, 'masonry')
  // The wraparound bay has its own hollow walls, sill and roof.
  kit.box('edge', [2.8, .22, 1.35], [2.45, 4.63, 3.225], undefined, 'masonry')
  windowWall(kit, 'faded', [2.45, 4.74, 3.9], 2.8, 2.25,
    [opening(0, 1.1, 2.15, 1.55)], { depth: .22, surface: 'plaster' })
  windowWall(kit, 'faded', [3.85, 4.74, 3.225], 1.35, 2.25,
    [opening(0, 1.1, .84, 1.55)], { depth: .22, yaw: Math.PI / 2, surface: 'plaster' })
  kit.box('faded', [.22, 2.25, 1.35], [1.16, 5.865, 3.225], undefined, 'plaster')
  kit.box('edge', [2.9, .21, 1.45], [2.45, 7.05, 3.225], undefined, 'masonry')
  windowWall(kit, 'concrete', [-.65, 7.35, 2.1], 5.75, 2.7,
    [opening(-1.5, 1.25, 1.1, 1.65), opening(.9, 1.25, 1.75, 1.65)], { surface: 'plaster' })
  windowWall(kit, 'concrete', [.5, 7.35, -3.4], 3.45, 2.7,
    [opening(0, 1.25, 1.4, 1.65)], { yaw: Math.PI, surface: 'plaster' })
  windowWall(kit, 'concrete', [2.225, 7.35, -.65], 5.5, 2.7,
    [opening(-1.25, 1.25, 1.2, 1.65), opening(1.3, 1.25, 1.2, 1.65)],
    { yaw: Math.PI / 2, surface: 'plaster' })
  windowWall(kit, 'concrete', [-3.525, 7.35, .7], 2.8, 2.7,
    [opening(0, 1.25, 1.2, 1.65)], { yaw: -Math.PI / 2, surface: 'plaster' })
  // The stair enclosure continues from the upper floor, sharing its rear/side walls.
  windowWall(kit, 'faded', [-2.375, 7.35, -.7], 2.3, 4.45,
    [opening(0, 3.595, 1, 1.45)], { depth: .3, surface: 'plaster' })
  windowWall(kit, 'faded', [-2.375, 7.35, -3.4], 2.3, 4.45, [],
    { depth: .3, yaw: Math.PI, surface: 'plaster' })
  windowWall(kit, 'faded', [-3.525, 7.35, -2.05], 2.7, 4.45,
    [opening(0, 2.7, .5, 1.9)], { depth: .3, yaw: -Math.PI / 2, surface: 'plaster' })
  windowWall(kit, 'faded', [-1.225, 7.35, -2.05], 2.7, 4.45, [],
    { depth: .3, yaw: Math.PI / 2, surface: 'plaster' })
  kit.box('concrete', [2.3, .2, 2.7], [-2.375, 11.9, -2.05], undefined, 'masonry')
  // Four closed slabs leave the stair shaft open below the terrace exit.
  for (const [x, z, width, depth] of [
    [.4, -.65, 3.85, 5.7], [-2.575, .6, 2.1, 3.2],
    [-2.575, -3.325, 2.1, .35], [-3.425, -2.075, .4, 2.15],
  ]) kit.box('edge', [width, .25, depth], [x, 10.075, z], undefined, 'masonry')
  kit.beam('edge', [-2.375, 7.55, -3], [-2.375, 10.05, -1.15], 1.25, .18, 'masonry')
  for (let i = 0; i < 10; i++) {
    kit.box('concrete', [1.3, .16, .24], [-2.375, 7.62 + i * .275, -2.97 + i * .205], undefined, 'masonry')
  }
  for (const [x, z, width, depth] of [
    [-.65, 2.04, 5.95, .32], [2.165, -.65, .32, 5.7],
    [.45, -3.34, 3.75, .32], [-3.465, .65, .32, 3.1],
  ]) {
    kit.box('concrete', [width, .65, depth], [x, 10.525, z], undefined, 'plaster')
    kit.box('edge', [width, .1, depth], [x, 10.9, z], undefined, 'masonry')
  }
  kit.box('concrete', [1.05, .5, 6.8], [3.3, 7.6, -.35], undefined, 'plaster')
}

/** 12 X 6 footprint, Y=0..9. Solid ends bracket two recessed timber verandas. */
export function buildCoastalRow(kit: CityBuilder) {
  kit.box('edge', [12, .35, 6], [0, .175, 0], undefined, 'masonry')
  enclosure(kit, 'faded', [0, .35, -.1], 11.4, 5.4, 4.3,
    [opening(-3.5, 2.4, 2.1, 2.9), opening(1.8, 2.4, 3.1, 2.9)],
    [opening(0, 2.3, 1.1, 1.8)], 'masonry', .4)
  kit.box('edge', [11.5, .28, 5.5], [0, 4.72, -.1], undefined, 'masonry')
  enclosure(kit, 'paint', [0, 4.86, -.7], 11.4, 4.2, 2.7,
    [opening(-2.85, 1.3, 2.25, 1.85), opening(2.3, 1.3, 2.7, 1.85)],
    [opening(-.55, 1.3, 1.05, 1.65)], 'timber', .28)
  for (const x of [-5.4, 5.4]) {
    kit.box('faded', [.6, 2.7, 1.5], [x, 6.21, 2.1], undefined, 'plaster')
  }
  for (const [x, width] of [[-4.75, .7], [-.45, 1.3], [4.55, 1.1]]) {
    kit.box('paint', [width, 2.7, .26], [x, 6.21, 2.6], undefined, 'timber')
  }
  for (const [x, width] of [[-2.8, 3.2], [2.2, 3.4]]) {
    kit.box('paint', [width, .65, .18], [x, 5.185, 2.62], undefined, 'timber')
    kit.box('edge', [width + .1, .12, .25], [x, 5.57, 2.62], undefined, 'timber')
  }
  kit.box('edge', [11.5, .23, 5.5], [0, 7.49, -.1], undefined, 'timber')
  for (const z of [-2.65, 2.6]) {
    kit.box('paint', [11.4, .24, .3], [0, 7.68, z], undefined, 'timber')
  }
  longRoof(kit, 6, [[-3, 7.82], [-1.15, 9], [3, 7.82]])
  for (const x of [-5.7, 5.42]) {
    const shape = new THREE.Shape([
      new THREE.Vector2(-2.8, 7.59), new THREE.Vector2(2.6, 7.59),
      new THREE.Vector2(2.6, 7.6 + .4 / 4.15 * 1.18),
      new THREE.Vector2(-1.15, 8.78),
      new THREE.Vector2(-2.8, 7.6 + .2 / 1.85 * 1.18),
    ])
    const gable = new THREE.ExtrudeGeometry(shape, { depth: .28, bevelEnabled: false })
    kit.add('paint', gable.rotateY(-Math.PI / 2).translate(x + .28, 0, 0), 'timber')
  }
  roofSeams(kit, [-3.6, 0, 3.6], [[-3, 7.82], [-1.15, 9], [3, 7.82]])
  eaveGutter(kit, 11.8, 7.605, 2.86)
  kit.box('edge', [11.4, .14, .18], [0, 7.58, 2.68], undefined, 'timber')
  kit.box('steel', [.12, 3.35, .12], [5.4, 5.96, 2.83], undefined, 'sheet')
}
