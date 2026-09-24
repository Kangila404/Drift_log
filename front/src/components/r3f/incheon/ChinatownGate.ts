import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { roofShell } from '../city/CityDetails'

type Point = [number, number, number]

// New waterfront concept B: four round posts, three open bays, stepped roof heights.
// Ground is y=0; the shared water surface belongs to the caller at local y=4.25.
const WATER_LEVEL = 4.25

/** Centered on x/z=0. Eave is the nominal roof-edge elevation, not a translation.
 * Width/depth include the eaves; rise excludes the low ridge cap. Uses only add().
 * Call with a translated builder to place it on a shophouse. */
export function buildChinatownRoof(
  kit: CityBuilder,
  width: number,
  depth: number,
  eave: number,
  rise: number,
  finish: CityFinish = 'paint',
): void {
  if (![width, depth, eave, rise].every(Number.isFinite) || width < 1.5 || depth < 1.5 || rise < .25) {
    throw new RangeError('Chinatown roof requires finite width >= 1.5, depth >= 1.5 and rise >= .25')
  }
  const halfWidth = width / 2, halfDepth = depth / 2
  const tileCount = Math.max(3, Math.min(18, Math.round(width / (width < 5 ? .9 : .8))))
  const across = 8
  const thickness = Math.min(.22, depth * .07)
  const curl = Math.min(.32, rise * .20)
  const cornerLift = Math.min(.52, rise * .28)
  const slopeSamples = [0, .30, .325, .62, .645, .96, 1]
  const samples = [...slopeSamples.slice(1).reverse().map(v => -v), ...slopeSamples]
  const profile = (x: number, z: number) => {
    const u = Math.abs(x) / halfWidth, v = Math.abs(z) / halfDepth
    const hip = Math.max(0, (u - .62) / .38)
    const fall = 1 - (1 - v) * (1 - hip * hip)
    return eave + rise * (1 - fall) ** 2 + curl * fall ** 8 + cornerLift * u ** 8 * v ** 6
  }
  const points: number[] = [], indices: number[] = []
  for (let j = 0; j < samples.length; j++) {
    const v = samples[j], z = v * halfDepth
    for (let i = 0; i <= across; i++) {
      const x = (i / across - .5) * width
      points.push(x, profile(x, z), z)
    }
  }
  for (let j = 0; j < samples.length - 1; j++) {
    for (let i = 0; i < across; i++) {
      const a = j * (across + 1) + i, b = a + 1, c = a + across + 1, d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }
  const substrate = new THREE.BufferGeometry()
  substrate.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  substrate.setIndex(indices)
  roofShell(kit, substrate, thickness, finish, 'tile')

  // Solid barrel-tile runs stand above darker gutters. Only the substrate needs
  // a full roof underside; the small closed runs use two underside triangles per step.
  const pitch = width / tileCount, radius = pitch * .40
  const tileHeight = Math.min(.075, pitch * .12)
  const tilePoints: number[] = [], tileIndices: number[] = [], tileTops: number[] = []
  for (let tile = 0; tile < tileCount; tile++) {
    const center = -halfWidth + pitch * (tile + .5)
    const first = tilePoints.length / 3
    for (const v of samples) {
      const z = v * halfDepth, course = slopeSamples.indexOf(Math.abs(v))
      const lap = course % 2 === 1 && course < slopeSamples.length - 1 ? .055 : 0
      for (let arc = 0; arc <= 4; arc++) {
        const angle = arc * Math.PI / 4, x = center - radius * Math.cos(angle)
        tilePoints.push(x, profile(x, z) + .025 + tileHeight * Math.sin(angle) + lap, z)
      }
      for (const x of [center - radius, center + radius]) tilePoints.push(x, profile(x, z) - .025, z)
    }
    for (let j = 0; j < samples.length - 1; j++) {
      const a = first + j * 7, b = a + 7
      const isLap = Math.abs(samples[j + 1] - samples[j]) < .045
      for (let arc = 0; arc < 4; arc++) {
        const faces = isLap ? tileIndices : tileTops
        faces.push(a + arc, b + arc, a + arc + 1, a + arc + 1, b + arc, b + arc + 1)
      }
      tileIndices.push(a, a + 5, b, b, a + 5, b + 5)
      tileIndices.push(a + 4, b + 4, a + 6, a + 6, b + 4, b + 6)
      tileIndices.push(a + 5, a + 6, b + 5, a + 6, b + 6, b + 5)
    }
    for (const end of [0, samples.length - 1]) {
      const a = first + end * 7
      const cap = [a + 5, a, a + 1, a + 2, a + 3, a + 4, a + 6]
      const outline = cap.map(i => new THREE.Vector2(tilePoints[i * 3], tilePoints[i * 3 + 1]))
      for (const [i, j, k] of THREE.ShapeUtils.triangulateShape(outline, [])) {
        const cross = outline[j].clone().sub(outline[i]).cross(outline[k].clone().sub(outline[i]))
        if ((cross > 0) === (end > 0)) tileIndices.push(cap[i], cap[j], cap[k])
        else tileIndices.push(cap[i], cap[k], cap[j])
      }
    }
  }
  const tiles = new THREE.BufferGeometry()
  tiles.setAttribute('position', new THREE.Float32BufferAttribute(tilePoints, 3))
  tiles.setIndex(tileTops)
  tiles.computeVertexNormals()
  kit.add(finish, tiles.toNonIndexed(), 'tile')
  // Preserve sharp ceramic edges instead of averaging side normals into the tile faces.
  tiles.setIndex(tileIndices)
  const tileEdges = tiles.toNonIndexed()
  tileEdges.computeVertexNormals()
  kit.add('edge', tileEdges, 'tile')
  tiles.dispose()

  // Curved rafters and short struts carry the raised shell down to its bearing level.
  const rafters = width < 5 ? [-width * .25, width * .25] : [-width * .30, 0, width * .30]
  for (const x of rafters) {
    const top = samples.map(v => new THREE.Vector2(v * halfDepth, profile(x, v * halfDepth) - thickness))
    const bottom = [...top].reverse().map(p => new THREE.Vector2(p.x, p.y - .28))
    const rafter = new THREE.ExtrudeGeometry(new THREE.Shape([...top, ...bottom]), {
      depth: .24, bevelEnabled: false, steps: 1,
    }).translate(0, 0, -.12).rotateY(Math.PI / 2).translate(x, 0, 0)
    kit.add('faded', rafter, 'timber')
    for (const z of [-depth * .23, 0, depth * .23]) {
      const bottomY = eave - thickness - .30
      const topY = profile(x, z) - thickness - .16
      kit.add('faded', new THREE.BoxGeometry(.30, topY - bottomY, .32)
        .translate(x, (topY + bottomY) / 2, z), 'timber')
    }
  }

  // A low, rounded ridge has real end caps; it never turns into a finial or spire.
  const ridgeHalf = halfWidth * .60
  const ridge = new THREE.CylinderGeometry(.15, .15, ridgeHalf * 2, 12, 1)
    .rotateZ(Math.PI / 2).translate(0, eave + rise + .13, 0)
  kit.add('edge', ridge, 'tile')
}

function roundPost(kit: CityBuilder, x: number, top: number, radius: number): void {
  kit.box('concrete', [2.35, WATER_LEVEL + .12, 2.2], [x, (WATER_LEVEL + .12) / 2, 0], undefined, 'masonry')
  kit.box('concrete', [2.02, .34, 1.94], [x, WATER_LEVEL + .29, 0], undefined, 'masonry')
  kit.box('edge', [1.85, .24, 1.8], [x, WATER_LEVEL + .58, 0], undefined, 'masonry')
  const foot = WATER_LEVEL + .64
  kit.add('rust', new THREE.CylinderGeometry(radius * .93, radius, top - foot, 32, 1)
    .translate(x, (top + foot) / 2, 0), 'plaster')
  for (const [y, height, extra, finish] of [
    [foot + .16, .32, .07, 'edge'],
    [top - .50, .24, .07, 'trim'],
    [top - .17, .34, .10, 'faded'],
  ] as const) {
    kit.add(finish, new THREE.CylinderGeometry(radius + extra, radius + extra, height, 32, 1)
      .translate(x, y, 0), 'plaster')
  }
}

function corbel(kit: CityBuilder, at: Point, span: number, height: number, depth: number, yaw: number): void {
  const half = span / 2
  const section = new THREE.Shape([
    new THREE.Vector2(-half, height), new THREE.Vector2(half, height),
    new THREE.Vector2(half, height * .64), new THREE.Vector2(half * .72, height * .64),
    new THREE.Vector2(half * .49, height * .27), new THREE.Vector2(half * .27, 0),
    new THREE.Vector2(-half * .27, 0), new THREE.Vector2(-half * .49, height * .27),
    new THREE.Vector2(-half * .72, height * .64), new THREE.Vector2(-half, height * .64),
  ])
  const geometry = new THREE.ExtrudeGeometry(section, { depth, bevelEnabled: false, steps: 1 })
    .translate(0, 0, -depth / 2).rotateY(yaw).translate(...at)
  kit.add('faded', geometry, 'plaster')
}

function brackets(kit: CityBuilder, xs: number[], y: number): void {
  for (const x of xs) {
    kit.box('faded', [.66, .32, .84], [x, y + .16, 0], undefined, 'plaster')
    corbel(kit, [x, y + .28, 0], 1.5, .43, .56, Math.PI / 2)
    corbel(kit, [x, y + .63, 0], 1.65, .42, .66, 0)
    corbel(kit, [x, y + .98, 0], 2.65, .48, .58, Math.PI / 2)
  }
}

function lintel(kit: CityBuilder, center: number, width: number, y: number, height: number): void {
  kit.box('faded', [width, height, 1.12], [center, y, 0], undefined, 'plaster')
  kit.box('edge', [width + .18, .23, 1.68], [center, y - height / 2 + .06, 0], undefined, 'plaster')
  kit.box('rust', [width + .12, .28, 1.62], [center, y + height / 2 - .04, 0], undefined, 'plaster')
  // Shallow carved coffers are cut through a facing, backed by the structural beam.
  // The rejected freestanding stars and sign-like medallion band are removed.
  const facing = new THREE.Shape([
    new THREE.Vector2(-width / 2, -height * .34), new THREE.Vector2(width / 2, -height * .34),
    new THREE.Vector2(width / 2, height * .34), new THREE.Vector2(-width / 2, height * .34),
  ])
  const panelCount = width > 8 ? 5 : 3, spacing = width / panelCount
  for (let i = 0; i < panelCount; i++) {
    const x = (i - (panelCount - 1) / 2) * spacing, w = spacing * .72, h = height * .42
    const hole = new THREE.Path()
    hole.moveTo(x - w / 2, -h / 2); hole.lineTo(x - w / 2, h / 2)
    hole.lineTo(x + w / 2, h / 2); hole.lineTo(x + w / 2, -h / 2); hole.closePath()
    facing.holes.push(hole)
  }
  for (const side of [-1, 1]) {
    const face = new THREE.ExtrudeGeometry(facing, { depth: .18, bevelEnabled: false, steps: 1 })
    if (side < 0) face.rotateY(Math.PI)
    kit.add('faded', face.translate(center, y, side * .57), 'timber')
    for (let i = 0; i < panelCount; i++) {
      const x = center + (i - (panelCount - 1) / 2) * spacing
      kit.box('edge', [spacing * .45, height * .12, .10], [x, y, side * .58], undefined, 'timber')
    }
  }
}

/** Local bounds approximately x +/-13, y 0..21.8, z +/-2.8.
 * Post centers are -10,-5,5,10: bay spans 5/10/5 measured center-to-center.
 * Round shafts reduce the physical clear widths. No water or ground is added. */
export function buildChinatownGate(kit: CityBuilder): void {
  for (const x of [-10, -5, 5, 10]) roundPost(kit, x, Math.abs(x) === 5 ? 20 : 18.2, Math.abs(x) === 5 ? .82 : .74)

  lintel(kit, 0, 10.4, 15.55, 1.9)
  lintel(kit, 0, 9.4, 18.0, 1.15)
  brackets(kit, [-4.4, -2.2, 0, 2.2, 4.4], 18.42)
  kit.box('faded', [10.2, .34, 2.9], [0, 19.88, 0], undefined, 'timber')
  // Official Paeru photo: one central crown, two side crowns, four lower rooflets.
  // Each build call is one architectural roof assembly, regardless of material batches.
  buildChinatownRoof(kit, 10.8, 5.6, 20.1, 1.35)

  for (const direction of [-1, 1]) {
    const center = direction * 7.5
    lintel(kit, center, 5.3, 11.9, 1.3)
    lintel(kit, center, 5.3, 16.1, 1.4)
    brackets(kit, [direction * 6, center, direction * 9], 16.54)
    kit.box('faded', [5.6, .34, 2.65], [center, 18.02, 0], undefined, 'timber')
    const shifted: CityBuilder = {
      ...kit,
      add: (finish, geometry, surface) => kit.add(finish, geometry.translate(center, 0, 0), surface),
    }
    buildChinatownRoof(shifted, 6.2, 4.7, 18.2, 1.05)

    for (const [offset, width] of [[3.7, 3.8], [11.2, 3.6]]) {
      const x = direction * offset
      kit.box('faded', [width - .35, .36, 1.7], [x, 15.58, 0], undefined, 'timber')
      for (const support of [-.65, .65]) corbel(kit, [x + support, 15.7, 0], 2.2, .46, .45, Math.PI / 2)
      const rooflet: CityBuilder = {
        ...kit,
        add: (finish, geometry, surface) => kit.add(finish, geometry.translate(x, 0, 0), surface),
      }
      buildChinatownRoof(rooflet, width, 3.8, 16.2, .8)
    }
  }
}
