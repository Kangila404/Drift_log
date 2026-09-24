import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { roofShell, windowWall, type WallOpening } from '../city/CityDetails'
import type { Point } from '../city/CityPrimitives'
import type { CitySurface } from '../city/CitySurfaces'

// Facade evidence: archive.much.go.kr/archiveImage/thumb.do?idnbr=2019027271
// and idnbr=2019027273. Concept B supplies layout only: its glass arch/vent
// are rejected. Local ground is 0, flood level 4.25, and the front faces +Z.
const FRONT = 4
const CENTRE_FRONT = 4.32
const WALL_DEPTH = .48
const WING_HEIGHT = 11.25

function extrude(kit: CityBuilder, finish: CityFinish, shape: THREE.Shape, front: number, depth: number, surface: CitySurface = 'plaster') {
  kit.add(finish, new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: false, curveSegments: 12, steps: 1,
  }).translate(0, 0, front - depth), surface)
}

function rectangle(x: number, bottom: number, width: number, height: number) {
  return new THREE.Shape([
    new THREE.Vector2(x - width / 2, bottom),
    new THREE.Vector2(x + width / 2, bottom),
    new THREE.Vector2(x + width / 2, bottom + height),
    new THREE.Vector2(x - width / 2, bottom + height),
  ])
}

function arch(x: number, bottom: number, spring: number, radius: number) {
  const shape = new THREE.Shape()
  shape.moveTo(x - radius, bottom)
  shape.lineTo(x + radius, bottom)
  shape.lineTo(x + radius, spring)
  for (let step = 1; step < 24; step++) {
    const angle = Math.PI * step / 24
    shape.lineTo(x + radius * Math.cos(angle), spring + radius * Math.sin(angle))
  }
  shape.lineTo(x - radius, spring)
  shape.lineTo(x - radius, bottom)
  shape.closePath()
  return shape
}

function hole(shape: THREE.Shape) {
  return new THREE.Path(shape.getPoints(12).reverse())
}

// A U-shaped masonry moulding with a real extruded intrados and outer edge.
function archSurround(kit: CityBuilder, x: number, bottom: number, spring: number, radius: number, width: number, front: number, depth = .13, finish: CityFinish = 'trim') {
  const shape = new THREE.Shape()
  shape.moveTo(x - radius - width, bottom)
  shape.lineTo(x - radius, bottom)
  shape.lineTo(x - radius, spring)
  for (let step = 1; step < 24; step++) {
    const angle = Math.PI * (1 - step / 24)
    shape.lineTo(x + radius * Math.cos(angle), spring + radius * Math.sin(angle))
  }
  shape.lineTo(x + radius, spring)
  shape.lineTo(x + radius, bottom)
  shape.lineTo(x + radius + width, bottom)
  shape.lineTo(x + radius + width, spring)
  for (let step = 1; step < 24; step++) {
    const angle = Math.PI * step / 24
    shape.lineTo(x + (radius + width) * Math.cos(angle), spring + (radius + width) * Math.sin(angle))
  }
  shape.lineTo(x - radius - width, spring)
  shape.closePath()
  extrude(kit, finish, shape, front, depth)
}

function flatRoof(kit: CityBuilder, x: number, y: number, width: number, depth: number, z = 0) {
  roofShell(kit, new THREE.PlaneGeometry(width, depth)
    .rotateX(-Math.PI / 2).translate(x, y, z), .2, 'steel', 'sheet')
}

