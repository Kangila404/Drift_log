import * as THREE from 'three'
import { roofShell, windowWall, type WallOpening } from '../city/CityDetails'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import type { CitySurface } from '../city/CitySurfaces'

type Point = [number, number, number]

// Local envelopes include eaves; front is +Z, base is zero, shared water is 4.25.
// References: VisitJeju Yanggeumseok house, Hado Suni home, Hamdeok cooperative.
function room(kit: CityBuilder, x: number, z: number, width: number, depth: number,
  height: number, front: WallOpening[], side: WallOpening[] = [],
  finish: CityFinish = 'concrete', surface: CitySurface = 'plaster') {
  const thickness = .3
  windowWall(kit, finish, [x, 0, z + depth / 2], width, height, front, { depth: thickness, surface })
  windowWall(kit, finish, [x, 0, z - depth / 2], width, height,
    [{ x: width * .19, y: height * .67, width: Math.min(1.4, width * .21), height: 1.05 }],
    { depth: thickness, yaw: Math.PI, surface, seed: 2 })
  windowWall(kit, finish, [x + width / 2, 0, z], depth - thickness * 2, height, side,
    { depth: thickness, yaw: Math.PI / 2, surface, seed: 3 })
  windowWall(kit, finish, [x - width / 2, 0, z], depth - thickness * 2, height,
    [{ x: 0, y: height * .68, width: 1.1, height: .95 }],
    { depth: thickness, yaw: -Math.PI / 2, surface, seed: 4 })
  kit.box('dark', [width - .6, .16, depth - .6], [x, .08, z], undefined, surface)
  kit.box('edge', [width, .18, depth], [x, height - .09, z], undefined, surface)
}

function opening(x: number, y: number, width: number, height: number): WallOpening {
  return { x, y, width, height }
}

function parapet(kit: CityBuilder, x: number, z: number, width: number, depth: number,
  floor: number, height: number) {
  kit.box('edge', [width, .22, depth], [x, floor, z], undefined, 'plaster')
  kit.box('concrete', [width, height, .2], [x, floor + height / 2, z + depth / 2 - .1], undefined, 'plaster')
  kit.box('concrete', [width, height, .2], [x, floor + height / 2, z - depth / 2 + .1], undefined, 'plaster')
  for (const sign of [-1, 1]) {
    kit.box('concrete', [.2, height, depth - .4], [x + sign * (width / 2 - .1), floor + height / 2, z], undefined, 'plaster')
  }
}

// A linear roof field gives the upper wall wedges the same exact pitch as the roof.
function leanRoof(kit: CityBuilder, x: number, z: number, width: number, depth: number,
  left: number, right: number, finish: CityFinish = 'steel') {
  const points = [
    x - width / 2, left, z - depth / 2,
    x - width / 2, left, z + depth / 2,
    x + width / 2, right, z + depth / 2,
    x + width / 2, right, z - depth / 2,
  ]
  const top = new THREE.BufferGeometry()
  top.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  top.setIndex([0, 1, 2, 0, 2, 3])
  roofShell(kit, top, .2, finish, 'sheet')
}

function slopeInfill(kit: CityBuilder, x: number, z: number, width: number, depth: number,
  bottom: number, left: number, right: number) {
  const outline = new THREE.Shape([
    new THREE.Vector2(-width / 2, bottom), new THREE.Vector2(width / 2, bottom),
    new THREE.Vector2(width / 2, right), new THREE.Vector2(-width / 2, left),
  ])
  const infill = new THREE.ExtrudeGeometry(outline, { depth, bevelEnabled: false, steps: 1 })
  infill.translate(x, 0, z - depth / 2)
  kit.add('concrete', infill, 'plaster')
}

