import * as THREE from 'three'
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'

export type VoyagerFinish = 'hull' | 'keel' | 'rim' | 'deck' | 'cabin' | 'roof' | 'wood' | 'metal' | 'rope' | 'glass' | 'light' | 'canvas' | 'seam' | 'patch'
export type VoyagerBatch = { finish: VoyagerFinish; geometry: THREE.BufferGeometry }
type Point = [number, number, number]
type Builder = ReturnType<typeof builder>
export const VOYAGER_DRAFT = .16
export const VOYAGER_WATERLINE = -.7 / 1.8 + VOYAGER_DRAFT
export const VOYAGER_ANCHOR_POINT: Point = [1.05, 1.08, 2.6]
export const VOYAGER_ANCHOR_RAISED = .9
export const VOYAGER_ANCHOR_LOWERED = .48

function builder() {
  const pieces = new Map<VoyagerFinish, THREE.BufferGeometry[]>()
  const add = (finish: VoyagerFinish, source: THREE.BufferGeometry) => {
    const geometry = source.index ? source.toNonIndexed() : source
    if (geometry !== source) source.dispose()
    geometry.deleteAttribute('uv')
    if (!pieces.has(finish)) pieces.set(finish, [])
    pieces.get(finish)!.push(geometry)
  }
  const box = (finish: VoyagerFinish, size: Point, position: Point, radius = .025, rotation: Point = [0, 0, 0]) => {
    const segments = Math.max(...size) > 1 && Math.min(...size) > .15 ? 2 : 1
    const geometry = new RoundedBoxGeometry(...size, segments, Math.min(radius, ...size.map(n => n * .45)))
    geometry.rotateX(rotation[0]).rotateY(rotation[1]).rotateZ(rotation[2]).translate(...position)
    add(finish, geometry)
  }
  const rod = (finish: VoyagerFinish, from: Point, to: Point, radius: number, endRadius = radius) => {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), delta = b.clone().sub(a)
    const geometry = new THREE.CylinderGeometry(endRadius, radius, delta.length(), 8)
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize()))
    geometry.translate(...a.add(b).multiplyScalar(.5).toArray())
    add(finish, geometry)
  }
  const tube = (finish: VoyagerFinish, points: Point[], radius: number, segments = 32) => {
    const path = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)))
    add(finish, new THREE.TubeGeometry(path, segments, radius, 6, false))
  }
  return { add, box, rod, tube, finish: (): VoyagerBatch[] => [...pieces].map(([finish, geometries]) => {
    const geometry = mergeGeometries(geometries)!
    geometries.forEach(g => g.dispose())
    geometry.computeBoundingBox()
    return { finish, geometry }
  }) }
}

