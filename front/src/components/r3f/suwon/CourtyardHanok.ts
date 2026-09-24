import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'
import { placeSuwon } from './SuwonPlacement'
import { buildTileRoof, createTileRoofProfile, type TileRoofOptions } from './SuwonRoof'

type Point = [number, number, number]
type RoofHeight = (x: number, z: number) => number
const floorY = 4.7

function withRoof(kit: CityBuilder, at: Point, options: TileRoofOptions, build: (height: RoofHeight) => void) {
  const profile = createTileRoofProfile(options)
  placeSuwon(kit, at, 0, 1, roof => buildTileRoof(roof, options))
  build((x, z) => {
    const t = 1 - Math.abs(z - at[2]) / (options.depth / 2)
    const u = (x - at[0]) / profile.halfSpan(t)
    return at[1] + profile.soffit(u, t)[1]
  })
}

function timber(kit: CityBuilder, size: Point, at: Point, rotation?: Point) {
  kit.box('rust', size, at, rotation, 'timber')
}

function post(kit: CityBuilder, x: number, z: number, top = 6.98) {
  kit.box('edge', [.49, .25, .48], [x, 4.54, z], undefined, 'masonry')
  timber(kit, [.24, top - 4.58, .24], [x, (top + 4.58) / 2, z])
  timber(kit, [.43, .16, .36], [x, top - .15, z])
}

function plaster(kit: CityBuilder, width: number, height: number, at: Point, depth = .24) {
  kit.box('concrete', [width, height, depth], at, undefined, 'plaster')
}

function gable(kit: CityBuilder, x: number, z: number, halfDepth: number, eave: number, roofHeight: RoofHeight) {
  // Fit the thick wall to the actual soffit, including changes made by the roof owner.
  const profile: THREE.Vector2[] = []
  for (let i = 0; i <= 24; i++) {
    const offset = -halfDepth + i / 24 * halfDepth * 2
    // Concealed overlap accommodates the soffit's coarse planar facets.
    const height = Math.max(...[-.11, 0, .11].map(dx => roofHeight(x + dx, z - offset))) + .055
    const point = new THREE.Vector2(offset, height)
    while (profile.length >= 2) {
      const a = profile[profile.length - 2], b = profile[profile.length - 1]
      const area = (b.x - a.x) * (point.y - a.y) - (b.y - a.y) * (point.x - a.x)
      if (Math.abs(area) > .00001) break
      profile.pop()
    }
    profile.push(point)
  }
  const shape = new THREE.Shape()
  shape.moveTo(-halfDepth, eave)
  shape.lineTo(halfDepth, eave)
  for (const point of [...profile].reverse()) shape.lineTo(point.x, point.y)
  shape.closePath()
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: .22, bevelEnabled: false, steps: 1 })
  geometry.rotateY(Math.PI / 2).translate(x - .11, 0, z)
  kit.add('concrete', geometry, 'plaster')
  const ridge = Math.max(...profile.map(point => point.y)) - .09
  timber(kit, [.3, ridge - eave, .16], [x, (ridge + eave) / 2, z])
  const edge = new THREE.Shape()
  edge.moveTo(profile[0].x, profile[0].y - .02)
  for (const point of profile.slice(1)) edge.lineTo(point.x, point.y - .02)
  for (const point of [...profile].reverse()) edge.lineTo(point.x, point.y - .18)
  edge.closePath()
  kit.add('rust', new THREE.ExtrudeGeometry(edge, { depth: .12, bevelEnabled: false, steps: 1 })
    .rotateY(Math.PI / 2).translate(x + Math.sign(x) * .11 - .06, 0, z), 'timber')
}

// Each leaf has its own thickness and hinges; the clear room opening remains empty.
function foldingDoor(kit: CityBuilder, at: Point, yaw: number, width: number, paper: boolean) {
  placeSuwon(kit, at, yaw, 1, leaf => {
    const height = 1.67
    for (const x of [-width / 2 + .045, width / 2 - .045]) {
      timber(leaf, [.09, height, .105], [x, height / 2, 0])
    }
    for (const y of [.045, .51, height - .045]) {
      timber(leaf, [width, .09, .105], [0, y, 0])
    }
    leaf.box('faded', [width - .15, .4, .065], [0, .275, 0], undefined, 'timber')
    if (paper) leaf.box('edge', [width - .15, 1.04, .035], [0, 1.065, -.025], undefined, 'plaster')
    for (const x of [-width * .2, width * .2]) {
      timber(leaf, [.035, 1.05, .055], [x, 1.065, .025])
    }
    for (const y of [.86, 1.25]) timber(leaf, [width - .14, .035, .055], [0, y, .025])
    for (const y of [.3, 1.38]) leaf.box('steel', [.12, .1, .035], [-width / 2 + .07, y, .068], undefined, 'sheet')
  })
}

