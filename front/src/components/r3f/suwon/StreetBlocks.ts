import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { roofShell, windowWall, type WallOpening } from '../city/CityDetails'
import type { CitySurface } from '../city/CitySurfaces'
import { placeSuwon } from './SuwonPlacement'

type Point = [number, number, number]
type Shaft = { x: number; z: number; width: number; depth: number }
type Body = { width: number; depth: number; floors: number[]; finish: CityFinish; surface: CitySurface }

function variantIndex(variant: number) {
  return Number.isFinite(variant) ? ((Math.trunc(variant) % 3) + 3) % 3 : 0
}

function rectangle(width: number, depth: number, x = 0, z = 0) {
  return [new THREE.Vector2(x - width / 2, z - depth / 2),
    new THREE.Vector2(x + width / 2, z - depth / 2),
    new THREE.Vector2(x + width / 2, z + depth / 2),
    new THREE.Vector2(x - width / 2, z + depth / 2)]
}

function slab(kit: CityBuilder, width: number, depth: number, y: number, shaft?: Shaft, sheet = false) {
  const outline = new THREE.Shape(rectangle(width, depth))
  // Shape Y becomes negative world Z after rotation, including the stair opening.
  if (shaft) outline.holes.push(new THREE.Path(rectangle(shaft.width, shaft.depth, shaft.x, -shaft.z).reverse()))
  roofShell(kit, new THREE.ShapeGeometry(outline).rotateX(-Math.PI / 2).translate(0, y, 0),
    .18, sheet ? 'steel' : 'faded', sheet ? 'sheet' : 'masonry')
}

function wall(kit: CityBuilder, body: Body, at: Point, width: number, yaw: number, openings: WallOpening[]) {
  const details: CityBuilder = { ...kit, add: (finish, geometry, surface) => kit.add(finish, geometry,
    surface ?? (finish === 'paint' ? 'timber' : finish === 'edge' ? 'masonry' : 'sheet')) }
  windowWall(details, body.finish, at, width, body.floors[body.floors.length - 1], openings,
    { depth: .3, yaw, seed: 2, surface: body.surface })
}

function roomWindows(floors: number[], xs: number[], width = 1.35): WallOpening[] {
  return floors.slice(0, -1).flatMap((floor, level) => xs.map(x => ({ x,
    y: floor + (floors[level + 1] - floor) * .55, width,
    height: Math.min(1.85, (floors[level + 1] - floor) * .55) })))
}

function coping(kit: CityBuilder, width: number, depth: number, y: number) {
  for (const z of [-depth / 2 + .13, depth / 2 - .13]) {
    kit.box('faded', [width, .62, .26], [0, y + .31, z], undefined, 'plaster')
    kit.box('edge', [width + .12, .12, .38], [0, y + .68, z], undefined, 'masonry')
  }
  for (const x of [-width / 2 + .13, width / 2 - .13]) {
    kit.box('faded', [.26, .62, depth - .52], [x, y + .31, 0], undefined, 'plaster')
    kit.box('edge', [.38, .12, depth - .52], [x, y + .68, 0], undefined, 'masonry')
  }
}

function pitchedCap(kit: CityBuilder, width: number, depth: number, y: number, rise: number, gable: boolean) {
  const profile = (x: number) => .18 + rise * (gable ? 1 - Math.abs(x) / (width / 2) : .5 + x / width)
  // A closed attic prism joins the enclosing walls to the separate thick sheet roof.
  const outline = new THREE.Shape([
    new THREE.Vector2(-width / 2, 0), new THREE.Vector2(width / 2, 0),
    new THREE.Vector2(width / 2, profile(width / 2)),
    ...(gable ? [new THREE.Vector2(0, profile(0))] : []),
    new THREE.Vector2(-width / 2, profile(-width / 2)),
  ])
  kit.add('faded', new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: false })
    .translate(0, y, -depth / 2), 'plaster')
  const roof = new THREE.PlaneGeometry(width + .12, depth + .12, gable ? 2 : 1, 1).rotateX(-Math.PI / 2)
  const positions = roof.getAttribute('position')
  for (let i = 0; i < positions.count; i++) positions.setY(i, y + profile(positions.getX(i)) + .12)
  roofShell(kit, roof, .12, 'steel', 'sheet')
}