function indexed(positions: number[], indices: number[]) {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function section(t: number) {
  return { z: -2.65 + 4.85 * t, beam: .025 + 1.17 * (1 - Math.exp(-t * 9)) * (1 - .24 * t * t),
    sheer: .39 + .24 * (1 - t) ** 3 + .07 * t ** 4, keel: -.79 + .43 * (1 - t) ** 4 + .12 * t ** 5 }
}

function hull(kit: Builder) {
  const rows = 52, sides = 28, positions: number[] = [], indices: number[] = []
  for (let row = 0; row <= rows; row++) {
    const { z, beam, sheer, keel } = section(row / rows)
    for (let col = 0; col <= sides; col++) {
      const theta = -Math.PI / 2 + Math.PI * col / sides
      positions.push(beam * Math.sin(theta), keel + (sheer - keel) * (1 - Math.cos(theta)), z)
    }
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < sides; col++) {
    const a = row * (sides + 1) + col, b = a + sides + 1
    indices.push(a, a + 1, b, b, a + 1, b + 1)
  }
  // Both ends close below their gunwales, including the narrow stem.
  for (const [row, reverse] of [[0, true], [rows, false]] as const) {
    const { z, sheer, keel } = section(row / rows)
    const center = positions.length / 3
    positions.push(0, (sheer + keel) / 2, z)
    const ring = Array.from({ length: sides + 1 }, (_, i) => row * (sides + 1) + i)
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i], b = ring[(i + 1) % ring.length]
      indices.push(center, reverse ? b : a, reverse ? a : b)
    }
  }
  kit.add('hull', indexed(positions, indices))
  const outline: THREE.Vector2[] = []
  for (const side of [-1, 1]) {
    const rim: Point[] = [], stripe: Point[] = [], boot: Point[] = []
    for (let i = 0; i <= rows; i++) {
      const t = side === -1 ? i / rows : 1 - i / rows
      const s = section(t)
      outline.push(new THREE.Vector2(side * s.beam * .94, -s.z))
      rim.push([side * s.beam, s.sheer, s.z])
      for (const [height, points] of [[.08 + .11 * (1 - t) ** 3, stripe], [VOYAGER_WATERLINE + .04, boot]] as const) {
        const theta = Math.acos(1 - THREE.MathUtils.clamp((height - s.keel) / (s.sheer - s.keel), 0, 1))
        points.push([side * (s.beam * Math.sin(theta) + .012), height, s.z])
      }
    }
    kit.tube('rim', rim, .037, 68)
    kit.tube('rim', stripe, .015, 68)
    kit.tube('hull', boot, .009, 68)
  }
  const deck = new THREE.ExtrudeGeometry(new THREE.Shape(outline), { depth: .075, bevelEnabled: false })
  deck.rotateX(-Math.PI / 2).translate(0, .245, 0)
  kit.add('deck', deck)
  kit.rod('rim', [-.91, .46, 2.2], [.91, .46, 2.2], .039)
  // Inboard coamings close the upper shell while leaving a sunken cockpit.
  for (const side of [-1, 1]) {
    const p: number[] = [], ix: number[] = []
    for (let i = 0; i <= rows; i++) {
      const s = section(i / rows)
      p.push(side * s.beam * .965, s.sheer - .025, s.z, side * s.beam * .9, .3, s.z)
      if (i) {
        const a = i * 2 - 2
        if (side > 0) ix.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
        else ix.push(a, a + 2, a + 1, a + 2, a + 3, a + 1)
      }
    }
    kit.add('wood', indexed(p, ix))
  }
}

function roundedRect(x: number, y: number, w: number, h: number, r: number) {
  const shape = new THREE.Shape()
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y); shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r); shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h); shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r); shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}

function plate(shape: THREE.Shape, depth: number) {
  return new THREE.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: false, curveSegments: 5 })
}