function recessedWindow(kit: CityBuilder, x: number, z: number, width: number) {
  // Surrounding wall panels stop at this recess instead of passing behind it.
  kit.box('dark', [width, 1.15, .065], [x, 5.7, z - .13], undefined, 'timber')
  for (const side of [-1, 1]) timber(kit, [.085, 1.31, .2], [x + side * (width + .065) / 2, 5.7, z])
  for (const y of [5.09, 6.31]) timber(kit, [width + .17, .1, .23], [x, y, z + .015])
  for (const offset of [-.3, -.1, .1, .3]) timber(kit, [.035, 1.12, .055], [x + offset * width, 5.7, z - .065])
  timber(kit, [width, .045, .065], [x, 5.84, z - .055])
}

function rearWing(kit: CityBuilder, roofHeight: RoofHeight) {
  // An L-shaped foundation leaves the entire courtyard available to shared water.
  kit.box('edge', [15.35, 4.45, 4.5], [0, 2.225, -3.05], undefined, 'masonry')
  kit.box('faded', [15.4, .25, 4.52], [0, floorY - .125, -3.05], undefined, 'timber')
  timber(kit, [15.5, .22, .27], [0, 4.61, -.84])
  for (let i = 0; i < 21; i++) {
    kit.box(i % 5 === 0 ? 'rust' : 'faded', [.705, .045, 1.03], [-7.3 + i * .73, 4.723, -1.35], undefined, 'timber')
  }

  plaster(kit, 15.2, 2.24, [0, 5.82, -5.14])
  kit.box('edge', [14.8, 1.95, .07], [0, 5.715, -4.975], undefined, 'plaster')
  for (const x of [-7.54, 7.54]) {
    kit.box('concrete', [.25, 2.24, 4.2], [x, 5.82, -3.03], undefined, 'plaster')
    gable(kit, x, -3.2, 2.16, 6.86, roofHeight)
  }

  const frontZ = -1.97
  // Left sleeping room: broad plaster fields with a single recessed lattice sash.
  plaster(kit, .52, 2.12, [-7.16, 5.76, frontZ])
  plaster(kit, 1.27, 2.12, [-4.72, 5.76, frontZ])
  plaster(kit, 1.42, .39, [-6.13, 4.895, frontZ])
  plaster(kit, 1.42, .46, [-6.13, 6.6, frontZ])
  recessedWindow(kit, -6.13, frontZ, 1.3)
  kit.box('edge', [.18, 2.05, 3.06], [-4.03, 5.725, -3.48], undefined, 'plaster')

  // Central maru and a narrower open room share a deep veranda, with unequal bays.
  for (const x of [-7.48, -4.02, -.73, 2.03, 4.67, 7.48]) {
    post(kit, x, -.98)
    post(kit, x, -5.01)
    timber(kit, [.19, .23, 4.23], [x, 6.8, -3.02])
    kit.beam('rust', [x, 6.22, -1.04], [x, 6.72, -1.65], .13, .17, 'timber')
  }
  for (const z of [-5.01, -.98]) timber(kit, [15.65, .25, .27], [0, 6.9, z])
  timber(kit, [11.62, .21, .22], [1.71, 6.59, frontZ])
  for (const x of [-4.03, 2.04, 4.68]) timber(kit, [.16, 1.98, .24], [x, 5.69, frontZ])
  timber(kit, [8.65, .1, .33], [.31, 4.755, frontZ])
  kit.box('dark', [8.54, .09, 2.84], [.36, 4.72, -3.44], undefined, 'timber')
  kit.box('dark', [8.54, .14, 2.95], [.36, 6.77, -3.48], undefined, 'timber')
  kit.box('edge', [.16, 1.94, 2.53], [2.04, 5.77, -3.71], undefined, 'plaster')
  plaster(kit, 2.58, .31, [6.12, 6.67, frontZ])
  plaster(kit, 2.58, 1.73, [6.12, 5.565, frontZ])

  foldingDoor(kit, [-3.65, 4.8, -1.82], -.9, .69, false)
  foldingDoor(kit, [-3.2, 4.8, -1.38], .88, .69, false)
  foldingDoor(kit, [1.61, 4.8, -1.84], .94, .63, true)
  foldingDoor(kit, [4.25, 4.8, -1.82], -.92, .64, true)

  // Purlins and short queen posts tie the visible ceiling to both roof slopes.
  for (const z of [-4.22, -3.2, -2.18]) {
    const y = z === -3.2 ? 9.1 : 7.91
    timber(kit, [15.37, .18, .2], [0, y, z])
    for (const x of [-4.02, 2.03, 7.48]) {
      timber(kit, [.17, y - 6.85, .17], [x, (y + 6.85) / 2, z])
    }
  }
}

