import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { roofShell, windowWall, type WallOpening } from '../city/CityDetails'

type Point = [number, number, number]
type Profile = [number, number][]
const HALF_TURN = Math.PI
const QUARTER_TURN = Math.PI / 2

// Local +z is the street/court front. All foundations start at y=0;
// placement supplies the world transform and the shared 4.25 waterline.
function openings(xs: number[], ys: number[], width: number, height: number): WallOpening[] {
  return ys.flatMap(y => xs.map(x => ({ x, y, width, height })))
}

function profileWall(kit: CityBuilder, finish: CityFinish, profile: Profile, at: Point, yaw = 0, depth = .3) {
  const shape = new THREE.Shape(profile.map(([x, y]) => new THREE.Vector2(x, y)))
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, steps: 1 })
  geometry.translate(0, 0, -depth).rotateY(yaw).translate(...at)
  kit.add(finish, geometry, finish === 'glass' ? undefined : 'masonry')
}

function roofStrip(kit: CityBuilder, profile: Profile, depth: number, at: Point, yaw = 0, finish: CityFinish = 'steel') {
  const positions: number[] = [], indices: number[] = []
  profile.forEach(([x, y], i) => {
    positions.push(x, y, -depth / 2, x, y, depth / 2)
    if (i < profile.length - 1) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.rotateY(yaw).translate(...at)
  geometry.computeVertexNormals()
  roofShell(kit, geometry, .16, finish, 'sheet')

  // Narrow sheet laps follow the actual roof profile without subdividing its shell.
  const seamPositions: number[] = [], seamIndices: number[] = []
  const sheets = Math.ceil(depth / .7)
  for (let sheet = 1; sheet < sheets; sheet++) {
    const z = -depth / 2 + sheet * depth / sheets
    const start = seamPositions.length / 3
    profile.forEach(([x, y], i) => {
      seamPositions.push(x, y + .009, z - .014, x, y + .009, z + .014)
      if (i < profile.length - 1) {
        const a = start + i * 2
        seamIndices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
      }
    })
  }
  const seams = new THREE.BufferGeometry()
  seams.setAttribute('position', new THREE.Float32BufferAttribute(seamPositions, 3))
  seams.setIndex(seamIndices)
  seams.rotateY(yaw).translate(...at)
  seams.computeVertexNormals()
  kit.add(finish === 'steel' ? 'paint' : 'steel', seams, 'sheet')
}

function gutter(kit: CityBuilder, x: number, y: number, depth: number) {
  // A shallow open channel, not a solid bar across the roof drainage path.
  kit.box('edge', [.2, .055, depth], [x, y, 0], undefined, 'sheet')
  for (const side of [-1, 1]) {
    kit.box('steel', [.035, .16, depth], [x + side * .083, y + .065, 0], undefined, 'sheet')
  }
  kit.box('edge', [.11, y, .12], [x, y / 2, depth / 2 - .28], undefined, 'sheet')
}

/** Brick textile hall, 12 x 8 x 9, with two complete industrial floors. */
export function buildTextileWorkshop(kit: CityBuilder) {
  const wallHeight = 7.08
  for (const y of [.12, 3.55, 7.02]) {
    kit.box('edge', [11.5, .24, 7.5], [0, y, 0], undefined, 'masonry')
  }
  const frontWindows = openings([-3.65, 0, 3.65], [1.95, 5.4], 2.85, 2.15)
  for (const side of [-1, 1]) {
    const yaw = side === 1 ? 0 : HALF_TURN
    windowWall(kit, 'rust', [0, 0, side * 3.75], 11.5, wallHeight,
      frontWindows, { yaw, depth: .38, surface: 'masonry', seed: 2 })
    for (const x of [-5.5, -1.83, 1.83, 5.5]) {
      kit.box('rust', [.38, wallHeight, .48], [x, wallHeight / 2, side * 3.66], undefined, 'masonry')
    }
    // Industrial glazing sits inside the masonry reveals; muntins stop at the jambs.
    for (const { x, y, width, height } of frontWindows) {
      for (const dx of [-.7, .7]) {
        kit.box('steel', [.045, height - .16, .065], [x + dx, y, side * 3.43], undefined, 'sheet')
      }
      kit.box('steel', [width - .15, .055, .065], [x, y, side * 3.43], undefined, 'sheet')
    }
    profileWall(kit, 'rust', [
      [-5.75, wallHeight], [5.75, wallHeight], [5.75, 7.2117], [0, 8.84], [-5.75, 7.2117],
    ], [0, 0, side * 3.75], yaw, .38)
    for (const x of [-5.75, 5.75]) {
      kit.beam('edge', [x, 7.27, side * 3.79], [0, 8.9, side * 3.79], .09, .1, 'sheet')
    }
  }
  for (const side of [-1, 1]) {
    windowWall(kit, 'rust', [side * 5.75, 0, 0], 7.5, wallHeight,
      openings([-2.25, 1.9], [1.95, 5.4], 2.45, 2.15),
      { yaw: side * QUARTER_TURN, depth: .38, surface: 'masonry', seed: 3 })
    gutter(kit, side * 5.87, 7.03, 7.9)
  }
  roofStrip(kit, [[-6, 7.14], [0, 9]], 8, [0, 0, 0])
  roofStrip(kit, [[0, 9], [6, 7.14]], 8, [0, 0, 0])
  // The loading entrance is recessed into one ground-floor bay.
  kit.box('paint', [2.4, 2.75, .08], [0, 1.53, 3.26], undefined, 'sheet')
  for (const y of [.62, 1.12, 1.62, 2.12, 2.62]) {
    kit.box('edge', [2.34, .04, .05], [0, y, 3.32], undefined, 'sheet')
  }
}

/** Enclosed two-span market, 14 x 10 x 8; high curved clerestories face the street. */
export function buildCoveredMarket(kit: CityBuilder) {
  const wallHeight = 5.48
  kit.box('edge', [13.5, .22, 9.5], [0, .11, 0], undefined, 'masonry')
  // Upper perimeter walkways leave the central trading hall double height.
  for (const x of [-5.6, 5.6]) {
    kit.box('edge', [2.3, .2, 9], [x, 3.65, 0], undefined, 'masonry')
  }
  for (const side of [-1, 1]) {
    const yaw = side === 1 ? 0 : HALF_TURN
    windowWall(kit, 'faded', [0, 0, side * 4.75], 13.5, wallHeight,
      openings([-5.2, -1.75, 1.75, 5.2], [2.25], 2.45, 3.35),
      { depth: .32, yaw, surface: 'plaster', seed: 3 })
    for (const x of [-6.56, -3.5, 0, 3.5, 6.56]) {
      kit.box('concrete', [.25, 5.6, .4], [x, 2.8, side * 4.68], undefined, 'masonry')
    }
    kit.box('edge', [13.5, .2, .42], [0, 5.43, side * 4.62], undefined, 'masonry')
  }
  for (const side of [-1, 1]) {
    windowWall(kit, 'faded', [side * 6.75, 0, 0], 9.5, 6.38,
      [...openings([-3.15, 0, 3.15], [2.2], 2.05, 2.8),
        ...openings([-3.15, 0, 3.15], [5.68], 2.35, .8)],
      { depth: .32, yaw: side * QUARTER_TURN, surface: 'plaster', seed: 2 })
  }
  for (const [center, crown] of [[-3.5, 8], [3.5, 7.72]]) {
    const archY = (x: number) => 6.48 + (crown - 6.48) * Math.cos(x / 3.5 * QUARTER_TURN)
    const arc: Profile = Array.from({ length: 21 }, (_, i) => {
      const x = -3.5 + i * .35
      return [x, archY(x)]
    })
    roofStrip(kit, arc, 10, [center, 0, 0], 0, center < 0 ? 'steel' : 'paint')
    for (const side of [-1, 1]) {
      const yaw = side === 1 ? 0 : HALF_TURN
      const half = center < 0 ? 3.23 : 3.23
      const insetArc: Profile = Array.from({ length: 21 }, (_, i) => {
        const x = -half + i * half / 10
        return [x, archY(x) - .16]
      })
      // Glazed end walls follow the roof underside and close each barrel.
      profileWall(kit, 'glass', [[-half, 5.46], [half, 5.46], ...insetArc.slice().reverse()],
        [center, 0, side * 4.46], yaw, .075)
      for (const localX of [-3.23, -1.62, 0, 1.62, 3.23]) {
        const top = archY(localX) - .17
        kit.box('steel', [.09, top - 5.43, .12],
          [center + localX, (top + 5.43) / 2, side * 4.57], undefined, 'sheet')
      }
      kit.box('steel', [6.48, .085, .13], [center, 6.22, side * 4.56], undefined, 'sheet')
      // Solid jamb returns connect the recessed arch glass to the side walls.
      for (const localX of [-3.365, 3.365]) {
        profileWall(kit, 'edge', [
          [localX - .135, 5.46], [localX + .135, 5.46],
          [localX + .135, archY(localX + .135) - .16],
          [localX - .135, archY(localX - .135) - .16],
        ], [center, 0, side * 4.75], yaw, .4)
      }
      for (let i = 0; i < arc.length - 1; i++) {
        kit.beam('edge', [center + arc[i][0], arc[i][1] - .045, side * 4.8],
          [center + arc[i + 1][0], arc[i + 1][1] - .045, side * 4.8], .065, .1, 'sheet')
      }
    }
    for (const z of [-2.8, 0, 2.8]) {
      for (let i = 0; i < arc.length - 1; i++) {
        kit.beam('steel', [center + arc[i][0], arc[i][1] - .23, z],
          [center + arc[i + 1][0], arc[i + 1][1] - .23, z], .1, .11, 'sheet')
      }
    }
  }
  for (const x of [-6.86, 0, 6.86]) {
    gutter(kit, x, 6.3, 9.88)
    for (const z of [-2.8, 0, 2.8]) {
      kit.box('steel', [.16, 6.35, .18], [x === 0 ? 0 : Math.sign(x) * 6.5, 3.175, z], undefined, 'sheet')
    }
  }
}

function galleryRail(kit: CityBuilder, from: Point, to: Point) {
  kit.beam('edge', from, to, .12, .12, 'sheet')
  const length = Math.hypot(to[0] - from[0], to[2] - from[2])
  const bays = Math.ceil(length / 1.5)
  for (let i = 0; i <= bays; i++) {
    const x = from[0] + (to[0] - from[0]) * i / bays
    const z = from[2] + (to[2] - from[2]) * i / bays
    kit.box('steel', [.075, .85, .075], [x, from[1] - .425, z], undefined, 'sheet')
  }
}

/** Three inhabited wings, 12 x 10 x 11, surrounding a genuinely open floodable court. */
export function buildCourtyardHousing(kit: CityBuilder) {
  const rearHeight = 10.55
  for (const y of [.12, 3.4, 6.8, rearHeight]) {
    kit.box('edge', [11.6, .24, 3], [0, y, -3.3], undefined, 'masonry')
  }
  windowWall(kit, 'concrete', [0, 0, -4.8], 11.6, rearHeight,
    openings([-4.35, -1.45, 1.45, 4.35], [1.8, 5.05, 8.5], 1.3, 1.65),
    { yaw: HALF_TURN, depth: .3, surface: 'plaster', seed: 1 })
  windowWall(kit, 'concrete', [0, 0, -1.8], 11.6, rearHeight,
    openings([-1.45, 1.45], [1.7, 4.88, 8.28], 1.05, 2.5),
    { depth: .3, surface: 'plaster', seed: 2 })
  for (const side of [-1, 1]) {
    const roofY = side < 0 ? 10.05 : 9.55
    const center = side * 4.4
    windowWall(kit, 'concrete', [side * 5.8, 0, -3.3], 3, rearHeight,
      openings([0], [1.8, 5.05, 8.5], 1, 1.65),
      { yaw: side * QUARTER_TURN, depth: .3, surface: 'plaster' })
    for (const y of [.12, 3.4, 6.8, roofY]) {
      kit.box('edge', [2.8, .24, 6.6], [center, y, 1.5], undefined, 'masonry')
    }
    windowWall(kit, side < 0 ? 'faded' : 'concrete', [side * 5.8, 0, 1.5], 6.6, roofY,
      openings([-1.85, 1.85], [1.8, 5.05, 8.15], 1.25, 1.55),
      { yaw: side * QUARTER_TURN, depth: .3, surface: 'plaster', seed: 3 })
    windowWall(kit, 'faded', [side * 3, 0, 1.5], 6.6, roofY,
      openings([-1.85, 1.85], [1.7, 4.88, 8.28], 1.05, 2.5),
      { yaw: -side * QUARTER_TURN, depth: .3, surface: 'plaster', seed: 1 })
    windowWall(kit, 'concrete', [center, 0, 4.8], 2.8, roofY,
      openings([0], [1.8, 5.05, 8.15], 1.15, 1.65),
      { depth: .3, surface: 'plaster', seed: 2 })
    // The side-wing floors end at the court walls; only narrow galleries project inward.
    for (const y of [3.4, 6.8]) {
      kit.box('edge', [1.15, .18, 6.6], [side * 2.425, y, 1.5], undefined, 'masonry')
      galleryRail(kit, [side * 1.92, y + 1, -.7], [side * 1.92, y + 1, 4.7])
      galleryRail(kit, [side * 1.92, y + 1, 4.7], [side * 3, y + 1, 4.7])
    }
    for (const z of [-.7, 2.05, 4.66]) {
      kit.box('edge', [.16, 6.8, .16], [side * 1.97, 3.4, z], undefined, 'masonry')
    }
    kit.box('edge', [2.96, .18, 6.7], [center, roofY + .16, 1.5], undefined, 'masonry')
    kit.box('concrete', [.18, .45, 6.8], [side * 5.82, roofY + .225, 1.5], undefined, 'plaster')
    kit.box('concrete', [.18, .45, 6.8], [side * 2.98, roofY + .225, 1.5], undefined, 'plaster')
    kit.box('concrete', [3, .45, .18], [center, roofY + .225, 4.82], undefined, 'plaster')
  }
  for (const y of [3.4, 6.8]) {
    kit.box('edge', [3.7, .18, 1.15], [0, y, -1.225], undefined, 'masonry')
    galleryRail(kit, [-1.92, y + 1, -.72], [1.92, y + 1, -.72])
  }
  kit.box('edge', [12, .18, 3.2], [0, rearHeight + .16, -3.3], undefined, 'masonry')
  for (const z of [-4.82, -1.78]) {
    kit.box('concrete', [11.8, .45, .18], [0, rearHeight + .225, z], undefined, 'plaster')
  }
  for (const x of [-5.82, 5.82]) {
    kit.box('concrete', [.18, .45, 3.2], [x, rearHeight + .225, -3.3], undefined, 'plaster')
  }
  // Flush threshold only: no slab or foundation block spans the open central court.
  kit.box('edge', [3.7, .12, .2], [0, .06, 4.9], undefined, 'masonry')
}

/** Stepped corner retail, 8 x 7 x 10, with a deep upper balcony and pitched rear roof. */
export function buildCornerShops(kit: CityBuilder) {
  for (const y of [.12, 3.25, 6.35]) {
    kit.box('edge', [7.5, .24, 6.5], [0, y, 0], undefined, 'masonry')
  }
  windowWall(kit, 'faded', [0, 0, 3.25], 7.5, 6.35,
    [...openings([-2.3, 1.45], [1.65], 2.25, 2.5),
      ...openings([-2.3, 1.45], [4.9], 2.25, 1.85)],
    { depth: .34, surface: 'plaster', seed: 2 })
  for (const side of [-1, 1]) {
    windowWall(kit, side < 0 ? 'rust' : 'faded', [side * 3.75, 0, 0], 6.5, 6.35,
      [...openings([-1.85, 1.7], [1.65], 1.8, 2.5),
        ...openings([-.8, 1.85], [4.9], 1.25, 1.85)],
      { depth: .34, yaw: side * QUARTER_TURN, surface: 'masonry', seed: 3 })
  }
  windowWall(kit, 'rust', [0, 0, -3.25], 7.5, 8.55,
    openings([-2.4, .25, 2.45], [1.8, 4.9, 7.55], 1.05, 1.35),
    { depth: .34, yaw: HALF_TURN, surface: 'masonry', seed: 3 })
  // The rear upper rooms occupy only the back four metres of the parcel.
  windowWall(kit, 'faded', [0, 6.35, .75], 7.5, 2.2,
    openings([.45, 2.4], [1.12], 1.05, 1.92),
    { depth: .3, surface: 'plaster', seed: 2 })
  for (const side of [-1, 1]) {
    windowWall(kit, 'rust', [side * 3.75, 6.35, -1.25], 4, 2.2,
      openings([0], [1.18], 1.65, 1.3),
      { depth: .3, yaw: side * QUARTER_TURN, surface: 'masonry', seed: 2 })
    profileWall(kit, 'rust', [
      [-2, 8.55], [2, 8.55], [2, 8.6582], [0, 9.84], [-2, 8.6582],
    ], [side * 3.75, 0, -1.25], side * QUARTER_TURN)
  }
  roofStrip(kit, [[-2.2, 8.54], [0, 9.84 + .16]], 8, [0, 0, -1.25], QUARTER_TURN)
  roofStrip(kit, [[0, 10], [2.2, 8.54]], 8, [0, 0, -1.25], QUARTER_TURN)
  // A taller left shop bay supports the flat return; the right bay is open balcony.
  windowWall(kit, 'concrete', [-2.175, 6.35, 3.25], 3.15, 2.35,
    openings([0], [1.25], 1.75, 1.5), { depth: .3, surface: 'plaster' })
  for (const x of [-3.75, -.6]) {
    windowWall(kit, 'concrete', [x, 6.35, 2], 2.5, 2.35,
      openings([0], [1.25], .85, 1.5),
      { depth: .3, yaw: x < -1 ? -QUARTER_TURN : QUARTER_TURN, surface: 'plaster' })
  }
  kit.box('edge', [3.25, .2, 2.7], [-2.175, 8.7, 2], undefined, 'masonry')
  kit.box('concrete', [4.35, .52, .2], [1.575, 6.73, 3.18], undefined, 'plaster')
  kit.box('concrete', [.2, .52, 2.5], [3.68, 6.73, 2], undefined, 'plaster')
  galleryRail(kit, [-.55, 7.42, 3.18], [3.68, 7.42, 3.18])
  galleryRail(kit, [3.68, 7.42, 3.18], [3.68, 7.42, .83])
  kit.box('edge', [7.8, .14, .26], [0, 6.35, 3.25], undefined, 'masonry')
  kit.box('edge', [.26, .14, 6.5], [3.75, 6.35, 0], undefined, 'masonry')
  kit.box('edge', [7.6, .055, .18], [0, 8.43, .91], undefined, 'sheet')
  kit.box('steel', [7.6, .12, .035], [0, 8.47, .985], undefined, 'sheet')
  kit.beam('edge', [3.7, 8.43, .91], [3.84, 8.18, .68], .09, .09, 'sheet')
  kit.box('edge', [.09, 8.18, .09], [3.84, 4.09, .68], undefined, 'sheet')
  kit.box('edge', [7.8, .16, .42], [0, 3.32, 3.24], undefined, 'sheet')
  for (const x of [-3.54, -.55, 3.54]) {
    kit.box('concrete', [.24, 3.24, .4], [x, 1.62, 3.16], undefined, 'masonry')
  }
}

/** Narrow three-storey walk-up, 6 x 8 x 12.2, with an inset internal stair bay. */
export function buildWalkupTenement(kit: CityBuilder) {
  const frontHeight = 11.5425, rearHeight = 12.0175
  kit.box('edge', [5.6, .2, 7.6], [0, .1, 0], undefined, 'masonry')
  for (const level of [4, 7.8]) {
    // Apartment and rear landing slabs leave the switchback stairwell open vertically.
    kit.box('edge', [3.7, .2, 7.6], [.95, level - .1, 0], undefined, 'masonry')
    kit.box('edge', [1.9, .2, 3.04], [-1.85, level - .1, -2.28], undefined, 'masonry')
    kit.box('edge', [1.9, .2, .98], [-1.85, level - .1, 3.31], undefined, 'masonry')
  }
  windowWall(kit, 'faded', [.95, 0, 3.8], 3.7, frontHeight,
    openings([-.55, .55], [2.1, 5.9, 9.7], .72, 1.3),
    { depth: .3, surface: 'plaster', seed: 2 })
  windowWall(kit, 'rust', [0, 0, -3.8], 5.6, rearHeight,
    openings([-1.15, 1.15], [2.1, 5.9, 9.7], .95, 1.45),
    { depth: .3, yaw: HALF_TURN, surface: 'masonry', seed: 1 })
  for (const side of [-1, 1]) {
    windowWall(kit, side < 0 ? 'rust' : 'faded', [side * 2.8, 0, 0], 7.6, 11.5,
      openings([side * 1.9], [2.1, 5.9, 9.7], .95, 1.35),
      { depth: .3, yaw: side * QUARTER_TURN, surface: side < 0 ? 'masonry' : 'plaster', seed: 3 })
    profileWall(kit, 'edge', [
      [-3.8, 11.5], [3.8, 11.5],
      [3.8, side > 0 ? rearHeight : frontHeight],
      [-3.8, side > 0 ? frontHeight : rearHeight],
    ], [side * 2.8, 0, 0], side * QUARTER_TURN)
  }

  for (const x of [-2.67, -1.03]) {
    kit.box('rust', [.26, frontHeight, .5], [x, frontHeight / 2, 3.55], undefined, 'masonry')
  }
  kit.box('rust', [1.9, .32, .5], [-1.85, .16, 3.55], undefined, 'masonry')
  kit.box('rust', [1.9, .5, .5], [-1.85, frontHeight - .25, 3.55], undefined, 'masonry')
  for (const x of [-2.5, -1.2]) {
    kit.box('steel', [.065, 10.72, .1], [x, 5.68, 3.43], undefined, 'sheet')
  }
  // Surviving edge panes retain the tall glazed bay without an opaque backing hiding the stairs.
  for (const bottom of [.36, 3.94, 7.52]) {
    for (const x of [-2.39, -1.31]) {
      kit.box('glass', [.15, 3.45, .025], [x, bottom + 1.725, 3.4])
    }
    kit.box('steel', [1.36, .07, .1], [-1.85, bottom, 3.43], undefined, 'sheet')
  }
  kit.box('steel', [1.36, .07, .1], [-1.85, 11, 3.43], undefined, 'sheet')

  const flight = (x: number, base: number, startZ: number, direction: number) => {
    // Closed treads meet a continuous inclined slab; no collinear cap triangulation.
    for (let i = 0; i < 10; i++) {
      kit.box('concrete', [.68, .19, .28],
        [x, base + (i + .5) * .19, startZ - direction * (i + .5) * .28], undefined, 'masonry')
    }
    kit.beam('concrete', [x, base - .03, startZ], [x, base + 1.8, startZ - direction * 2.8], .68, .18, 'masonry')
  }
  for (const base of [.2, 4]) {
    flight(-2.16, base, 2.82, 1)
    kit.box('edge', [1.56, .2, .8], [-1.77, base + 1.8, -.36], undefined, 'masonry')
    flight(-1.38, base + 1.9, .02, -1)
  }
  roofStrip(kit, [[-4, 11.69], [4, 12.19]], 6, [0, 0, 0], QUARTER_TURN)
  kit.box('edge', [5.7, .055, .17], [0, 11.5, 3.9], undefined, 'sheet')
  kit.box('steel', [5.7, .13, .035], [0, 11.54, 3.967], undefined, 'sheet')
  kit.beam('edge', [2.65, 11.5, 3.9], [2.87, 11.2, 3.7], .08, .08, 'sheet')
  kit.box('edge', [.08, 11.2, .08], [2.87, 5.6, 3.7], undefined, 'sheet')
}