function roundedHip(kit: CityBuilder) {
  const rings = [
    [6, 3.5, 5.77, .8], [5.96, 3.46, 6.0, .85],
    [5.64, 2.95, 6.5, 1.0], [4.97, 1.92, 7.03, .95],
    [3.7, .66, 7.34, .5], [3.03, .2, 7.37, .18],
  ]
  const vertices: number[] = [], indices: number[] = []
  const ringSize = 36
  for (const [ring, [hx, hz, y, radius]] of rings.entries()) {
    const perimeter: [number, number][] = []
    for (let corner = 0; corner < 4; corner++) {
      const angle = corner * Math.PI / 2
      const cx = (corner === 0 || corner === 3 ? 1 : -1) * (hx - radius)
      const cz = (corner < 2 ? 1 : -1) * (hz - radius)
      for (let step = 0; step < 3; step++) {
        const t = angle + step / 2 * Math.PI / 2
        perimeter.push([cx + radius * Math.cos(t), cz + radius * Math.sin(t)])
      }
      const end = perimeter[perimeter.length - 1]
      const next = (corner + 1) % 4
      const nextAngle = next * Math.PI / 2
      const nx = (next === 0 || next === 3 ? 1 : -1) * (hx - radius) + radius * Math.cos(nextAngle)
      const nz = (next < 2 ? 1 : -1) * (hz - radius) + radius * Math.sin(nextAngle)
      const divisions = corner % 2 === 0 ? 8 : 4
      for (let step = 1; step <= divisions; step++) {
        const t = step / (divisions + 1)
        perimeter.push([end[0] + (nx - end[0]) * t, end[1] + (nz - end[1]) * t])
      }
    }
    for (const [i, [x, z]] of perimeter.entries()) {
      const roughness = [.065, .05, .034, .019, .006, 0][ring]
      vertices.push(x, y + roughness * Math.sin(i * 2.39 + ring * .41), z)
    }
  }
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let i = 0; i < ringSize; i++) {
      const a = ring * ringSize + i, b = ring * ringSize + (i + 1) % ringSize
      const c = b + ringSize, d = a + ringSize
      indices.push(a, c, b, a, d, c)
    }
  }
  const center = vertices.length / 3
  vertices.push(0, 7.37, 0)
  const last = (rings.length - 1) * ringSize
  for (let i = 0; i < ringSize; i++) indices.push(last + i, center, last + (i + 1) % ringSize)
  const roof = new THREE.BufferGeometry()
  roof.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  roof.setIndex(indices)
  roof.computeVertexNormals()
  kit.add('faded', roof, 'timber')
  // The uneven cut edge and its shared underside remain a closed thatch mass.
  const bottom: number[] = [], edge: number[] = []
  const eaveBottom = (i: number) => 5.45 + .055 * Math.sin(i * 2.71)
  for (let i = 0; i < ringSize; i++) {
    const a = vertices.slice(i * 3, i * 3 + 3) as Point
    const b = vertices.slice(((i + 1) % ringSize) * 3, ((i + 1) % ringSize) * 3 + 3) as Point
    const lowA: Point = [a[0], eaveBottom(i), a[2]]
    const lowB: Point = [b[0], eaveBottom((i + 1) % ringSize), b[2]]
    bottom.push(...lowA, ...lowB, 0, 5.49, 0)
    edge.push(...a, ...b, ...lowA, ...b, ...lowB, ...lowA)
  }
  for (const [finish, points] of [['dark', bottom], ['faded', edge]] as const) {
    const cap = new THREE.BufferGeometry()
    cap.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    cap.computeVertexNormals()
    kit.add(finish, cap, 'timber')
  }

  // Narrow closed bundles follow the thatch fall, including its thick cut ends.
  for (let i = 0; i < ringSize; i++) {
    if (i % 3 === 2) continue
    const outer = new THREE.Vector3().fromArray(vertices, i * 3)
    const inner = new THREE.Vector3().fromArray(vertices, (ringSize * 2 + i) * 3)
    const middle = new THREE.Vector3().fromArray(vertices, (ringSize + i) * 3)
    const tip = outer.clone().multiply(new THREE.Vector3(.994, 1, .994))
    tip.y = eaveBottom(i) + .015
    outer.multiply(new THREE.Vector3(.994, 1, .994))
    outer.y += .016
    middle.y += .019
    inner.lerp(middle, .18 + .12 * Math.sin(i * 1.73))
    inner.y += .016
    const width = .032 + .013 * (1 + Math.sin(i * 2.13))
    for (const [from, to] of [[tip, outer], [outer, middle], [middle, inner]]) {
      kit.beam(i % 4 === 0 ? 'concrete' : 'faded', from.toArray() as Point,
        to.toArray() as Point, width, .035, 'timber')
    }
  }

  // Slice the actual roof triangles so both directions of wind ties sit on it.
  const windTie = (axis: 0 | 2, value: number, skew: number) => {
    const points = new Map<string, THREE.Vector3>()
    const along = axis === 0 ? 2 : 0
    for (let i = 0; i < indices.length; i += 3) {
      const triangle = indices.slice(i, i + 3).map(index => new THREE.Vector3().fromArray(vertices, index * 3))
      for (let edge = 0; edge < 3; edge++) {
        const a = triangle[edge], b = triangle[(edge + 1) % 3]
        const start = a.getComponent(axis) + skew * a.getComponent(along)
        const delta = b.getComponent(axis) + skew * b.getComponent(along) - start
        if (Math.abs(delta) < 1e-8) continue
        const t = (value - start) / delta
        if (t < 0 || t > 1) continue
        const point = a.clone().lerp(b, t)
        points.set(point.toArray().map(v => Math.round(v * 1e5)).join(':'), point)
      }
    }
    const line = [...points.values()].sort((a, b) => a.getComponent(along) - b.getComponent(along))
    for (const point of line) {
      point.x = THREE.MathUtils.clamp(point.x, -5.97, 5.97)
      point.z = THREE.MathUtils.clamp(point.z, -3.47, 3.47)
      point.y += .014
    }
    // Remove redundant coplanar intersections, retaining every change in slope.
    for (let i = line.length - 2; i > 0; i--) {
      const before = line[i].clone().sub(line[i - 1]).normalize()
      const after = line[i + 1].clone().sub(line[i]).normalize()
      if (before.dot(after) > .9995) line.splice(i, 1)
    }
    for (let i = 1; i < line.length; i++) {
      if (line[i].distanceToSquared(line[i - 1]) > 1e-8) {
        kit.beam('concrete', line[i - 1].toArray() as Point, line[i].toArray() as Point, .024, .024, 'timber')
      }
    }
  }
  for (const [i, x] of [-4.78, -3.49, -2.37, -1.08, .13, 1.32, 2.39, 3.68, 4.86].entries()) {
    windTie(0, x, .018 * Math.sin(i * 1.7))
  }
  for (const [i, z] of [-2.59, -1.22, .09, 1.38, 2.62].entries()) {
    windTie(2, z, .013 * Math.cos(i * 2.1))
  }
}