function cabin(kit: Builder) {
  for (const side of [-1, 1]) {
    const wall = new THREE.Shape()
    wall.moveTo(-.44, .32); wall.lineTo(1.47, .32); wall.lineTo(1.4, .64)
    wall.quadraticCurveTo(1.33, .79, 1.13, .8)
    wall.lineTo(-.27, .8); wall.quadraticCurveTo(-.42, .79, -.44, .65); wall.closePath()
    const opening = roundedRect(-.08, .477, 1.19, .235, .11)
    wall.holes.push(opening)
    const frame = roundedRect(-.096, .461, 1.222, .267, .122)
    frame.holes.push(roundedRect(-.08, .477, 1.19, .235, .11))
    kit.add('metal', plate(frame, .012).rotateY(Math.PI / 2).translate(side > 0 ? .636 : -.65, 0, 0))
    kit.add('light', plate(roundedRect(-.07, .487, 1.17, .215, .1), .009)
      .rotateY(Math.PI / 2).translate(side > 0 ? .596 : -.605, 0, 0))
    for (const u of [.3, .71]) {
      kit.rod('metal', [side * .639, .481, -u], [side * .639, .708, -u], .0055)
    }
    kit.add('cabin', plate(wall, .058).rotateY(Math.PI / 2).translate(side > 0 ? .578 : -.636, 0, 0))
    kit.tube('wood', [[side * .67, .342, .44], [side * .69, .352, -.3], [side * .66, .345, -1.35]], .026, 20)
  }
  const endWall = () => {
    const shape = new THREE.Shape()
    shape.moveTo(-.635, .32); shape.lineTo(.635, .32); shape.lineTo(.635, .74)
    shape.quadraticCurveTo(.56, .89, 0, .905)
    shape.quadraticCurveTo(-.56, .89, -.635, .74); shape.closePath()
    return shape
  }
  const aft = endWall()
  aft.holes.push(roundedRect(-.23, .32, .46, .5, .06))
  kit.add('cabin', plate(aft, .065).translate(0, 0, .375))
  kit.add('cabin', plate(endWall(), .055).translate(0, 0, -1.42))
  kit.box('wood', [.036, .48, .044], [-.246, .565, .453], .012)
  kit.box('wood', [.036, .48, .044], [.246, .565, .453], .012)
  kit.box('wood', [.42, .47, .038], [-.08, .555, .3], .018, [0, -.2, 0])
  kit.box('glass', [.29, .19, .012], [-.08, .65, .321], .025, [0, -.2, 0])
  kit.box('metal', [.035, .018, .018], [.08, .5, .35], .006)
  // A thin arched section forms both roof skin and eaves, not a beveled slab.
  const roofSection = new THREE.Shape()
  roofSection.moveTo(-.685, .755)
  roofSection.quadraticCurveTo(-.67, .875, -.4, .915)
  roofSection.quadraticCurveTo(0, .985, .4, .915)
  roofSection.quadraticCurveTo(.67, .875, .685, .755)
  roofSection.lineTo(.645, .755)
  roofSection.quadraticCurveTo(.63, .845, .39, .879)
  roofSection.quadraticCurveTo(0, .947, -.39, .879)
  roofSection.quadraticCurveTo(-.63, .845, -.645, .755)
  roofSection.closePath()
  kit.add('roof', new THREE.ExtrudeGeometry(roofSection, { depth: 2, steps: 1, bevelEnabled: false, curveSegments: 18 }).translate(0, 0, -1.51))
  kit.box('metal', [.42, .029, .38], [0, .955, -.78], .025)
  kit.box('glass', [.36, .012, .32], [0, .975, -.78], .025)
  for (const side of [-1, 1]) {
    for (const z of [-1.13, -.48, .17]) kit.rod('metal', [side * .47, .892, z], [side * .47, .95, z], .009)
    kit.tube('wood', [[side * .47, .91, -1.2], [side * .47, .975, -1.12], [side * .47, .975, .17], [side * .47, .91, .25]], .014, 18)
  }
  kit.add('metal', new THREE.CylinderGeometry(.058, .07, .045, 12).translate(-.26, .942, -.15))
  kit.add('rim', new THREE.SphereGeometry(.064, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(-.26, .962, -.15))
}

function deckDetails(kit: Builder) {
  // Longitudinal plank joints stop at cabin footprints and remain below the fittings.
  for (let i = -4; i <= 4; i++) kit.box('wood', [.009, .006, 1.53], [i * .18, .324, 1.35], .002)
  for (const side of [-1, 1]) {
    kit.box('cabin', [.26, .2, 1.45], [side * .72, .425, 1.25], .055)
    for (let plank = 0; plank < 3; plank++) kit.box('wood', [.099, .038, 1.48], [side * .72 + (plank - 1) * .104, .547, 1.25], .014)
    kit.tube('wood', [[side * .86, .53, .53], [side * .94, .55, 1.18], [side * .87, .56, 1.93]], .027, 20)
    for (const z of [.89, 1.58]) {
      kit.box('metal', [.046, .018, .018], [side * .578, .44, z], .005)
      kit.box('wood', [.018, .13, .022], [side * .584, .42, z - .22], .004)
    }
    const rail: Point[] = []
    for (const t of [.08, .21, .39, .61, .81, .99]) {
      const s = section(t), p: Point = [side * s.beam, s.sheer, s.z]
      kit.rod('metal', p, [p[0], p[1] + .28, p[2]], .011)
      kit.add('metal', new THREE.CylinderGeometry(.031, .031, .015, 8).translate(...p))
      rail.push([p[0], p[1] + .28, p[2]])
    }
    kit.tube('rope', rail, .009, 38)
    for (const z of [-.1, 1.18]) {
      kit.tube('rope', [[side * 1.04, .61, z], [side * 1.13, .32, z], [side * 1.13, .15, z]], .008, 10)
      kit.add('keel', new THREE.CapsuleGeometry(.064, .28, 4, 10).translate(side * 1.13, .15, z))
    }
    kit.rod('metal', [side * .83, .48, 1.95], [side * .83, .57, 1.95], .026)
    kit.rod('metal', [side * .74, .56, 1.95], [side * .92, .56, 1.95], .025)
  }
  kit.box('cabin', [1.48, .19, .22], [0, .42, 1.97], .055)
  for (let plank = 0; plank < 2; plank++) kit.box('wood', [1.52, .038, .11], [0, .547, 1.91 + plank * .115], .014)
  kit.box('wood', [.5, .055, .18], [0, .352, .52], .018)
  kit.box('metal', [.025, .16, .045], [0, .58, 2.14], .009)
  kit.rod('wood', [0, .64, 2.2], [.18, .66, 1.4], .03, .021)
  kit.box('keel', [.1, .82, .32], [0, -.1, 2.24], .045)
  for (const side of [-1, 1]) kit.rod('metal', [side * .2, .48, 2.24], [side * .2, -.38, 2.27], .018)
  for (const y of [-.24, .01, .26]) kit.rod('wood', [-.2, y, 2.27], [.2, y, 2.27], .025)
  for (let ring = 0; ring < 4; ring++) {
    const geometry = new THREE.TorusGeometry(.12 + ring * .019, .008, 5, 26).rotateX(Math.PI / 2).scale(1, 1, .72).translate(.46, .334, 1.76)
    kit.add('rope', geometry)
  }
  // One compact lamp is a point of habitation, not a floodlight.
  kit.rod('metal', [.77, .59, 1.74], [.77, .91, 1.74], .015)
  kit.rod('metal', [.77, .91, 1.74], [.65, .91, 1.74], .014)
  kit.add('light', new THREE.CylinderGeometry(.046, .046, .115, 10).translate(.65, .778, 1.74))
  for (const y of [.701, .85]) kit.add('metal', new THREE.CylinderGeometry(.073, .066, .038, 12).translate(.65, y, 1.74))
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2
    kit.rod('metal', [.65 + Math.cos(a) * .057, .716, 1.74 + Math.sin(a) * .057], [.65 + Math.cos(a) * .057, .834, 1.74 + Math.sin(a) * .057], .005)
  }
}