function centreFacade(kit: CityBuilder) {
  const shape = new THREE.Shape([
    new THREE.Vector2(-3.6, 0), new THREE.Vector2(3.6, 0),
    new THREE.Vector2(3.6, 11.87), new THREE.Vector2(2.45, 11.87),
    new THREE.Vector2(2.45, 12.65), new THREE.Vector2(-2.45, 12.65),
    new THREE.Vector2(-2.45, 11.87), new THREE.Vector2(-3.6, 11.87),
  ])
  const paneFront = CENTRE_FRONT - WALL_DEPTH + .035
  for (const x of [-1.25, 0, 1.25]) {
    const upper = rectangle(x, 8.58, .8, 1.58)
    const lower = arch(x, 5.05, 7.13, .43)
    const door = rectangle(x, .65, .92, 2.98)
    for (const opening of [upper, lower, door]) {
      shape.holes.push(hole(opening))
      extrude(kit, 'glass', opening, paneFront, .045, 'generic')
    }
    for (const [bottom, top, width] of [[8.58, 10.16, .8], [5.05, 7.13, .86], [.65, 3.63, .92]]) {
      kit.box('steel', [.045, top - bottom, .08], [x, (top + bottom) / 2, paneFront + .035], undefined, 'sheet')
      kit.box('steel', [width, .045, .08], [x, bottom + (top - bottom) * .52, paneFront + .035], undefined, 'sheet')
      kit.box('trim', [width + .16, .09, .61], [x, bottom - .045, CENTRE_FRONT - .23], undefined, 'plaster')
    }
    archSurround(kit, x, 5.02, 7.13, .43, .11, CENTRE_FRONT + .1)
  }
  extrude(kit, 'concrete', shape, CENTRE_FRONT, WALL_DEPTH)

  // The upper arch encloses plaster and three rectangular holes, never one pane.
  // A recessed inner strip and deeper rim share the original arch outline.
  archSurround(kit, 0, 8.45, 9.88, 1.85, .06, CENTRE_FRONT + .2, .21, 'edge')
  archSurround(kit, 0, 8.45, 9.88, 1.91, .12, CENTRE_FRONT + .28, .29)
  kit.box('trim', [4.08, .12, .21], [0, 8.43, CENTRE_FRONT + .025], undefined, 'plaster')
  for (const x of [-3.49, 3.49]) {
    kit.box('trim', [.22, 7.5, .16], [x, 8.1, CENTRE_FRONT + .045], undefined, 'plaster')
  }
  kit.box('trim', [5.04, .15, .67], [0, 12.725, CENTRE_FRONT - .2], undefined, 'plaster')
  for (const x of [-3.025, 3.025]) {
    kit.box('trim', [1.15, .13, .65], [x, 11.935, CENTRE_FRONT - .2], undefined, 'plaster')
  }
}