export function buildChogaHome(kit: CityBuilder) {
  windowWall(kit, 'edge', [0, 0, -2.85], 10.6, 5.7,
    [opening(1.5, 3.7, 1.1, 1.0)], { depth: .42, yaw: Math.PI, surface: 'masonry' })
  for (const sign of [-1, 1]) {
    windowWall(kit, 'edge', [sign * 5.3, 0, 0], 4.86, 5.7,
      [opening(-.7, 3.65, .8, .95)], { depth: .44, yaw: sign * Math.PI / 2, surface: 'masonry' })
    kit.box('edge', [1.14, 5.7, .76], [sign * 4.73, 2.85, 2.47], undefined, 'masonry')
  }
  // Solid timber shutters replace contemporary glazing; reveals remain real.
  const timberFront: CityBuilder = {
    ...kit,
    add: (finish, geometry, surface) => {
      const shutter = finish === 'glass' || finish === 'glazing'
      kit.add(shutter ? 'edge' : finish === 'steel' ? 'paint' : finish, geometry, shutter ? 'timber' : surface)
    },
  }
  windowWall(timberFront, 'paint', [0, 0, 1.95], 8.7, 5.45,
    [opening(-2.95, 3.65, 1.2, 2.4), opening(-.5, 2.95, 1.7, 4.6),
      opening(2.5, 3.5, 1.55, 2.5)], { depth: .22, surface: 'timber' })
  kit.box('dark', [9.72, .16, 4.52], [0, .08, -.1], undefined, 'masonry')
  kit.box('faded', [8.7, .23, 1.18], [0, .62, 2.38], undefined, 'timber')
  // Broad recessed panels and their framing read before any plank subdivision.
  for (const [x, width] of [[-4.02, .58], [-1.79, .78], [.97, 1.05], [3.86, .62]]) {
    kit.box('edge', [width, 4.28, .09], [x, 2.94, 1.98], undefined, 'timber')
    kit.box('paint', [width, .12, .11], [x, 3.63, 2.01], undefined, 'timber')
  }
  for (const x of [-4.21, -2.08, .51, 3.56]) {
    kit.box('paint', [.19, 4.88, .21], [x, 3.06, 2.51], undefined, 'timber')
  }
  kit.box('faded', [8.72, .23, .26], [0, 5.35, 2.51], undefined, 'timber')
  kit.box('paint', [8.65, .14, .15], [0, 5.06, 2.04], undefined, 'timber')
  for (const x of [-2.95, -.5, 2.5]) {
    kit.box('paint', [.065, 2.22, .075], [x, 3.61, 1.82], undefined, 'timber')
    kit.box('paint', [x === -.5 ? 1.58 : 1.05, .085, .085], [x, 3.08, 1.82], undefined, 'timber')
  }
  // One folded shutter leaves an off-centre dark reveal in the entry bay.
  kit.box('edge', [.62, 4.25, .105], [-.99, 2.99, 2.06], [0, -.38, 0], 'timber')
  for (const x of [-3.9, -2.08, .51, 3.56]) {
    kit.box('paint', [.13, .18, 1.14], [x, 5.47, 2.44], undefined, 'timber')
  }
  roundedHip(kit)
}