export function buildVoyagerGeometry(): VoyagerBatch[] {
  const kit = builder()
  hull(kit)
  cabin(kit)
  deckDetails(kit)
  kit.rod('wood', [0, .32, -.98], [0, 3.86, -.98], .047, .029)
  kit.rod('metal', [0, .33, -.98], [0, .52, -.98], .065)
  kit.rod('wood', [0, 1.44, -.98], [.95, 1.48, 1.78], .027, .022)
  kit.rod('wood', [0, .49, -2.35], [0, .72, -2.87], .027, .019)
  for (const side of [-1, 1]) kit.rod('rope', [0, 3.78, -.98], [side * .9, .47, -1.13], .006)
  kit.rod('rope', [0, 3.8, -.98], [0, .72, -2.87], .006)
  kit.box('metal', [.19, .045, .25], [.79, .49, 2.05], .012)
  kit.tube('metal', [[.79, .48, 2.04], [.88, .82, 2.22], [1.02, 1.02, 2.5], VOYAGER_ANCHOR_POINT], .035, 18)
  kit.rod('metal', [.81, .48, 2.2], [.94, .87, 2.32], .022)
  kit.add('metal', new THREE.CylinderGeometry(.071, .071, .09, 14).rotateZ(Math.PI / 2).translate(...VOYAGER_ANCHOR_POINT))
  return kit.finish()
}