export function buildProvincialOffice(kit: CityBuilder) {
  for (const side of [-1, 1]) {
    const wingX = side * 9.3
    const openings: WallOpening[] = []
    for (const y of [2.55, 6.05, 9.25]) {
      for (const group of [-3.35, 0, 3.35]) {
        for (const pair of [-.49, .49]) {
          openings.push({ x: group + pair, y, width: .69, height: y < 3 ? 1.8 : 1.95 })
        }
      }
    }
    windowWall(kit, 'concrete', [wingX, 0, FRONT], 11.4, WING_HEIGHT, openings,
      { depth: WALL_DEPTH, seed: 7, surface: 'plaster' })
    flatRoof(kit, wingX, 10.96, 11.4, 8)

    const endOpenings: WallOpening[] = []
    for (const y of [2.55, 6.05, 9.25]) {
      for (const x of [-2.2, 0, 2.2]) endOpenings.push({ x, y, width: .82, height: 1.85 })
    }
    windowWall(kit, 'concrete', [side * 15, 0, 0], 8, WING_HEIGHT, endOpenings,
      { depth: WALL_DEPTH, yaw: side * Math.PI / 2, seed: 9, surface: 'plaster' })

    for (const z of [-3.83, 3.83]) {
      kit.box('trim', [11.4, .13, .34], [wingX, 11.285, z], undefined, 'plaster')
      kit.box('edge', [11.4, .1, .12], [wingX, 10.91, z + Math.sign(z) * .15], undefined, 'plaster')
    }
    kit.box('trim', [.34, .13, 8], [side * 14.83, 11.285, 0], undefined, 'plaster')
    kit.box('trim', [.24, 6.89, .16], [side * 14.84, 7.665, 4.04], undefined, 'plaster')
    // The centre projects slightly; these return walls close both vertical seams.
    kit.box('concrete', [.48, 11.87, .8], [side * 3.36, 5.935, 3.92], undefined, 'plaster')
    kit.box('concrete', [.48, .91, 8], [side * 3.36, 11.415, 0], undefined, 'plaster')
    kit.box('trim', [.5, .13, 8.2], [side * 3.35, 11.935, .1], undefined, 'plaster')
  }

  const rearOpenings: WallOpening[] = []
  for (const y of [2.55, 6.05, 9.25]) {
    for (const x of [-12.5, -9.2, -5.9, -2.2, 2.2, 5.9, 9.2, 12.5]) {
      rearOpenings.push({ x, y, width: 1.05, height: 1.8 })
    }
  }
  windowWall(kit, 'concrete', [0, 0, -4], 30, WING_HEIGHT, rearOpenings,
    { depth: WALL_DEPTH, yaw: Math.PI, seed: 5, surface: 'plaster' })
  kit.box('concrete', [7.2, .62, .48], [0, 11.56, -3.76], undefined, 'plaster')
  kit.box('trim', [7.2, .13, .5], [0, 11.935, -3.75], undefined, 'plaster')
  flatRoof(kit, 0, 11.6, 7.2, 8.32, .16)
  centreFacade(kit)

  // Interior floor plates terminate at the wall shell; no solid core fills holes.
  for (const y of [.1, 4.05, 7.83]) {
    kit.box('edge', [29.04, .2, 7.04], [0, y, 0], undefined, 'masonry')
    kit.box('edge', [6.24, .2, .32], [0, y, 3.68], undefined, 'masonry')
  }
  kit.box('edge', [30, .42, 8], [0, .21, 0], undefined, 'masonry')

  // The rectangular entrance canopy remains barely above the 4.25 waterline.
  flatRoof(kit, 0, 4.65, 5.6, 1.84, 4.76)
  kit.box('trim', [5.6, .22, .3], [0, 4.54, 5.53], undefined, 'plaster')
  for (const side of [-1, 1]) {
    kit.box('trim', [.3, .22, 1.84], [side * 2.65, 4.54, 4.76], undefined, 'plaster')
    kit.box('concrete', [.4, 3.75, .44], [side * 2.25, 2.575, 5.22], undefined, 'plaster')
    kit.box('trim', [.53, .2, .57], [side * 2.25, 4.35, 5.22], undefined, 'plaster')
    kit.box('edge', [.56, .2, .6], [side * 2.25, .8, 5.22], undefined, 'masonry')
  }
  for (let step = 0; step < 3; step++) {
    kit.box('edge', [5.9, .22, 2.45 - step * .36], [0, .11 + step * .22, 4.79 - step * .18], undefined, 'masonry')
  }

  const losses: { at: Point; width: number; height: number }[] = [
    { at: [-14.12, 4.67, FRONT + .018], width: .94, height: .43 },
    { at: [10.91, 7.44, FRONT + .018], width: .64, height: .24 },
    { at: [3.04, 5.15, CENTRE_FRONT + .018], width: .3, height: .65 },
  ]
  for (const { at: [x, y, z], width, height } of losses) {
    const outline = new THREE.Shape([
      new THREE.Vector2(x - width / 2, y - height * .3),
      new THREE.Vector2(x - width * .2, y - height / 2),
      new THREE.Vector2(x + width * .43, y - height * .35),
      new THREE.Vector2(x + width / 2, y + height * .12),
      new THREE.Vector2(x + width * .14, y + height / 2),
      new THREE.Vector2(x - width * .36, y + height * .3),
    ])
    extrude(kit, 'rust', outline, z, .026, 'masonry')
  }
}
