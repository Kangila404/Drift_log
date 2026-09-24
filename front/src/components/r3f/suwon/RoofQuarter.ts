import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { roofShell, windowWall, type WallOpening } from '../city/CityDetails'
import type { Point } from '../city/CityPrimitives'
import type { CitySurface } from '../city/CitySurfaces'
import { placeSuwon } from './SuwonPlacement'

const WALL = .32
const SHELL = .18

interface Home {
  width: number
  depth: number
  height: number
  finish: CityFinish
  surface: CitySurface
  singleStorey?: boolean
}

interface RoofRoom {
  width: number
  depth: number
  height: number
  pitch?: number
  side?: -1 | 1
  z?: number
}

function roundBeam(kit: CityBuilder, a: Point, b: Point, radius: number, finish: CityFinish = 'steel', surface: CitySurface = 'sheet') {
  const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b)
  const direction = end.clone().sub(start)
  const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 6)
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()))
  geometry.translate(...start.add(end).multiplyScalar(.5).toArray())
  kit.add(finish, geometry, surface)
}

function closedDoor(kit: CityBuilder, x: number, y: number, width: number, height: number) {
  kit.box('paint', [width - .08, height - .06, .1], [x, y, -WALL + .1], undefined, 'timber')
  for (const offset of [-.24, .24]) {
    kit.box('faded', [width - .26, height * .36, .045], [x, y + height * offset, -WALL + .17], undefined, 'timber')
  }
  kit.box('steel', [.06, .2, .08], [x + width * .31, y, -WALL + .22], undefined, 'sheet')
  kit.box('edge', [width + .18, .12, .58], [x, y - height / 2 - .04, -.08], undefined, 'masonry')
}

function facade(kit: CityBuilder, home: Home, span: number, entrance: boolean) {
  const { height, finish, surface, singleStorey } = home
  const rows = singleStorey ? [height - .65] : [1.95, 3.75 + (height - 3.75) * .53]
  const columns = entrance ? [-.25, .25] : [0]
  const doorHeight = singleStorey ? 2.12 : 2.42, doorY = singleStorey ? 1.22 : 1.43
  const doorWidth = singleStorey ? 1 : 1.22
  const openings: WallOpening[] = []
  rows.forEach((y, floor) => {
    columns.forEach((fraction, column) => {
      const door = entrance && floor === 0 && column === 0
      openings.push({ x: span * fraction, y: door ? doorY : y,
        width: door ? doorWidth : singleStorey ? Math.min(1.9, span * (entrance ? .23 : .5)) : Math.min(1.65, span * .23),
        height: door ? doorHeight : singleStorey ? .62 : 1.48 })
    })
  })
  windowWall(kit, finish, [0, 0, 0], span, height, openings, { depth: WALL, surface })
  if (entrance) closedDoor(kit, span * columns[0], doorY, doorWidth, doorHeight)
  for (const [index, opening] of openings.entries()) {
    if (!singleStorey && opening.y < 3.75 && !(entrance && index === 0)) continue
    const { x, y, width, height: openingHeight } = opening
    for (const side of [-1, 1]) {
      kit.box('paint', [.065, openingHeight, .11], [x + side * (width / 2 - .0325), y, -WALL + .11], undefined, 'timber')
    }
  }
  // Lintels and deep sills remain legible above the shared flood without a window grid.
  for (const opening of entrance ? openings : []) {
    kit.box('edge', [opening.width + .3, .13, .44], [opening.x, opening.y + opening.height / 2 + .09, -.09], undefined, 'masonry')
  }
}

function closedHome(kit: CityBuilder, home: Home) {
  const { width: w, depth: d, height: h, singleStorey } = home
  placeSuwon(kit, [0, 0, d / 2], 0, 1, local => facade(local, home, w, true))
  placeSuwon(kit, [0, 0, -d / 2], Math.PI, 1, local => facade(local, home, w, false))
  placeSuwon(kit, [w / 2, 0, 0], Math.PI / 2, 1, local => facade(local, home, d, false))
  placeSuwon(kit, [-w / 2, 0, 0], -Math.PI / 2, 1, local => facade(local, home, d, false))
  kit.box('edge', [w, .28, d], [0, .14, 0], undefined, 'masonry')
  kit.box('dark', [w - .18, .16, d - .18], [0, h - .08, 0], undefined, 'plaster')
  if (!singleStorey) {
    kit.box('edge', [w + .08, .18, d + .08], [0, 3.7, 0], undefined, 'masonry')
  }
  for (const side of [-1, 1]) {
    kit.box('edge', [w, .46, WALL + .06], [0, .51, side * (d - WALL) / 2], undefined, 'masonry')
    kit.box('edge', [WALL + .06, .46, d], [side * (w - WALL) / 2, .51, 0], undefined, 'masonry')
  }
}

