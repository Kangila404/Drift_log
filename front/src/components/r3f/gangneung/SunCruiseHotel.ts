import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'

type Footprint = { aft: number; bow: number; width: number; nose: number }
type Deck = Footprint & { y: number; thickness: number }
type Point = [number, number, number]

const CROSS_STEPS = 4

function halfWidth(plan: Footprint, x: number): number {
  if (x <= plan.aft || x >= plan.bow) return 0
  const sternRadius = 0.85
  if (x < plan.aft + sternRadius) {
    const t = (x - plan.aft - sternRadius) / sternRadius
    return plan.width * Math.sqrt(Math.max(0, 1 - t * t))
  }
  const t = Math.max(0, (x - (plan.bow - plan.nose)) / plan.nose)
  return plan.width * Math.cos(Math.min(1, t) * Math.PI / 2)
}

function stations(plan: Footprint): number[] {
  // Concentrate samples at the rounded stern and the short, curved bow.
  const xs = [plan.aft]
  for (let i = 1; i <= 6; i++) {
    xs.push(plan.aft + 0.85 * (1 - Math.cos(i / 6 * Math.PI / 2)))
  }
  const start = plan.aft + 0.85
  const end = plan.bow - plan.nose
  const straightSteps = Math.ceil((end - start) / 1.2)
  for (let i = 1; i <= straightSteps; i++) xs.push(start + (end - start) * i / straightSteps)
  for (let i = 1; i <= 12; i++) xs.push(end + plan.nose * i / 12)
  return xs
}

function outline(plan: Footprint): THREE.Vector2[] {
  const points: THREE.Vector2[] = []
  const xs = stations(plan)
  for (const x of xs) points.push(new THREE.Vector2(x, halfWidth(plan, x)))
  for (let i = xs.length - 2; i > 0; i--) {
    points.push(new THREE.Vector2(xs[i], -halfWidth(plan, xs[i])))
  }
  return points
}

function geometry(positions: number[], indices: number[]): THREE.BufferGeometry {
  const result = new THREE.BufferGeometry()
  result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  result.setIndex(indices)
  result.computeVertexNormals()
  return result
}

function wallBand(
  kit: CityBuilder, finish: CityFinish, plan: Footprint, bottom: number, top: number,
): void {
  const points = outline(plan)
  const positions: number[] = []
  const indices: number[] = []
  for (const point of points) positions.push(point.x, bottom, point.y, point.x, top, point.y)
  for (let i = 0; i < points.length; i++) {
    const a = i * 2, b = ((i + 1) % points.length) * 2
    indices.push(a, b, a + 1, b, b + 1, a + 1)
  }
  kit.add(finish, geometry(positions, indices), 'plaster')
}

function slab(kit: CityBuilder, deck: Deck, finish: CityFinish = 'concrete'): void {
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  const xs = stations(deck)
  // Separate flat caps from the smooth perimeter; the grid receives baked contact AO.
  for (let cap = 0; cap < 2; cap++) {
    const y = deck.y + cap * deck.thickness
    const rows: number[][] = []
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i]
      const width = halfWidth(deck, x)
      const tip = i === 0 || i === xs.length - 1
      const row: number[] = []
      for (let j = 0; j <= (tip ? 0 : CROSS_STEPS); j++) {
        row.push(positions.length / 3)
        positions.push(x, y, tip ? 0 : width * (2 * j / CROSS_STEPS - 1))
        normals.push(0, cap ? 1 : -1, 0)
      }
      rows.push(row)
    }
    const triangle = (a: number, b: number, c: number) => {
      if (cap) indices.push(a, b, c)
      else indices.push(a, c, b)
    }
    for (let i = 0; i < rows.length - 1; i++) {
      const a = rows[i], b = rows[i + 1]
      for (let j = 0; j < CROSS_STEPS; j++) {
        if (a.length === 1) triangle(a[0], b[j + 1], b[j])
        else if (b.length === 1) triangle(a[j], a[j + 1], b[0])
        else {
          triangle(a[j], a[j + 1], b[j])
          triangle(b[j], a[j + 1], b[j + 1])
        }
      }
    }
  }
  const caps = geometry(positions, indices)
  caps.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  kit.add(finish, caps, 'plaster')
  wallBand(kit, finish, deck, deck.y, deck.y + deck.thickness)
}