export function buildRoofHouse(kit: CityBuilder) {
  room(kit, 0, -.08, 8.35, 7.35, 7.72,
    [opening(-2.7, 4.28, 1.58, 1.95), opening(-.45, 3.15, 1.3, 4.08),
      opening(2.05, 4.35, 2.0, 2.1)],
    [opening(-1.65, 4.4, 1.45, 1.25), opening(1.25, 4.12, 1.03, 1.7)])
  parapet(kit, 0, 0, 9, 8, 7.82, .58)
  kit.box('trim', [8.94, .11, .12], [0, 7.69, 3.93], undefined, 'plaster')
  // Hado's vertical piers belong to the wall and cornice, not an added upper roof.
  for (const x of [-3.91, -1.42, 3.9]) {
    kit.box('edge', [.33, 8.65, .38], [x, 4.325, 3.53], undefined, 'masonry')
  }
  kit.box('concrete', [2.05, .18, .55], [-.43, 5.47, 3.48], undefined, 'plaster')
  kit.box('edge', [1.65, .24, .67], [-.45, .4, 3.56], undefined, 'masonry')
}

export function buildCooperativeHall(kit: CityBuilder) {
  room(kit, 0, -1.05, 14.1, 6.7, 7.7,
    [opening(-4.75, 4.35, 2.45, 2.55), opening(-1.2, 4.35, 2.45, 2.55),
      opening(3.55, 3.42, 2.55, 5.28)],
    [opening(-1.5, 5.12, 2, 1.4), opening(1.52, 5.12, 2, 1.4)])
  // The hall's door is behind a deep, supported entry recess facing its court.
  kit.box('concrete', [.4, 6.1, 2.27], [5.25, 3.05, 3.37], undefined, 'plaster')
  kit.box('edge', [.3, 5.9, .33], [1.91, 2.95, 4.48], undefined, 'masonry')
  kit.box('edge', [3.74, .27, 2.7], [3.57, 6.04, 3.44], undefined, 'plaster')
  kit.box('edge', [3.74, .24, 2.55], [3.57, .36, 3.45], undefined, 'masonry')
  for (const x of [-6.4, -2.75]) {
    kit.box('steel', [.16, 5.62, .18], [x, 2.81, 4.38], undefined, 'generic')
  }
  kit.box('steel', [8.3, .18, 2.25], [-2.85, 5.58, 3.38], undefined, 'sheet')
  const roofHeight = (x: number) => 10.72 - (x + 7.5) * 2.6 / 15
  slopeInfill(kit, 0, -1.05, 14.1, 6.7, 7.69, roofHeight(-7.05) - .2, roofHeight(7.05) - .2)
  leanRoof(kit, 0, -.9, 15, 8.2, 10.72, 8.12)
}