function roofHeight(z: number, halfDepth: number, eave: number, rise: number) {
  const t = Math.min(1, Math.abs(z) / halfDepth)
  // A restrained pitch descends to the wall-supported eave without a scooped lip.
  return eave + rise * (1 - t) * (1 - .08 * t)
}

// Closed half-round tile caps sit into the shell; only selected courses are modeled.
function tileCap(kit: CityBuilder, x: number, side: number, halfDepth: number, eave: number, rise: number) {
  const positions: number[] = [], indices: number[] = []
  const steps = 6, arcs = 6, radius = .085
  for (let row = 0; row <= steps; row++) {
    const z = side * halfDepth * row / steps
    for (let arc = 0; arc <= arcs; arc++) {
      const angle = arc / arcs * Math.PI
      positions.push(x + Math.cos(angle) * radius, roofHeight(z, halfDepth, eave, rise) - .012 + Math.sin(angle) * radius, z)
    }
  }
  const triangle = (a: number, b: number, c: number) => {
    if (side > 0) indices.push(a, b, c)
    else indices.push(a, c, b)
  }
  for (let row = 0; row < steps; row++) {
    for (let arc = 0; arc < arcs; arc++) {
      const a = row * (arcs + 1) + arc, b = a + arcs + 1
      triangle(a, a + 1, b); triangle(a + 1, b + 1, b)
    }
    const a = row * (arcs + 1), b = a + arcs + 1
    triangle(a, b, a + arcs); triangle(a + arcs, b, b + arcs)
  }
  for (let arc = 1; arc < arcs; arc++) {
    triangle(0, arc + 1, arc)
    const end = steps * (arcs + 1)
    triangle(end, end + arc, end + arc + 1)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  const cap = geometry.toNonIndexed()
  geometry.dispose()
  cap.computeVertexNormals()
  kit.add('steel', cap, 'tile')
}

function gableInfill(kit: CityBuilder, home: Home, halfDepth: number, eave: number, rise: number) {
  const { width: w, depth: d, height: h, finish, surface } = home
  const knots = [-d / 2, ...Array.from({ length: 13 }, (_, i) => -halfDepth + i * halfDepth / 6)
    .filter(z => z > -d / 2 && z < d / 2), d / 2]
  // Interpolate on the shell's actual facets, including its clipped wall intersections.
  const underside = (z: number) => {
    const segment = Math.min(11, Math.floor((z + halfDepth) / (halfDepth / 6)))
    const a = -halfDepth + segment * halfDepth / 6, b = a + halfDepth / 6
    const t = (z - a) / (b - a)
    return roofHeight(a, halfDepth, eave, rise) * (1 - t) + roofHeight(b, halfDepth, eave, rise) * t - SHELL
  }
  const outline = new THREE.Shape()
  outline.moveTo(-d / 2, h - .04); outline.lineTo(d / 2, h - .04)
  for (const z of knots.toReversed()) outline.lineTo(z, underside(z))
  outline.closePath()
  const eaveFill = underside(d / 2) - h
  for (const side of [-1, 1]) {
    kit.box(finish, [w, eaveFill + .04, WALL], [0, h + (eaveFill - .04) / 2, side * (d - WALL) / 2], undefined, surface)
  }
  for (const side of [-1, 1]) {
    const geometry = new THREE.ExtrudeGeometry(outline, { depth: WALL, bevelEnabled: false, steps: 1, curveSegments: 1 })
    geometry.rotateY(side * Math.PI / 2).translate(side * (w / 2 - WALL), 0, 0)
    kit.add(finish, geometry, surface)
    kit.box('rust', [.2, .22, d], [side * (w / 2 - .04), h - .07, 0], undefined, 'timber')
  }
}

function gabledHome(kit: CityBuilder, home: Home, rise: number, tiled: boolean) {
  closedHome(kit, home)
  const { width: w, depth: d, height: h } = home
  const overhang = tiled ? .5 : .4, halfDepth = d / 2 + overhang, eave = h + SHELL
  const roofWidth = w + overhang * 2
  const geometry = new THREE.PlaneGeometry(roofWidth, halfDepth * 2, 1, 12)
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) {
    const z = -positions.getY(i)
    positions.setXYZ(i, positions.getX(i), roofHeight(z, halfDepth, eave, rise), z)
  }
  roofShell(kit, geometry, SHELL, tiled ? 'steel' : 'faded', tiled ? 'tile' : 'sheet')
  gableInfill(kit, home, halfDepth, eave, rise)
  const courses = tiled ? (w > 12 ? 5 : 4) : 0
  for (let i = 0; i < courses; i++) {
    const x = -w / 2 + .12 + (w - .24) * i / (courses - 1)
    for (const side of [-1, 1]) tileCap(kit, x, side, halfDepth, eave, rise)
  }
  roundBeam(kit, [-roofWidth / 2, eave + rise + .02, 0], [roofWidth / 2, eave + rise + .02, 0], tiled ? .15 : .1, 'steel', tiled ? 'tile' : 'sheet')
  for (const side of [-1, 1]) {
    const z = side * (halfDepth - .04), gutterY = eave - .03
    kit.box('rust', [w, .24, .24], [0, h - .1, side * (d / 2 - .15)], undefined, 'timber')
    // A trough has a bottom and two sides, connected to an offset downpipe at its end.
    kit.box('steel', [roofWidth + .08, .06, .24], [0, gutterY - .1, z], undefined, 'sheet')
    for (const lip of [-1, 1]) kit.box('steel', [roofWidth + .08, .16, .04], [0, gutterY, z + lip * .1], undefined, 'sheet')
    const x = w / 2 - .24
    roundBeam(kit, [x, gutterY, z], [x, h - .4, side * (d / 2 + .1)], .07)
    roundBeam(kit, [x, h - .4, side * (d / 2 + .1)], [x, .35, side * (d / 2 + .1)], .07)
    for (let i = 0; i < 5; i++) {
      const rx = -w / 2 + .36 + (w - .72) * i / 4
      kit.beam('rust', [rx, h - .2, side * (d / 2 - .3)], [rx, eave - .16, side * halfDepth], .12, .15, 'timber')
    }
  }
  if (!tiled) {
    // Broad folded sheets use a few seams following the same six roof facets.
    for (const x of [-w * .32, 0, w * .32]) {
      for (const side of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const a = side * halfDepth * i / 6, b = side * halfDepth * (i + 1) / 6
          kit.beam('faded', [x, roofHeight(a, halfDepth, eave, rise) + .018, a],
            [x, roofHeight(b, halfDepth, eave, rise) + .018, b], .035, .035, 'sheet')
        }
      }
    }
  }
}