function sailPoint(u: number, v: number): Point {
  const lower = new THREE.Vector3(0, 1.49, -.98).lerp(new THREE.Vector3(.95, 1.52, 1.72), u)
  const upper = new THREE.Vector3(0, 2.98, -.98).lerp(new THREE.Vector3(.64, 3.53, 1.13), u)
  const p = lower.lerp(upper, v)
  const tension = Math.sin(Math.PI * u) * Math.sin(Math.PI * v)
  const draft = .64 * Math.pow(Math.sin(Math.PI * u), .88) * (1.42 - .85 * u) * Math.pow(Math.sin(Math.PI * v), .72)
  // Push along the cloth normal so its belly reads from both stern and side views.
  p.x += draft
  p.z -= draft * .31 + .1 * Math.sin(Math.PI * v) * u ** 3
  p.y -= .055 * Math.sin(Math.PI * u) * (1 - v) ** 3
  p.x += .022 * Math.sin(v * 22 + u * 7) * tension * u ** 3
  return [p.x, p.y - 1.45, p.z]
}

export function buildVoyagerSail(): VoyagerBatch[] {
  const kit = builder(), positions: number[] = [], indices: number[] = [], columns = 22, rows = 18
  for (let row = 0; row <= rows; row++) for (let col = 0; col <= columns; col++) positions.push(...sailPoint(col / columns, row / rows))
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = row * (columns + 1) + col, b = a + columns + 1
    indices.push(a, a + 1, b, b, a + 1, b + 1)
  }
  kit.add('canvas', indexed(positions, indices))
  for (const u of [0, 1]) kit.tube('seam', Array.from({ length: 19 }, (_, i) => sailPoint(u, i / 18)), .005, 22)
  for (const v of [0, 1]) kit.tube('seam', Array.from({ length: 23 }, (_, i) => sailPoint(i / 22, v)), .0045, 26)
  // Flat fabric laps share the sail's shading instead of sparkling tube edges.
  for (const v of [.19, .39, .6, .8]) for (const side of [-1, 1]) {
    const strip: number[] = [], faces: number[] = []
    for (let col = 0; col <= columns; col++) {
      const u = col / columns
      const tangent = new THREE.Vector3(...sailPoint(Math.min(1, u + .001), v)).sub(new THREE.Vector3(...sailPoint(Math.max(0, u - .001), v)))
      const vertical = new THREE.Vector3(...sailPoint(u, v + .001)).sub(new THREE.Vector3(...sailPoint(u, v - .001)))
      const offset = tangent.cross(vertical).normalize().multiplyScalar(side * .0012)
      for (const edge of [-1, 1]) strip.push(...new THREE.Vector3(...sailPoint(u, v + edge * .0018)).add(offset).toArray())
      if (col) { const a = col * 2 - 2; faces.push(a, a + 1, a + 2, a + 2, a + 1, a + 3) }
    }
    kit.add('seam', indexed(strip, faces))
  }
  return rigMorphs(kit.finish(), false)
}

function rigMorphs(batches: VoyagerBatch[], jib: boolean) {
  for (const { geometry } of batches) {
    const p = geometry.getAttribute('position'), folded = p.clone(), breeze = p.clone()
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i)
      const along = THREE.MathUtils.clamp((z + (jib ? 2.8 : .98)) / (jib ? 1.66 : 2.7), 0, 1)
      folded.setXYZ(i, along * (jib ? .12 : .95) + Math.sin(y * 29) * .026,
        .075 + Math.sin(y * 38) * .025 + along * .015, z)
      const envelope = Math.sin(Math.PI * along) * Math.sin(Math.PI * THREE.MathUtils.clamp(y / (jib ? 2.64 : 2.08), 0, 1))
      breeze.setX(i, x + .026 * envelope * Math.sin(y * 3.5 + z * 2))
    }
    geometry.morphAttributes.position = [folded, breeze]
    geometry.morphAttributes.normal = [folded, breeze].map(position => {
      const target = new THREE.BufferGeometry()
      target.setAttribute('position', position)
      // Batching expands triangles; weld before computing cloth morph normals.
      const welded = mergeVertices(target, .00001)
      welded.computeVertexNormals()
      const expanded = welded.toNonIndexed()
      const normal = expanded.getAttribute('normal').clone()
      target.dispose(); welded.dispose(); expanded.dispose()
      return normal
    })
  }
  return batches
}