function lowerHull(kit: CityBuilder, deck: Deck): void {
  const points = outline(deck)
  const stern = deck.aft + 0.85
  const shoulder = deck.bow - deck.nose
  const baseX = (x: number) => x < stern ? stern + (x - stern) * 0.65
    : x > shoulder ? shoulder + (x - shoulder) * 0.4 : x
  const positions: number[] = [], indices: number[] = []
  // The stem rakes out from the occupied foundation; only the last 4.2 units overhang.
  for (const p of points) positions.push(baseX(p.x), 0, p.y * 0.85, p.x, deck.y, p.y)
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length
    const p = points[i], q = points[next]
    if (Math.abs(p.y) === deck.width && Math.abs(q.y) === deck.width && p.y === q.y) continue
    const a = i * 2, b = next * 2
    indices.push(a, b, a + 1, b, b + 1, a + 1)
  }
  // Compact the curved shell so omitted wall panels leave no zero-normal vertices.
  const remap = new Map<number, number>(), compact: number[] = []
  const shellIndices = indices.map(index => {
    if (!remap.has(index)) {
      remap.set(index, compact.length / 3)
      compact.push(...positions.slice(index * 3, index * 3 + 3))
    }
    return remap.get(index)!
  })
  const ends = geometry(compact, shellIndices)
  kit.add('concrete', ends, 'plaster')

  for (const side of [-1, 1]) {
    const wall = new THREE.Shape()
    wall.moveTo(stern, 0); wall.lineTo(shoulder, 0)
    wall.lineTo(shoulder, deck.y); wall.lineTo(stern, deck.y); wall.closePath()
    if (side > 0) {
      // The landward hotel entrance interrupts the ship-like lower wall.
      const entry = new THREE.Path()
      entry.moveTo(-18, .12); entry.lineTo(-18, 2.85)
      entry.lineTo(-11, 2.85); entry.lineTo(-11, .12); entry.closePath()
      wall.holes.push(entry)
    }
    for (let i = 0; i < 15; i++) {
      const x = stern + 1.3 + i * (shoulder - stern - 2.6) / 14
      if (side > 0 && x > -18.3 && x < -10.7) continue
      const hole = new THREE.Path()
      hole.absarc(x, 2.35, 0.23, 0, Math.PI * 2, true)
      wall.holes.push(hole)
      const glass = new THREE.CircleGeometry(0.225, 24)
      if (side < 0) glass.rotateY(Math.PI)
      glass.translate(x, 2.35, side * (deck.width * (0.85 + 0.15 * 2.35 / deck.y) - 0.31))
      kit.add('glazing', glass, 'sheet')
    }
    const shell = new THREE.ExtrudeGeometry(wall, { depth: 0.27, bevelEnabled: false, curveSegments: 12 })
    const vertices = shell.getAttribute('position')
    for (let i = 0; i < vertices.count; i++) {
      const y = vertices.getY(i)
      vertices.setZ(i, side * (deck.width * (0.85 + 0.15 * y / deck.y) - 0.27 + vertices.getZ(i)))
    }
    // Reflecting the port shell reverses winding as well as its normal.
    if (side < 0) {
      for (let i = 0; i < vertices.count; i += 3) {
        const b = new THREE.Vector3().fromBufferAttribute(vertices, i + 1)
        const c = new THREE.Vector3().fromBufferAttribute(vertices, i + 2)
        vertices.setXYZ(i + 1, c.x, c.y, c.z)
        vertices.setXYZ(i + 2, b.x, b.y, b.z)
      }
    }
    shell.computeVertexNormals()
    kit.add('concrete', shell, 'plaster')
  }
}