function parapet(kit: CityBuilder, w: number, d: number, y: number, height = .64, courtAccess = false) {
  for (const side of [-1, 1]) {
    kit.box('concrete', [w, height, .22], [0, y + height / 2, side * (d / 2 - .11)], undefined, 'plaster')
    kit.box('edge', [w + .08, .1, .32], [0, y + height, side * (d / 2 - .11)], undefined, 'masonry')
    const sections = courtAccess && side === 1
      ? [[-d / 2 + .22, -2.73], [-1.63, d / 2 - .22]]
      : [[-d / 2 + .22, d / 2 - .22]]
    for (const [start, end] of sections) {
      kit.box('concrete', [.22, height, end - start], [side * (w / 2 - .11), y + height / 2, (start + end) / 2], undefined, 'plaster')
      kit.box('edge', [.32, .1, end - start + .08], [side * (w / 2 - .11), y + height, (start + end) / 2], undefined, 'masonry')
    }
  }
}

function accessRoom(kit: CityBuilder, room: RoofRoom) {
  const { width: w, depth: d, height: h, pitch = 0 } = room
  const finish = pitch ? 'faded' : 'concrete'
  closedHome(kit, { width: w, depth: d, height: h, finish, surface: 'plaster', singleStorey: true })
  if (!pitch) {
    kit.box('edge', [w + .24, .17, d + .24], [0, h + .025, 0], undefined, 'masonry')
    return
  }
  // The wedge walls and roof use one linear profile, closing the sloping soffit.
  const roofY = (z: number) => h + pitch * (.5 - z / d)
  const geometry = new THREE.PlaneGeometry(w + .28, d + .32).rotateX(-Math.PI / 2)
  const positions = geometry.getAttribute('position')
  for (let i = 0; i < positions.count; i++) positions.setY(i, roofY(positions.getZ(i)) + SHELL)
  roofShell(kit, geometry, SHELL, 'steel', 'sheet')
  for (const side of [-1, 1]) {
    const outline = new THREE.Shape([
      new THREE.Vector2(-d / 2, h - .04), new THREE.Vector2(d / 2, h - .04),
      new THREE.Vector2(d / 2, roofY(-side * d / 2)), new THREE.Vector2(-d / 2, roofY(side * d / 2)),
    ])
    kit.add(finish, new THREE.ExtrudeGeometry(outline, { depth: WALL, bevelEnabled: false })
      .rotateY(side * Math.PI / 2).translate(side * (w / 2 - WALL), 0, 0), 'plaster')
  }
  kit.box(finish, [w, pitch + .04, WALL], [0, h + (pitch - .04) / 2, -(d - WALL) / 2], undefined, 'plaster')
  const gutterZ = d / 2 + .18, gutterY = roofY(gutterZ) + .02
  kit.box('steel', [w + .32, .05, .2], [0, gutterY - .065, gutterZ], undefined, 'sheet')
  for (const side of [-1, 1]) kit.box('steel', [w + .32, .14, .035], [0, gutterY, gutterZ + side * .085], undefined, 'sheet')
  roundBeam(kit, [w / 2 - .18, gutterY, gutterZ], [w / 2 - .18, .3, gutterZ], .055)
}