function rightWing(kit: CityBuilder, roofHeight: RoofHeight) {
  // Local +z faces the courtyard; placement rotates it toward world -x.
  kit.box('edge', [6.42, 4.45, 3.85], [-.73, 2.225, -.04], undefined, 'masonry')
  kit.box('faded', [6.48, .25, 3.93], [-.73, floorY - .125, -.04], undefined, 'timber')
  timber(kit, [6.5, .21, .26], [-.73, 4.62, 1.84])
  for (let i = 0; i < 9; i++) {
    kit.box('faded', [.68, .045, .92], [-3.62 + i * .72, 4.723, 1.35], undefined, 'timber')
  }
  plaster(kit, 6.35, 2.13, [-.73, 5.765, -1.8])
  kit.box('edge', [6.08, 1.96, .055], [-.73, 5.68, -1.643], undefined, 'plaster')
  kit.box('concrete', [.25, 2.13, 3.63], [2.42, 5.765, -.025], undefined, 'plaster')
  gable(kit, 2.42, 0, 1.82, 6.8, roofHeight)
  gable(kit, -3.02, 0, 1.82, 6.8, roofHeight)

  for (const x of [-3.12, -.63, 2.4]) {
    for (const z of [-1.75, 1.72]) post(kit, x, z, 6.91)
    timber(kit, [.21, .22, 3.68], [x, 6.76, -.015])
    kit.beam('rust', [x, 6.21, 1.68], [x, 6.69, 1.12], .13, .15, 'timber')
    timber(kit, [.17, 1.87, .17], [x, 7.735, 0])
  }
  for (const z of [-1.75, 1.72]) timber(kit, [6.4, .24, .23], [-.73, 6.82, z])
  timber(kit, [5.67, .18, .21], [-.35, 8.67, 0])
  timber(kit, [6.38, .17, .18], [-.73, 6.54, .94])

  // One open service bay, one enclosed room, and a return into the rear veranda.
  kit.box('dark', [2.28, .085, 2.4], [-1.86, 4.735, -.37], undefined, 'timber')
  kit.box('dark', [2.35, .13, 2.5], [-1.86, 6.66, -.37], undefined, 'timber')
  kit.box('edge', [.18, 1.93, 2.68], [-.65, 5.745, -.38], undefined, 'plaster')
  timber(kit, [.16, 1.94, .2], [-.65, 5.74, .94])
  timber(kit, [2.36, .1, .3], [-1.86, 4.78, .94])
  foldingDoor(kit, [-2.76, 4.8, 1.1], -.98, .61, false)
  plaster(kit, .63, 1.89, [-.23, 5.645, .94])
  plaster(kit, .66, 1.89, [1.99, 5.645, .94])
  plaster(kit, 1.47, .38, [.88, 4.89, .94])
  plaster(kit, 1.47, .29, [.88, 6.495, .94])
  recessedWindow(kit, .88, .94, 1.34)
}

function courtyardEdges(kit: CityBuilder) {
  // Only a low left return and a short front remnant rise above the flood.
  kit.box('edge', [.46, 4.48, 5.56], [-7.52, 2.24, 2.15], undefined, 'masonry')
  kit.box('concrete', [.36, .49, 5.56], [-7.52, 4.655, 2.15], undefined, 'plaster')
  kit.box('steel', [.57, .15, 5.7], [-7.52, 4.94, 2.15], undefined, 'tile')
  kit.box('edge', [2.12, 4.48, .43], [-6.69, 2.24, 4.84], undefined, 'masonry')
  kit.box('concrete', [2.12, .35, .33], [-6.69, 4.585, 4.84], undefined, 'plaster')
  kit.box('steel', [2.24, .14, .52], [-6.69, 4.82, 4.84], undefined, 'tile')
  // These two submerged approach treads lead to the central maru threshold.
  kit.box('edge', [2.76, .29, .66], [-1.76, 4.285, -.53], undefined, 'masonry')
  kit.box('edge', [2.94, .22, .7], [-1.76, 4.035, .04], undefined, 'masonry')
}

export function buildCourtyardHanok(kit: CityBuilder) {
  withRoof(kit, [0, 0, -3.2], { width: 16, depth: 5, eaveY: 7, ridgeY: 9.5, hip: false }, height => rearWing(kit, height))
  placeSuwon(kit, [5.9, 0, 2.8], -Math.PI / 2, 1, wing => {
    withRoof(wing, [-.35, 0, 0], { width: 6.3, depth: 4.4, eaveY: 6.95, ridgeY: 9, hip: false }, height => rightWing(wing, height))
  })
  courtyardEdges(kit)
}
