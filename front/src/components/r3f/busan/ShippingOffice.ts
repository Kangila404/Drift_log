import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { windowWall, type WallOpening } from '../city/CityDetails'

const halfWidth = 6.7
const halfDepth = 5.2
const radius = 2.7
const cornerX = halfWidth - radius
const cornerZ = halfDepth - radius
const quarter = Math.PI / 2
const curveSegments = 32
const bayLeft = -6.15
const bayRight = -2.35
const bayFace = 4.55
const bayBase = 4.78
const bayTop = 12.32

// Plan coordinates use -z as Shape.y so extrusion becomes upward after rotation.
function footprint(offset = 0, recessedBay = false): THREE.Vector2[] {
  const points = [
    new THREE.Vector2(-halfWidth - offset, halfDepth + offset),
    new THREE.Vector2(halfWidth + offset, halfDepth + offset),
  ]
  for (let i = curveSegments; i >= 0; i--) {
    const angle = i / curveSegments * quarter
    points.push(new THREE.Vector2(
      cornerX + (radius + offset) * Math.sin(angle),
      -cornerZ - (radius + offset) * Math.cos(angle),
    ))
  }
  if (recessedBay) {
    points.push(
      new THREE.Vector2(bayRight, -halfDepth - offset),
      new THREE.Vector2(bayRight, -4.45),
      new THREE.Vector2(bayLeft, -4.45),
      new THREE.Vector2(bayLeft, -halfDepth - offset),
    )
  }
  points.push(new THREE.Vector2(-halfWidth - offset, -halfDepth - offset))
  return points
}

function extrude(shape: THREE.Shape, base: number, height: number) {
  return new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, steps: 1 })
    .rotateX(-Math.PI / 2).translate(0, base, 0)
}