function flatHome(kit: CityBuilder, home: Home, room?: RoofRoom, courtAccess = false) {
  closedHome(kit, home)
  const { width: w, depth: d, height: h } = home
  kit.box('edge', [w + .08, .22, d + .08], [0, h + .03, 0], undefined, 'masonry')
  parapet(kit, w, d, h + .14, .64, courtAccess)
  if (room) {
    const x = (room.side ?? -1) * (w / 2 - room.width / 2 - .35), z = room.z ?? -d / 2 + room.depth / 2 + .4
    placeSuwon(kit, [x, h + .14, z], 0, 1, local => accessRoom(local, room))
  }
  const x = w / 2 - .35, z = d / 2 + .12
  roundBeam(kit, [x, h + .2, d / 2 - .25], [x, h - .3, z], .075)
  roundBeam(kit, [x, h - .3, z], [x, .35, z], .075)
}

function courtStair(kit: CityBuilder, edge: number, roofY: number) {
  const steps = 11, run = .35, rise = (roofY - .28) / (steps * 2)
  const inner = edge + .58, outer = edge + 1.77, start = -1.85, end = start + steps * run
  for (let flight = 0; flight < 2; flight++) {
    const x = flight ? inner : outer, direction = flight ? -1 : 1
    const z0 = flight ? end : start, y0 = .28 + flight * steps * rise
    for (let i = 0; i < steps; i++) {
      kit.box('edge', [1.08, .14, run + .035], [x, y0 + (i + 1) * rise - .07, z0 + direction * (i + .5) * run], undefined, 'masonry')
    }
    for (const side of [-1, 1]) {
      kit.beam('steel', [x + side * .43, y0 - .08, z0], [x + side * .43, y0 + steps * rise - .08, z0 + direction * steps * run], .12, .16, 'sheet')
    }
    const railX = x + (flight ? -.52 : .52)
    for (const t of [0, .5, 1]) {
      kit.beam('steel', [railX, y0 + t * steps * rise, z0 + direction * t * steps * run],
        [railX, y0 + t * steps * rise + .88, z0 + direction * t * steps * run], .055, .055, 'sheet')
    }
    kit.beam('steel', [railX, y0 + .88, z0], [railX, y0 + steps * rise + .88, z0 + direction * steps * run], .06, .06, 'sheet')
  }
  kit.box('edge', [2.36, .18, .86], [edge + 1.18, roofY / 2 + .05, end + .4], undefined, 'masonry')
  for (const x of [inner, outer]) kit.box('steel', [.12, roofY / 2, .12], [x, roofY / 4, end + .7], undefined, 'sheet')
  kit.box('edge', [1.45, .16, .75], [edge + .46, roofY - .08, start - .33], undefined, 'masonry')
}

function yardWall(kit: CityBuilder, a: Point, b: Point, height: number) {
  const dx = b[0] - a[0], dz = b[2] - a[2], length = Math.hypot(dx, dz)
  const yaw = -Math.atan2(dz, dx)
  kit.box('faded', [length, height, .3], [(a[0] + b[0]) / 2, height / 2, (a[2] + b[2]) / 2], [0, yaw, 0], 'plaster')
  kit.box('edge', [length + .12, .16, .45], [(a[0] + b[0]) / 2, height, (a[2] + b[2]) / 2], [0, yaw, 0], 'masonry')
}