export function buildCoastalWorkshop(kit: CityBuilder) {
  room(kit, -1.47, -.17, 8.16, 6.9, 5.95,
    [opening(-1.25, 2.94, 4.08, 4.72), opening(2.15, 4.67, 1.4, .93)],
    [], 'faded', 'plaster')
  room(kit, 4.02, -.1, 2.64, 6.75, 5.15,
    [opening(0, 2.58, 1.33, 3.92)], [], 'edge', 'masonry')
  const top = (x: number) => 7.68 - (x + 5.93) * 1.25 / 8.95
  slopeInfill(kit, -1.47, -.17, 8.16, 6.9, 5.94, top(-5.55) - .2, top(2.61) - .2)
  leanRoof(kit, -1.455, -.02, 8.95, 7.96, 7.68, 6.43)
  const serviceTop = (x: number) => 6.1 - (x - 2.64) * .83 / 3.36
  slopeInfill(kit, 4.02, -.1, 2.64, 6.75, 5.14, serviceTop(2.7) - .2, serviceTop(5.34) - .2)
  leanRoof(kit, 4.32, -.02, 3.36, 7.55, 6.1, 5.27, 'paint')
  kit.box('steel', [4.45, .2, .3], [-2.72, 5.43, 3.39], undefined, 'generic')
  for (const x of [-4.96, -.47]) {
    kit.box('steel', [.16, 4.84, .2], [x, 2.94, 3.33], undefined, 'generic')
  }
}

export function buildVillageLodging(kit: CityBuilder) {
  room(kit, -.87, -.25, 4.66, 7.0, 10.8,
    [opening(-1.04, 3.48, 1.55, 1.98), opening(1.07, 3.48, 1.33, 1.98),
      opening(-.95, 8.2, 1.74, 2.2), opening(1.13, 8.38, 1.13, 1.65)],
    [opening(-1.65, 3.75, 1.3, 1.8), opening(.95, 8.24, 1.95, 2.0)])
  // Stair enclosure extends from ground to roof access with staggered landings.
  room(kit, 2.4, .12, 1.96, 7.44, 12.2,
    [opening(0, 2.8, 1.12, 4.2), opening(0, 7.35, .69, 1.07),
      opening(0, 10.57, .69, 1.07)],
    [opening(-1.18, 4.95, .78, 1.1), opening(1.05, 9.08, .78, 1.1)], 'faded')
  parapet(kit, -.86, -.25, 4.94, 7.48, 10.88, .65)
  parapet(kit, 2.4, .12, 2.04, 7.76, 12.3, .56)
  kit.box('edge', [4.59, .22, 6.43], [-.87, 5.49, -.25], undefined, 'plaster')
  kit.box('edge', [1.16, .2, 1.52], [2.4, 5.26, 2.51], undefined, 'plaster')
  kit.box('edge', [1.16, .2, 1.52], [2.4, 9.0, -2.33], undefined, 'plaster')
  for (let i = 0; i < 12; i++) {
    kit.box('edge', [1.15, .2, .4], [2.4, 5.42 + i * .295, 1.6 - i * .3], undefined, 'plaster')
  }
}