export function buildVoyagerGaff(): VoyagerBatch[] {
  const kit = builder()
  kit.rod('wood', [0, 0, 0], [0, Math.hypot(.64, .55, 2.11), 0], .026, .02)
  return kit.finish()
}

export function buildVoyagerJib(): VoyagerBatch[] {
  const kit = builder(), p: number[] = [], ix: number[] = [], rows = 18, cols = 10
  for (let row = 0; row <= rows; row++) {
    const v = row / rows
    for (let col = 0; col <= cols; col++) {
      const u = col / cols
      const left = new THREE.Vector3(0, .79, -2.8).lerp(new THREE.Vector3(0, 3.43, -.98), v)
      const right = new THREE.Vector3(.12, 1.35, -1.14).lerp(new THREE.Vector3(0, 3.43, -.98), v)
      const q = left.lerp(right, u)
      q.x += .3 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * (1.3 - .55 * u)
      q.y -= .06 * Math.sin(u * Math.PI) * (1 - v) ** 3
      p.push(q.x, q.y - .79, q.z)
    }
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const a = row * (cols + 1) + col, b = a + cols + 1
    ix.push(a, a + 1, b)
    if (row < rows - 1) ix.push(b, a + 1, b + 1)
  }
  kit.add('canvas', indexed(p, ix))
  kit.rod('seam', [0, 0, -2.8], [0, 2.64, -.98], .006)
  kit.rod('seam', [.12, .56, -1.14], [0, 2.64, -.98], .006)
  kit.rod('seam', [0, 0, -2.8], [.12, .56, -1.14], .006)
  return rigMorphs(kit.finish(), true)
}

export function buildVoyagerAnchor(): VoyagerBatch[] {
  const kit = builder()
  kit.rod('rim', [0, 0, 0], [0, -.28, 0], .019)
  kit.tube('rim', [[-.14, -.19, 0], [-.09, -.29, 0], [0, -.32, 0], [.09, -.29, 0], [.14, -.19, 0]], .021, 14)
  for (const side of [-1, 1]) kit.box('rim', [.055, .07, .035], [side * .13, -.205, 0], .008, [0, 0, -side * .35])
  kit.add('rim', new THREE.TorusGeometry(.035, .01, 6, 12).translate(0, .018, 0))
  return kit.finish()
}

export function buildVoyagerFurledSails(): VoyagerBatch[] {
  const kit = builder()
  for (const [from, to, radius] of [
    [[0, 1.52, -.96], [.95, 1.56, 1.73], .065],
    [[0, .84, -2.76], [.12, .87, -1.15], .046],
  ] as [Point, Point, number][]) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), axis = b.clone().sub(a).normalize()
    const rotation = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis)
    const length = a.distanceTo(b)
    const roll = new THREE.CylinderGeometry(radius, radius, length, 12, 28)
    const cloth = roll.getAttribute('position')
    for (let i = 0; i < cloth.count; i++) {
      const along = cloth.getY(i)
      const t = along / length + .5
      const theta = Math.atan2(cloth.getZ(i), cloth.getX(i))
      const tieDistance = Math.min(...[.14, .4, .66, .9].map(tie => Math.abs(t - tie)))
      const gather = .83 + .36 * (1 - Math.exp(-tieDistance * 24))
      const fold = 1 + .17 * Math.sin(theta * 3 + t * 5) + .07 * Math.cos(theta * 5 - t * 11)
      cloth.setX(i, cloth.getX(i) * gather * fold)
      cloth.setZ(i, cloth.getZ(i) * gather * fold * .9)
    }
    roll.computeVertexNormals()
    roll.applyQuaternion(rotation).translate(...a.clone().add(b).multiplyScalar(.5).toArray())
    kit.add('canvas', roll)
    for (const t of [.14, .4, .66, .9]) {
      const tie = new THREE.TorusGeometry(radius + .003, .006, 5, 12)
      tie.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), axis))
      tie.translate(...a.clone().lerp(b, t).toArray())
      kit.add('rope', tie)
    }
  }
  return kit.finish()
}