function hotelEntrance(kit: CityBuilder) {
  subdividedBox(kit, 'concrete', [9.2, .3, 3.8], [-14.5, 3.05, 4.85])
  subdividedBox(kit, 'concrete', [9.3, .17, 4.6], [-14.5, .085, 4.4])
  for (const x of [-18.7, -10.3]) {
    subdividedBox(kit, 'concrete', [.5, 2.9, 2.4], [x, 1.45, 5.1])
  }
  subdividedBox(kit, 'edge', [7.4, 2.95, .3], [-14.5, 1.475, 1.9])
  kit.box('glass', [6.75, 2.58, .08], [-14.5, 1.48, 3.26])
  kit.box('glazing', [2.05, 2.5, .035], [-16.6, 1.48, 3.32])
  for (const x of [-17.8, -15.6, -13.4, -11.2]) {
    kit.box('steel', [.08, 2.65, .15], [x, 1.48, 3.36])
  }
  kit.box('steel', [6.75, .1, .15], [-14.5, 2.77, 3.36])
}

function subdividedBox(
  kit: CityBuilder, finish: CityFinish, size: Point, position: Point,
): void {
  const box = new THREE.BoxGeometry(...size,
    Math.max(1, Math.ceil(size[0] / 1.5)),
    Math.max(1, Math.ceil(size[1] / 0.8)),
    Math.max(1, Math.ceil(size[2] / 1.5)))
  box.translate(...position)
  kit.add(finish, box, 'plaster')
}

function occupiedLevel(kit: CityBuilder, floor: Deck, roof: Deck, level: number): void {
  const bottom = floor.y + floor.thickness
  const top = roof.y
  const rooms: Footprint = {
    aft: Math.max(floor.aft, roof.aft) + 0.6,
    bow: Math.min(floor.bow, roof.bow) - 0.85,
    width: Math.min(floor.width, roof.width) - 0.66,
    nose: Math.min(floor.nose, roof.nose),
  }
  const height = top - bottom
  const coreAft = rooms.aft + 0.95
  const center = (coreAft + rooms.bow - rooms.nose) / 2
  const coreLength = rooms.bow - rooms.nose - coreAft
  subdividedBox(kit, 'concrete', [coreLength, height, Math.max(0.8, rooms.width * 2 - 1.3)],
    [center, bottom + height / 2, 0])
  wallBand(kit, 'concrete', rooms, bottom, bottom + 0.24)
  wallBand(kit, 'concrete', rooms, top - 0.14, top)
  // A low, solid balcony front hides the room sills and reads as a broad deck band.
  // Its inner face and cap give the parapet physical thickness around both ends.
  const inner: Footprint = { ...floor, aft: floor.aft + 0.22, bow: floor.bow - 0.3, width: floor.width - 0.22 }
  wallBand(kit, 'concrete', floor, bottom, bottom + 0.64)
  wallBand(kit, 'concrete', inner, bottom, bottom + 0.64)
  const outerPoints = outline(floor), innerPoints = outline(inner)
  const parapet = new THREE.Shape(outerPoints)
  parapet.holes.push(new THREE.Path(innerPoints.reverse()))
  kit.add('concrete', new THREE.ShapeGeometry(parapet).rotateX(-Math.PI / 2)
    .translate(0, bottom + 0.64, 0), 'plaster')

  // These are real balcony cavities, with glazing behind the exposed floor edge.
  for (const side of [-1, 1]) {
    const start = rooms.aft + 0.95
    const end = rooms.bow - 0.55
    const bays = Math.ceil((end - start) / 2.65)
    for (let bay = 0; bay < bays; bay++) {
      const x0 = start + (end - start) * bay / bays
      const x1 = start + (end - start) * (bay + 1) / bays
      const z0 = side * halfWidth(rooms, x0)
      const z1 = side * halfWidth(rooms, x1)
      const middleX = (x0 + x1) / 2
      const middleZ = (z0 + z1) / 2
      const length = Math.hypot(x1 - x0, z1 - z0)
      const rotation: Point = [0, -Math.atan2(z1 - z0, x1 - x0), 0]
      const missing = (bay + level * 7 + (side > 0 ? 3 : 0)) % 23 === 11
      if (!missing) {
        kit.box('glazing', [length - 0.11, height - 0.42, 0.075],
          [middleX, bottom + 0.24 + (height - 0.42) / 2, middleZ], rotation)
      }
      // Dividers terminate at the slab edge and expose their actual wall depth.
      const outward = side * 0.12
      kit.box('concrete', [0.16, height, 0.38],
        [x0, bottom + height / 2, z0 + outward], rotation)
    }
  }
  // Occupied end rooms turn around the stern and nose, without a solid hull infill.
  for (const [start, end] of [[rooms.aft, rooms.aft + 0.95], [rooms.bow - 0.55, rooms.bow]]) {
    for (const side of [-1, 1]) {
      for (let i = 0; i < 6; i++) {
        const x0 = start + (end - start) * i / 6
        const x1 = start + (end - start) * (i + 1) / 6
        const z0 = side * halfWidth(rooms, x0), z1 = side * halfWidth(rooms, x1)
        kit.box('glass', [Math.hypot(x1 - x0, z1 - z0), height - 0.42, 0.065],
          [(x0 + x1) / 2, bottom + height / 2 + 0.03, (z0 + z1) / 2],
          [0, -Math.atan2(z1 - z0, x1 - x0), 0])
      }
    }
  }
}