function drain(kit: CityBuilder, x: number, z: number, roof: number) {
  kit.beam('steel', [x, .25, z + .23], [x, roof - .15, z + .23], .1, .1, 'sheet')
  kit.beam('rust', [x, roof - .15, z + .23], [x, roof - .15, z - .24], .13, .13, 'sheet')
  kit.beam('steel', [x, .25, z + .23], [x, .12, z + .49], .1, .1, 'sheet')
  for (let y = 1; y < roof; y += 2.7) kit.box('edge', [.2, .07, .3], [x, y, z + .13], undefined, 'sheet')
}

// Every tread has a riser and bears on the tread below; both ends meet landings.
function flight(kit: CityBuilder, x: number, startZ: number, endZ: number, bottom: number, top: number, width: number) {
  const count = Math.ceil((top - bottom) / .22), run = (endZ - startZ) / count
  for (let step = 0; step < count; step++) {
    const height = (top - bottom) * (step + 1) / count
    kit.box('concrete', [width, height, Math.abs(run)],
      [x, bottom + height / 2, startZ + run * (step + .5)], undefined, 'masonry')
  }
  for (const side of [-1, 1]) {
    const railX = x + side * (width / 2 - .06)
    kit.beam('steel', [railX, bottom + .95, startZ], [railX, top + .95, endZ], .045, .045, 'sheet')
    for (const t of [0, .5, 1]) {
      const y = bottom + (top - bottom) * t, z = startZ + (endZ - startZ) * t
      kit.beam('steel', [railX, y + .04, z], [railX, y + .95, z], .045, .045, 'sheet')
    }
  }
}

function stairCore(kit: CityBuilder, shaft: Shaft, floors: number[], headHeight: number, tankHeight: number,
  treatment: number, terraceSide: number) {
  const roof = floors[floors.length - 1], halfWidth = shaft.width / 2
  const near = shaft.z + shaft.depth / 2 - .8, far = shaft.z - shaft.depth / 2 + .8
  floors.slice(0, -1).forEach((bottom, index) => {
    const top = floors[index + 1], mid = (top + bottom) / 2
    flight(kit, shaft.x - halfWidth / 2, near, far, bottom, mid, halfWidth - .08)
    flight(kit, shaft.x + halfWidth / 2, far, near, mid, top, halfWidth - .08)
    kit.box('concrete', [shaft.width, .18, .8], [shaft.x, mid - .09, far - .4], undefined, 'masonry')
    kit.box('concrete', [shaft.width, .18, .8], [shaft.x, top - .09, near + .4], undefined, 'masonry')
  })
  placeSuwon(kit, [shaft.x, roof, shaft.z], 0, 1, local => {
    const width = shaft.width + .6 + (treatment === 2 ? 1.7 : 0), depth = shaft.depth + .6
    const offset = treatment === 2 ? terraceSide * .85 : 0
    const head: Body = { width, depth, floors: [0, headHeight], finish: 'faded', surface: 'plaster' }
    wall(local, head, [offset, 0, depth / 2], width, 0, [{ x: .5 - offset, y: 1.14, width: 1.12, height: 2.12 }])
    wall(local, head, [offset, 0, -depth / 2], width, Math.PI, [])
    for (const side of [-1, 1]) wall(local, head, [offset + side * width / 2, 0, 0], depth, side * Math.PI / 2, [])
    local.box('paint', [1.02, 2.02, .08], [.5, 1.14, depth / 2 - .24], undefined, 'sheet')
    local.box('steel', [.08, .08, .1], [.87, 1.15, depth / 2 - .15], undefined, 'sheet')
    placeSuwon(local, [offset, 0, 0], 0, 1, cap => {
      if (treatment === 0) slab(cap, width + .12, depth + .12, headHeight)
      else pitchedCap(cap, width, depth, headHeight, .7, treatment === 2)
    })
    const tankX = treatment === 0 ? -.2 : offset + terraceSide * (width / 2 + .95)
    const tankBase = treatment === 0 ? headHeight : 0
    local.box('edge', [1.8, .16, 1.8], [tankX, tankBase + .08, -.65], undefined, 'masonry')
    local.add('faded', new THREE.CylinderGeometry(.74, .78, tankHeight, 16, 1)
      .translate(tankX, tankBase + .16 + tankHeight / 2, -.65), 'sheet')
    for (const y of [.14, tankHeight - .14]) local.add('steel', new THREE.CylinderGeometry(.79, .79, .07, 16, 1)
      .translate(tankX, tankBase + .16 + y, -.65), 'sheet')
    local.add('edge', new THREE.CylinderGeometry(.25, .25, .09, 12)
      .translate(tankX, tankBase + .205 + tankHeight, -.65), 'sheet')
    local.beam('rust', [tankX + .78, tankBase + .3, -.65], [tankX + .78, .2, -.65], .08, .08, 'sheet')
  })
}