export function buildShippingOffice(kit: CityBuilder) {
  const slab = (finish: CityFinish, y: number, height: number, offset = 0, recessedBay = false) => {
    kit.add(finish, extrude(new THREE.Shape(footprint(offset, recessedBay)), y, height), 'masonry')
  }
  const parapet = (finish: CityFinish, y: number, height: number, outer: number, inner: number) => {
    const shape = new THREE.Shape(footprint(outer))
    shape.holes.push(new THREE.Path(footprint(inner).reverse()))
    kit.add(finish, extrude(shape, y, height), 'masonry')
  }
  const arc = (finish: CityFinish, y: number, height: number, inner: number, outer: number, start = 0, end = quarter) => {
    const steps = Math.max(1, Math.ceil((end - start) / quarter * curveSegments))
    const points: THREE.Vector2[] = []
    for (const [r, reverse] of [[outer, false], [inner, true]] as const) {
      for (let i = 0; i <= steps; i++) {
        const angle = start + (end - start) * (reverse ? steps - i : i) / steps
        points.push(new THREE.Vector2(cornerX + r * Math.sin(angle), -cornerZ - r * Math.cos(angle)))
      }
    }
    kit.add(finish, extrude(new THREE.Shape(points), y, height), finish === 'glass' || finish === 'glazing' ? 'generic' : 'masonry')
  }

  const floors = [
    { base: 0, top: 4.5, sill: .8, lintel: 3.7 },
    { base: 4.5, top: 8.55, sill: 5.45, lintel: 7.95 },
    { base: 8.55, top: 12.6, sill: 9.5, lintel: 12 },
    { base: 12.6, top: 16.65, sill: 13.65, lintel: 15.85 },
  ]

  const front: WallOpening[] = []
  const side: WallOpening[] = []
  floors.forEach(({ sill, lintel }, floor) => {
    const y = (sill + lintel) / 2
    front.push({ x: -2.9, y, width: floor === 3 ? 3.4 : 3.05, height: lintel - sill })
    front.push(floor === 0
      ? { x: 1.8, y: 1.95, width: 2.1, height: 3.15 }
      : { x: 1.8, y, width: floor === 3 ? 3.45 : 3.15, height: lintel - sill })
    side.push({ x: -1.6, y, width: 3.1, height: lintel - sill })
    side.push({ x: 2.55, y: y + .15, width: .85, height: floor === 3 ? 1.6 : 2.05 })
  })
  const bayCenter = (bayLeft + bayRight) / 2
  const bayWidth = bayRight - bayLeft
  const rightCenter = (bayRight + cornerX) / 2
  windowWall(kit, 'concrete', [rightCenter, 0, halfDepth], cornerX - bayRight, 16.65,
    front.filter(opening => opening.x > 0).map(opening => ({ ...opening, x: opening.x - 1.35 - rightCenter })),
    { depth: .6, seed: 9 })
  kit.box('concrete', [bayLeft + halfWidth, 16.65, .6], [(-halfWidth + bayLeft) / 2, 8.325, 4.9], undefined, 'plaster')
  windowWall(kit, 'concrete', [bayCenter, 0, halfDepth], bayWidth, bayBase,
    [{ ...front[0], x: 0 }], { depth: .6, seed: 9 })
  windowWall(kit, 'concrete', [bayCenter, bayTop, halfDepth], bayWidth, 16.65 - bayTop,
    [{ ...front[6], x: 0, y: front[6].y - bayTop }], { depth: .6, seed: 9 })

  // Continuous masonry returns frame two recessed floors and their inset spandrel.
  for (const x of [bayLeft - .11, bayRight + .11]) {
    kit.box('concrete', [.22, bayTop - bayBase, 1.05], [x, (bayBase + bayTop) / 2, 4.675], undefined, 'masonry')
  }
  for (const y of [bayBase - .09, bayTop + .09]) {
    kit.box('concrete', [bayWidth, .18, 1.05], [bayCenter, y, 4.675], undefined, 'masonry')
  }
  windowWall(kit, 'faded', [bayCenter, bayBase, bayFace], bayWidth, 8.55 - bayBase,
    [{ ...front[2], x: 0, y: front[2].y - bayBase }], { depth: .4, seed: 9 })
  const casementShell: CityBuilder = {
    ...kit,
    add: (finish, geometry, surface) => {
      if (['dark', 'glass', 'glazing', 'steel'].includes(finish)) geometry.dispose()
      else kit.add(finish, geometry, surface)
    },
  }
  windowWall(casementShell, 'faded', [bayCenter, 8.55, bayFace], bayWidth, bayTop - 8.55,
    [{ ...front[4], x: 0, y: front[4].y - 8.55 }], { depth: .4 })

  // The opened leaf exposes a deep room pocket; no fixed pane remains across it.
  kit.box('dark', [3.05, 2.5, .12], [bayCenter, 10.75, 2.94])
  for (const x of [bayCenter - 1.575, bayCenter + 1.575]) {
    kit.box('faded', [.1, 2.5, 1.15], [x, 10.75, 3.575], undefined, 'plaster')
  }
  for (const y of [9.45, 12.05]) {
    kit.box('faded', [3.25, .1, 1.15], [bayCenter, y, 3.575], undefined, 'plaster')
  }
  for (const x of [bayCenter - 1.49, bayCenter, bayCenter + 1.49]) {
    kit.box('steel', [.07, 2.5, .12], [x, 10.75, 4.25])
  }
  for (const y of [9.54, 11.96]) kit.box('steel', [3.05, .08, .12], [bayCenter, y, 4.25])
  for (const [hingeX, angle] of [[bayCenter - 1.44, -.42], [bayCenter + .045, 0]]) {
    const matrix = new THREE.Matrix4().makeRotationY(angle).setPosition(hingeX, 10.75, 4.25)
    const leafBox = (finish: CityFinish, size: [number, number, number], at: [number, number, number]) => {
      kit.add(finish, new THREE.BoxGeometry(...size).translate(...at).applyMatrix4(matrix))
    }
    leafBox(angle ? 'glazing' : 'glass', [1.265, 2.17, .035], [.7, 0, 0])
    for (const x of [.035, 1.365]) leafBox('steel', [.07, 2.31, .085], [x, 0, 0])
    for (const y of [-1.12, 1.12]) leafBox('steel', [1.4, .07, .085], [.7, y, 0])
    leafBox('steel', [1.33, .055, .075], [.7, .55, 0])
  }
  windowWall(kit, 'concrete', [halfWidth, 0, -1.35], 7.7, 16.65, side, { depth: .6, yaw: quarter, seed: 4 })

  // Broad party walls and a narrow rear stair bay keep the office out of a window grid.
  kit.box('faded', [.6, 16.65, 9.8], [-6.4, 8.325, -.3], undefined, 'plaster')
  windowWall(kit, 'faded', [0, 0, -halfDepth], 13.4, 16.65, [
    { x: -3.7, y: 6.5, width: 1.15, height: 2.2 },
    { x: -3.7, y: 10.55, width: 1.15, height: 2.2 },
    { x: -3.7, y: 14.6, width: 1.15, height: 1.85 },
    { x: 2.9, y: 6.8, width: 2.4, height: 1.75 },
  ], { depth: .6, yaw: Math.PI, seed: 7 })

  // The corner is an annular masonry shell. Open bays pass through its full depth.
  const bays = [[.14, .52], [.59, .98], [1.05, 1.43]] as const
  floors.forEach(({ base, top, sill, lintel }, floor) => {
    arc('concrete', base, sill - base, 2.1, radius)
    arc('concrete', lintel, top - lintel, 2.1, radius)
    let previous = 0
    for (const [start, end] of bays) {
      arc('concrete', sill, lintel - sill, 2.1, radius, previous, start)
      arc('dark', sill, lintel - sill, 2.025, 2.06, start, end)
      arc(floor === 2 ? 'glazing' : 'glass', sill + .1, lintel - sill - .2, 2.1, 2.13, start + .015, end - .015)
      arc('steel', sill + .06, .085, 2.12, 2.21, start, end)
      arc('steel', lintel - .145, .085, 2.12, 2.21, start, end)
      arc('steel', sill, lintel - sill, 2.12, 2.21, start, start + .025)
      arc('steel', sill, lintel - sill, 2.12, 2.21, end - .025, end)
      arc('edge', sill - .12, .12, 2.08, 2.82, start - .018, end + .018)
      previous = end
    }
    arc('concrete', sill, lintel - sill, 2.1, radius, previous, quarter)
  })

  // Recessed paired casements sit behind the reveals, never over a solid core.
  for (const opening of front) {
    if (opening.height > 3) continue
    const x = opening.x - 1.35
    const recessed = opening.x < 0 && opening.y > bayBase && opening.y < bayTop
    if (recessed && opening.y > 8.55) continue
    kit.box('steel', [.085, opening.height, .1], [x, opening.y, recessed ? 4.24 : 4.69])
    kit.box('steel', [opening.width, .07, .1], [x, opening.y + opening.height * .24, recessed ? 4.24 : 4.69])
    if (!recessed) {
      kit.box('edge', [opening.width + .3, .18, .76], [x, opening.y + opening.height / 2 + .09, 4.96], undefined, 'masonry')
    }
  }
  for (const opening of side.filter(opening => opening.width > 2)) {
    kit.box('steel', [.1, opening.height, .085], [6.19, opening.y, -1.35 - opening.x])
    kit.box('steel', [.1, .07, opening.width], [6.19, opening.y + .55, -1.35 - opening.x])
  }

  // The middle plate has a closed concave notch behind the recessed spandrel.
  slab('edge', 0, .28)
  for (const y of [4.5, 8.55, 12.6]) {
    slab('edge', y - .24, .16, .08, y === 8.55)
    slab('concrete', y - .08, .27, .22, y === 8.55)
    slab('trim', y + .19, .09, .27, y === 8.55)
  }
  slab('edge', 16.48, .17, .12)
  slab('concrete', 16.65, .28, .3)
  slab('trim', 16.93, .12, .3)
  slab('steel', 17.05, .06, -.45)
  parapet('concrete', 17.05, .76, 0, -.38)
  parapet('edge', 17.81, .16, .1, -.48)

  // A low landing and restrained door are wholly below the shared water at 4.25.
  kit.box('edge', [2.6, .28, .58], [.45, .14, 5.19], undefined, 'masonry')
  kit.box('paint', [1.84, 2.95, .12], [.45, 1.88, 4.68])
  kit.box('steel', [.07, 2.95, .08], [.45, 1.88, 4.77])
  kit.box('edge', [2.45, .24, .8], [.45, 3.64, 4.99], undefined, 'masonry')

  // Rooftop stair access encloses an actual door recess and terminates at y=19.
  windowWall(kit, 'faded', [-3.35, 17.11, -1.2], 3.1, 1.74, [
    { x: .25, y: .8, width: .88, height: 1.42 },
  ], { depth: .26, seed: 2 })
  kit.box('paint', [.8, 1.35, .06], [-3.1, 17.91, -1.42])
  kit.box('faded', [.26, 1.74, 2.8], [-4.77, 17.98, -2.86], undefined, 'plaster')
  kit.box('faded', [.26, 1.74, 2.8], [-1.93, 17.98, -2.86], undefined, 'plaster')
  kit.box('faded', [3.1, 1.74, .26], [-3.35, 17.98, -4.13], undefined, 'plaster')
  kit.box('edge', [3.3, .15, 3.26], [-3.35, 18.925, -2.73], undefined, 'masonry')
}