function cylinder(
  kit: CityBuilder, finish: CityFinish, radiusTop: number, radiusBottom: number,
  height: number, position: Point, segments = 48,
): void {
  const mesh = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments,
    Math.max(1, Math.ceil(height / 0.6)))
  mesh.translate(...position)
  kit.add(finish, mesh, 'plaster')
}

/** Local origin is the supporting terrace: aft -X, pointed bow +X, no sea offset. */
export function buildSunCruiseHotel(kit: CityBuilder): void {
  const decks: Deck[] = [
    { aft: -21.0, bow: 21.0, width: 4.5, nose: 7, y: 3.5, thickness: 0.3 },
    { aft: -20.0, bow: 15.8, width: 4.2, nose: 2.4, y: 5.65, thickness: 0.28 },
    { aft: -19.6, bow: 15.1, width: 4.05, nose: 2.2, y: 7.72, thickness: 0.28 },
    { aft: -18.3, bow: 13.4, width: 3.8, nose: 2.0, y: 9.65, thickness: 0.22 },
  ]
  lowerHull(kit, decks[0])
  hotelEntrance(kit)
  decks.forEach(deck => slab(kit, deck))
  for (let i = 0; i < decks.length - 1; i++) occupiedLevel(kit, decks[i], decks[i + 1], i)

  // The real landmark's revolving lounge is a modest drum on a short support.
  cylinder(kit, 'concrete', 1.65, 1.85, 0.55, [-9, 10.145, 0])
  cylinder(kit, 'concrete', 2.78, 2.58, 0.23, [-9, 10.535, 0])
  cylinder(kit, 'glass', 2.59, 2.59, 0.83, [-9, 11.055, 0])
  cylinder(kit, 'concrete', 2.8, 2.8, 0.2, [-9, 11.57, 0])
  cylinder(kit, 'concrete', 2.14, 2.8, 0.22, [-9, 11.78, 0])
  for (let i = 0; i < 16; i++) {
    const angle = i / 16 * Math.PI * 2
    kit.box('steel', [0.07, 0.84, 0.07], [-9 + 2.61 * Math.cos(angle), 11.05, 2.61 * Math.sin(angle)])
  }

  // Bridge and two restrained masts, without rigging, lettering or flags.
  const bridge: Deck = { aft: 5.4, bow: 12.8, width: 2.55, nose: 1.8, y: 10.95, thickness: 0.24 }
  wallBand(kit, 'concrete', { ...bridge, aft: 5.65, bow: 12.45, width: 2.25 }, 9.87, 10.3)
  wallBand(kit, 'glass', { ...bridge, aft: 5.8, bow: 12.25, width: 2.12 }, 10.3, 10.95)
  slab(kit, bridge)
  cylinder(kit, 'concrete', 0.12, 0.38, 2.4, [8.5, 12.39, 0], 16)
  cylinder(kit, 'steel', 0.055, 0.07, 1.4, [8.5, 14.29, 0], 12)
  kit.box('steel', [1.8, 0.1, 0.16], [8.5, 13.28, 0])
  cylinder(kit, 'steel', 0.05, 0.09, 1.5, [-9, 12.64, 0], 12)
  kit.box('steel', [0.85, 0.07, 0.1], [-9, 12.93, 0])
}