function enclosedBody(kit: CityBuilder, body: Body, front: WallOpening[], side: WallOpening[], shaft?: Shaft,
  west = roomWindows(body.floors, [-body.depth * .23, body.depth * .23]), roofTreatment = 0) {
  const { width, depth, floors } = body
  wall(kit, body, [0, 0, depth / 2], width, 0, front)
  wall(kit, body, [0, 0, -depth / 2], width, Math.PI, roomWindows(floors, [-width * .24]))
  wall(kit, body, [-width / 2, 0, 0], depth, -Math.PI / 2, west)
  wall(kit, body, [width / 2, 0, 0], depth, Math.PI / 2, side)
  slab(kit, width, depth, .18)
  floors.slice(1).forEach(y => slab(kit, width, depth, y, shaft))
  const top = floors[floors.length - 1]
  if (roofTreatment === 0) coping(kit, width, depth, top)
  else pitchedCap(kit, width, depth, top, roofTreatment === 1 ? .85 : 1.25, roofTreatment === 2)
}

function shopfront(kit: CityBuilder, x: number, z: number, floor: number, width: number, shutter: boolean) {
  kit.box('paint', [width + .28, .24, .38], [x, floor - .25, z + .08], undefined, 'timber')
  for (const side of [-1, 1]) kit.box('paint', [.12, floor - .65, .22],
    [x + side * (width / 2 - .06), (floor - .65) / 2 + .2, z - .06], undefined, 'timber')
  if (shutter) {
    kit.box('steel', [width - .2, floor - .92, .06], [x, floor / 2 - .1, z - .16], undefined, 'sheet')
    for (let y = .65; y < floor - .6; y += .34) kit.box('edge', [width - .2, .035, .035], [x, y, z - .115], undefined, 'sheet')
  } else {
    kit.box('paint', [.07, floor - .85, .16], [x, floor / 2 - .1, z - .08], undefined, 'timber')
    kit.box('paint', [width - .15, .09, .16], [x, 1.05, z - .08], undefined, 'timber')
  }
  const canopy = new THREE.PlaneGeometry(width + .5, .9).rotateX(-Math.PI / 2)
    .rotateX(.12).translate(x, floor - .06, z + .34)
  roofShell(kit, canopy, .08, 'steel', 'sheet')
}

// Only short bonded patches at corners and lintels; broad walls retain their mass.
function brickPatch(kit: CityBuilder, at: Point, yaw: number, columns: number, rows: number) {
  placeSuwon(kit, at, yaw, 1, local => {
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns - (row % 3 === 2 ? 1 : 0); col++) {
        local.box((row + col) % 5 === 0 ? 'faded' : 'rust', [.48, .17, .035],
          [col * .51 + (row % 2) * .24, row * .2, .012], undefined, 'masonry')
      }
    }
  })
}