/** Ground-relative geometry: the caller places each quarter on inland terrain. */
export function buildRoofQuarter(kit: CityBuilder, variant = 0) {
  const alternate = Math.abs(Math.trunc(variant)) % 2 === 1
  if (!alternate) {
    placeSuwon(kit, [-2.9, 0, -3.8], 0, 1, local => gabledHome(local,
      { width: 14, depth: 5.3, height: 7.05, finish: 'concrete', surface: 'plaster' }, 1.95, true))
    placeSuwon(kit, [7, 0, 0], Math.PI / 2, 1, local => gabledHome(local,
      { width: 10.8, depth: 5.8, height: 6.45, finish: 'paint', surface: 'masonry' }, 1.3, false))
    placeSuwon(kit, [-7.3, 0, 3.15], 0, 1, local => {
      flatHome(local, { width: 5.2, depth: 6.5, height: 7.6, finish: 'faded', surface: 'plaster' },
        { width: 2.5, depth: 4.1, height: 2.38, pitch: .35 }, true)
      courtStair(local, 2.6, 7.74)
    })
    yardWall(kit, [-9.75, 0, -1.2], [-9.75, 0, .1], 4.9)
    yardWall(kit, [-4.7, 0, 6.15], [-.6, 0, 6.15], 4.85)
    yardWall(kit, [1.7, 0, 6.15], [9.8, 0, 6.15], 4.85)
    yardWall(kit, [9.75, 0, 5.35], [9.75, 0, 6.15], 4.85)
  } else {
    placeSuwon(kit, [-7, 0, .2], Math.PI / 2, 1, local => gabledHome(local,
      { width: 10.4, depth: 5.8, height: 7.35, finish: 'faded', surface: 'plaster' }, 2.1, true))
    placeSuwon(kit, [2.9, 0, -3.85], 0, 1, local => gabledHome(local,
      { width: 14, depth: 5.2, height: 6.8, finish: 'paint', surface: 'masonry' }, 1.25, false))
    placeSuwon(kit, [7.05, 0, 3.2], Math.PI, 1, local => {
      flatHome(local, { width: 5.7, depth: 6.4, height: 7.1, finish: 'concrete', surface: 'plaster' },
        { width: 4.35, depth: 2.45, height: 2.5, side: 1, z: .65 }, true)
      courtStair(local, 2.85, 7.24)
    })
    yardWall(kit, [9.75, 0, -1.3], [9.75, 0, .1], 5.05)
    yardWall(kit, [-9.8, 0, 6.15], [-2.4, 0, 6.15], 4.75)
    yardWall(kit, [-.15, 0, 6.15], [4.25, 0, 6.15], 4.75)
    yardWall(kit, [-9.75, 0, 5.35], [-9.75, 0, 6.15], 4.75)
  }
}

/** Attached two-storey homes, with room access supplied by enclosed stairheads. */
export function buildBackstreetHomes(kit: CityBuilder, variant = 0) {
  const alternate = Math.abs(Math.trunc(variant)) % 2 === 1
  if (!alternate) {
    placeSuwon(kit, [-4.7, 0, .05], 0, 1, local => flatHome(local,
      { width: 10.4, depth: 11.3, height: 8.4, finish: 'paint', surface: 'masonry' },
      { width: 2.65, depth: 4.4, height: 2.4, pitch: .28 }))
    placeSuwon(kit, [5, 0, -.4], 0, 1, local => gabledHome(local,
      { width: 9, depth: 9.8, height: 8.95, finish: 'concrete', surface: 'plaster' }, 2.2, false))
  } else {
    placeSuwon(kit, [-6.4, 0, -.1], 0, 1, local => flatHome(local,
      { width: 7, depth: 11.2, height: 9.65, finish: 'faded', surface: 'plaster' },
      { width: 4.7, depth: 2.7, height: 2.65, side: 1 }))
    placeSuwon(kit, [-.2, 0, -1.5], 0, 1, local => flatHome(local,
      { width: 5.4, depth: 8.4, height: 7.9, finish: 'paint', surface: 'masonry' }))
    placeSuwon(kit, [6, 0, .1], 0, 1, local => gabledHome(local,
      { width: 7, depth: 10.3, height: 8.15, finish: 'concrete', surface: 'plaster' }, 1.9, false))
  }
}
