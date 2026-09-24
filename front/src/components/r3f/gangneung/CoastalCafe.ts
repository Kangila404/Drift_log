import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import type { CitySurface } from '../city/CitySurfaces'

type Point = [number, number, number]
type Section = [number, number][]

// Convex x/y sections extruded along z, with flat outward-facing closed ends.
function sectionSolid(kit: CityBuilder, finish: CityFinish, section: Section, back: number, front: number, surface: CitySurface) {
  const vertices: Point[] = [back, front].flatMap(z => section.map(([x, y]): Point => [x, y, z]))
  const center = new THREE.Vector3()
  vertices.forEach(vertex => center.add(new THREE.Vector3(...vertex)))
  center.divideScalar(vertices.length)
  const count = section.length
  const faces: number[][] = [
    section.map((_, i) => i),
    section.map((_, i) => i + count),
    ...section.map((_, i) => [i, (i + 1) % count, (i + 1) % count + count, i + count]),
  ]
  const positions: number[] = []
  for (const face of faces) {
    const a = new THREE.Vector3(...vertices[face[0]])
    const b = new THREE.Vector3(...vertices[face[1]])
    const c = new THREE.Vector3(...vertices[face[2]])
    if (b.clone().sub(a).cross(c.clone().sub(a)).dot(a.clone().sub(center)) < 0) face.reverse()
    for (let i = 1; i < face.length - 1; i++) {
      for (const index of [face[0], face[i], face[i + 1]]) positions.push(...vertices[index])
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.computeVertexNormals()
  kit.add(finish, geometry, surface)
}

function roofPlane(kit: CityBuilder, left: number, right: number, leftY: number, rightY: number) {
  const back = -4.95, front = 2.95, thickness = .32
  const yAt = (x: number) => leftY + (rightY - leftY) * (x - left) / (right - left)
  sectionSolid(kit, 'steel', [
    [left, leftY - thickness], [right, rightY - thickness], [right, rightY], [left, leftY],
  ], back, front, 'sheet')
  for (const z of [back + .045, front - .045]) {
    kit.beam('edge', [left, leftY - .17, z], [right, rightY - .17, z], .24, .18, 'sheet')
  }
  // Raised standing seams follow drainage; panel relief stays subordinate to the roof mass.
  for (let z = back + .55; z < front - .2; z += .78) {
    kit.beam('faded', [left + .08, yAt(left + .08) + .026, z],
      [right - .08, yAt(right - .08) + .026, z], .045, .055, 'sheet')
  }
  const eaveX = leftY < rightY ? left : right
  const eaveY = Math.min(leftY, rightY) - .16
  const gutterX = eaveX + (leftY < rightY ? -.035 : .035)
  kit.box('edge', [.23, .075, front - back], [gutterX, eaveY - .14, -1], undefined, 'sheet')
  for (const offset of [-.105, .105]) {
    kit.box('steel', [.045, .22, front - back], [gutterX + offset, eaveY - .035, -1], undefined, 'sheet')
  }
  for (const z of [back + .035, front - .035]) {
    kit.box('steel', [.23, .22, .07], [gutterX, eaveY - .035, z], undefined, 'sheet')
  }
  const wallX = eaveX < 0 ? -6.22 : 6.22
  kit.beam('steel', [gutterX, eaveY - .15, -3.7], [wallX, eaveY - .62, -3.7], .12)
  kit.beam('steel', [wallX, eaveY - .62, -3.7], [wallX, 2.6, -3.7], .12)
  for (const y of [4.55, 6.55]) kit.box('edge', [.2, .065, .23], [wallX, y, -3.7])
}

/** Fictional upper-resort cafe/bathhouse; front is +z, shared flood is local y=4.25. */
export function buildCoastalCafe(kit: CityBuilder): void {
  // The submerged lower service storey is a wall shell, not a display pedestal.
  kit.box('edge', [12.4, 3.9, .46], [0, 1.95, -4.2], undefined, 'masonry')
  for (const x of [-5.98, 5.98]) {
    kit.box('edge', [.44, 3.9, 6.7], [x, 1.95, -.65], undefined, 'masonry')
  }
  kit.box('edge', [4.2, 3.9, .44], [-4.1, 1.95, 2.48], undefined, 'masonry')
  kit.box('edge', [3.4, 3.9, .44], [4.5, 1.95, 2.48], undefined, 'masonry')
  kit.box('concrete', [12.4, .38, 7.2], [0, 4.09, -.7], undefined, 'masonry')

  kit.box('concrete', [12.4, 3.02, .44], [0, 5.79, -4.2], undefined, 'plaster')
  kit.box('concrete', [.44, 3.02, 6.7], [-5.98, 5.79, -.65], undefined, 'plaster')
  // The bathhouse flank has two deep, high windows above a continuous solid wall.
  kit.box('concrete', [.44, 1.35, 6.7], [5.98, 4.955, -.65], undefined, 'plaster')
  kit.box('concrete', [.44, .57, 6.7], [5.98, 7.015, -.65], undefined, 'plaster')
  for (const [z, depth] of [[-3.61, .78], [-1.2, 1.4], [1.91, 1.58]]) {
    kit.box('concrete', [.44, 1.1, depth], [5.98, 6.18, z], undefined, 'plaster')
  }
  for (const [z, width] of [[-2.46, 1.52], [.31, 1.62]]) {
    kit.box('glass', [.065, 1.04, width], [5.82, 6.18, z])
    kit.box('edge', [.62, .12, width + .13], [5.99, 5.61, z], undefined, 'masonry')
    kit.box('steel', [.12, 1.1, .055], [6.02, 6.18, z])
  }

  // Broad recessed opening: solid unequal cheeks, one structural pier, no colonnade.
  kit.box('concrete', [1.65, 3.02, .62], [-5.375, 5.79, 2.3], undefined, 'plaster')
  kit.box('concrete', [.85, 3.02, .62], [5.775, 5.79, 2.3], undefined, 'plaster')
  kit.box('concrete', [12.4, .43, .66], [0, 7.085, 2.28], undefined, 'plaster')
  kit.box('edge', [.3, 2.62, .4], [2.82, 5.59, 1.76], undefined, 'masonry')
  kit.box('steel', [9.9, .14, .18], [.4, 6.82, 1.69])
  kit.box('edge', [9.9, .12, .28], [.4, 4.34, 1.69], undefined, 'masonry')
  for (const x of [-4.53, -2.96, 2.82, 5.3]) {
    kit.box('steel', [.085, 2.48, .14], [x, 5.58, 1.69])
  }
  kit.box('glass', [1.4, 2.31, .045], [-3.745, 5.575, 1.67])
  // One retained upper pane with a missing lower corner; the central entrance stays open.
  sectionSolid(kit, 'glass', [[2.94, 6.24], [4.72, 5.94], [5.22, 6.12], [5.22, 6.73], [2.94, 6.73]],
    1.645, 1.695, 'generic')

  // A modest counter, partition and exposed beams can be seen through the lost glazing.
  kit.box('faded', [3.15, .95, .76], [2.65, 4.755, -.78], undefined, 'plaster')
  kit.box('edge', [3.4, .16, .94], [2.65, 5.31, -.78], undefined, 'masonry')
  kit.box('concrete', [.24, 2.6, 2.75], [.1, 5.58, -2.6], undefined, 'plaster')
  kit.box('faded', [2.5, .12, .45], [-3.5, 5.46, -3.83], undefined, 'timber')
  for (const z of [-2.85, .15]) {
    kit.box('edge', [11.55, .24, .22], [0, 7.14, z], undefined, 'masonry')
  }

  // Unequal shed planes meet at an offset raised ridge; only its rear section is glazed.
  roofPlane(kit, -6.8, -1.35, 7.64, 8.32)
  roofPlane(kit, -1.35, 6.8, 9.12, 7.64)
  for (const [back, front] of [[-4.42, -4.02], [2.05, 2.49]]) {
    sectionSolid(kit, 'concrete', [[-6.2, 7.29], [-1.35, 7.29], [-1.35, 8], [-6.2, 7.395]], back, front, 'plaster')
    sectionSolid(kit, 'concrete', [[-1.35, 7.29], [6.2, 7.29], [6.2, 7.429], [-1.35, 8.8]], back, front, 'plaster')
  }
  kit.box('concrete', [.24, .87, 2.75], [-1.29, 8.365, 1.065], undefined, 'plaster')
  kit.box('concrete', [.24, .87, .64], [-1.29, 8.365, -4.08], undefined, 'plaster')
  kit.box('glass', [.07, .51, 3.45], [-1.35, 8.51, -2.035])
  for (const y of [8.235, 8.785]) kit.box('edge', [.3, .09, 3.53], [-1.35, y, -2.035], undefined, 'sheet')
  for (const z of [-3.8, -2.65, -1.49, -.27]) kit.box('steel', [.15, .56, .075], [-1.4, 8.51, z])
  kit.box('steel', [.3, .1, 7.9], [-1.35, 9.115, -1], undefined, 'sheet')

  // Compact landing and descending treads cross the shared water surface, without added water.
  kit.box('concrete', [8.45, .28, 1.02], [-.27, 4.37, 3.01], undefined, 'masonry')
  for (let i = 0; i < 4; i++) {
    const top = 4.5 - (i + 1) * .23
    kit.box('edge', [5.3, .3, .37], [-.5, top - .15, 3.7 + i * .36], undefined, 'masonry')
  }
  kit.box('concrete', [.34, 1.05, 1.78], [3.78, 4.225, 3.45], undefined, 'plaster')
  kit.box('edge', [.46, .13, 1.9], [3.78, 4.815, 3.45], undefined, 'masonry')
  kit.box('concrete', [1.28, 1.05, .32], [3.31, 4.225, 4.18], undefined, 'plaster')
  kit.box('edge', [1.39, .13, .43], [3.31, 4.815, 4.18], undefined, 'masonry')
  for (const [z, bottom] of [[3.25, 4.48], [4.78, 3.55]]) {
    kit.beam('steel', [-3.04, bottom, z], [-3.04, bottom + .82, z], .085)
  }
  kit.beam('steel', [-3.04, 5.3, 3.25], [-3.04, 4.37, 4.78], .085)
}