/** Joined street frontage and rear dwelling around an open sidecourt. Front is +Z; ground is Y=0. */
export function buildShopCourt(kit: CityBuilder, variant = 0) {
  const v = variantIndex(variant), leftWidth = 7.5 + v * .25, rightWidth = 7.8 - v * .2
  const leftX = -10.8 + leftWidth / 2, rightX = 10.8 - rightWidth / 2
  const leftInner = -10.8 + leftWidth, rightInner = 10.8 - rightWidth
  const ground = 3.6 + v * .2, leftTop = 9.1 + v * .45, rightTop = 10.3 + v * .35
  const rearDepth = 4.1 + v * .45, rearFront = -6.7 + rearDepth
  const left: Body = { width: leftWidth, depth: 12.8, floors: [0, ground, 6.4 + v * .3, leftTop], finish: 'faded', surface: 'plaster' }
  placeSuwon(kit, [leftX, 0, -.3], 0, 1, local => {
    const front = roomWindows(left.floors, [-1.65, 1.65], 1.42)
    front.splice(0, 2, ...[-1.65, 1.65].map(x => ({ x, y: ground / 2, width: 2.55, height: ground - .6 })))
    const side = roomWindows(left.floors, [-3.6], 1.25)
    side.push({ x: .8, y: ground + 1.13, width: 1.22, height: 2.16 })
    enclosedBody(local, left, front, side, undefined, undefined, v)
    shopfront(local, -1.65, 6.4, ground, 2.55, true)
    shopfront(local, 1.65, 6.4, ground, 2.55, false)
    drain(local, -leftWidth / 2 + .35, 6.4, leftTop)
    brickPatch(local, [-leftWidth / 2 + .3, 4.5, 6.405], 0, 2, 5)
  })
  const right: Body = { width: rightWidth, depth: 11.4 - v * .35,
    floors: [0, ground + .1, 7 + v * .3, rightTop], finish: 'rust', surface: 'masonry' }
  const rightZ = -6.7 + right.depth / 2
  placeSuwon(kit, [rightX, 0, rightZ], 0, 1, local => {
    const shaft: Shaft = { x: rightWidth / 2 - 1.85, z: -right.depth / 2 + 3.15, width: 2.5, depth: 5.5 }
    const front = roomWindows(right.floors, [-1.7, 1.6], 1.45)
    front.splice(0, 2, { x: -.7, y: ground / 2, width: 3.4, height: ground - .65 })
    enclosedBody(local, right, front, roomWindows(right.floors, [-2.1, 3.2], 1.1), shaft)
    stairCore(local, shaft, right.floors, 2.45, 1.12 + v * .08, v, -1)
    shopfront(local, -.7, right.depth / 2, ground, 3.4, true)
    drain(local, rightWidth / 2 - .34, right.depth / 2, rightTop)
    brickPatch(local, [-rightWidth / 2 + .22, 4.65, right.depth / 2 + .005], 0, 2, 4)
    brickPatch(local, [rightWidth / 2 + .005, 7.4, 1.3], Math.PI / 2, 3, 3)
  })
  const rear: Body = { width: rightInner - leftInner, depth: rearDepth,
    floors: [0, ground, 7.65 + v * .3], finish: 'concrete', surface: 'plaster' }
  placeSuwon(kit, [(leftInner + rightInner) / 2, 0, -6.7 + rearDepth / 2], 0, 1, local => {
    enclosedBody(local, rear, roomWindows(rear.floors, [-1.45, 1.45], 1.5), [], undefined, [])
    const top = rear.floors[2]
    local.box('paint', [3.4, .14, .42], [0, ground + 2, rearDepth / 2 + .1], undefined, 'timber')
    roofShell(local, new THREE.PlaneGeometry(rear.width - .55, rearDepth - .55)
      .rotateX(-Math.PI / 2).rotateX(.08).translate(0, top + .43, 0), .1, 'steel', 'sheet')
    const seamEnd = rearDepth / 2 - .3
    for (const x of [-2, -1, 0, 1, 2]) local.beam('edge', [x, top + .45 + Math.tan(.08) * seamEnd, -seamEnd],
      [x, top + .45 - Math.tan(.08) * seamEnd, seamEnd], .035, .055, 'sheet')
  })
  // Sidecourt entry climbs from submerged ground to the left dwelling's side door.
  const stairX = leftInner + .86
  flight(kit, stairX, 5.7, -.4, 0, ground, 1.55)
  kit.box('concrete', [1.72, .2, 1.4], [stairX, ground - .1, -1.1], undefined, 'masonry')
  kit.box('faded', [.2, ground, 1.4], [leftInner + 1.62, ground / 2, -1.1], undefined, 'plaster')
  kit.box('edge', [rightInner - leftInner, .18, 6.7 - rearFront],
    [(leftInner + rightInner) / 2, .09, (6.7 + rearFront) / 2], undefined, 'masonry')
}

/** Three enclosed storeys with one recessed balcony bay and an internal roof stair. */
export function buildBrickWalkup(kit: CityBuilder, variant = 0) {
  const v = variantIndex(variant), width = 10.6, depth = 10.95 - v * .25
  const ground = 3.8 + v * .15, top = 12.2 + v * .55, floors = [0, ground, 7.95 + v * .35, top]
  const body: Body = { width, depth, floors, finish: 'rust', surface: 'masonry' }
  const shaft: Shaft = { x: -3.5 + v * .15, z: -depth / 2 + 3.15, width: 2.5, depth: 5.5 }
  const balconyX = .75 - v * .6, balconyWidth = 2.9 + v * .12, recess = 1.4 + v * .12
  const front = depth / 2, leftEdge = balconyX - balconyWidth / 2, rightEdge = balconyX + balconyWidth / 2
  wall(kit, body, [0, 0, -front], width, Math.PI, roomWindows(floors, [-2.2, 2.1], 1.35))
  for (const side of [-1, 1]) wall(kit, body, [side * width / 2, 0, 0], depth, side * Math.PI / 2,
    roomWindows(floors, [-2.75, 2.65], 1.35))
  for (const [a, b] of [[-width / 2, leftEdge], [rightEdge, width / 2]]) {
    wall(kit, body, [(a + b) / 2, 0, front], b - a, 0, roomWindows(floors, [0], 1.45))
  }
  const groundBody = { ...body, floors: [0, ground] }
  wall(kit, groundBody, [balconyX, 0, front], balconyWidth, 0,
    [{ x: 0, y: 1.65, width: 1.35, height: 2.85 }])
  kit.box('paint', [1.25, 2.75, .08], [balconyX, 1.65, front - .24], undefined, 'timber')
  const balconyBody = { ...body, finish: 'faded' as const, surface: 'plaster' as const, floors: [0, top - ground] }
  wall(kit, balconyBody, [balconyX, ground, front - recess], balconyWidth, 0,
    floors.slice(1, -1).map(y => ({ x: -.2, y: y - ground + 1.35, width: 1.4, height: 2.4 })))
  for (const x of [leftEdge + .15, rightEdge - .15]) kit.box('rust', [.3, top - ground, recess],
    [x, (top + ground) / 2, front - recess / 2], undefined, 'masonry')
  slab(kit, width, depth, .18)
  floors.slice(1).forEach(y => slab(kit, width, depth, y, shaft))
  for (const y of floors.slice(1, -1)) {
    kit.box('faded', [balconyWidth, .52, .22], [balconyX, y + .26, front - .13], undefined, 'plaster')
    kit.box('steel', [balconyWidth, .055, .055], [balconyX, y + 1.02, front - .13], undefined, 'sheet')
    for (let x = leftEdge + .17; x < rightEdge; x += .48) kit.box('steel', [.045, .52, .045],
      [x, y + .76, front - .13], undefined, 'sheet')
    kit.box('edge', [balconyWidth, .13, recess], [balconyX, y - .065, front - recess / 2], undefined, 'masonry')
  }
  kit.box('rust', [balconyWidth, .28, .3], [balconyX, top - .14, front - .15], undefined, 'masonry')
  coping(kit, width, depth, top)
  stairCore(kit, shaft, floors, 2.6 + v * .12, 1.6 + v * .08, v, 1)
  drain(kit, width / 2 - .3, front, top)
  placeSuwon(kit, [0, 0, 0], Math.PI, 1, local => drain(local, width / 2 - .3, front, top))
  for (const [x, y, columns, rows] of [[-5.02, 4.7, 3, 6], [3.25, 9.9, 3, 5], [-4.6, 10.7, 2, 4]]) {
    brickPatch(kit, [x, y, front + .005], 0, columns, rows)
  }
  brickPatch(kit, [width / 2 + .005, 5, -.5], Math.PI / 2, 3, 5)
  for (const y of floors.slice(1, -1)) kit.box('edge', [.14, .18, depth],
    [width / 2 + .02, y, 0], undefined, 'masonry')
  flight(kit, balconyX, front + .4, front + .02, 0, .22, 1.5)
}
