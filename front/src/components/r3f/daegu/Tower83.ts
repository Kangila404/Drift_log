import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import type { CitySurface } from '../city/CitySurfaces'

type Point = [number, number, number]

// Profile reference: Daegu Tourism FILE_ENGATTR_14 and E-World's tower gallery.
export function buildTower83(kit: CityBuilder): void {
  const sides = 8
  const halfAngle = Math.PI / sides
  const radiusForWidth = (width: number) => width / (2 * Math.cos(halfAngle))
  const vertex = (width: number, y: number, index: number): Point => {
    const angle = halfAngle + index * Math.PI * 2 / sides
    const radius = radiusForWidth(width)
    return [Math.sin(angle) * radius, y, Math.cos(angle) * radius]
  }
  const solid = (finish: CityFinish, bottom: number, top: number, lowWidth: number, highWidth = lowWidth, surface: CitySurface = 'generic') => {
    const source = new THREE.CylinderGeometry(
      radiusForWidth(highWidth), radiusForWidth(lowWidth), top - bottom,
      sides, 1, false, halfAngle,
    )
    const geometry = source.toNonIndexed()
    source.dispose()
    geometry.computeVertexNormals()
    geometry.translate(0, (bottom + top) / 2, 0)
    kit.add(finish, geometry, surface)
  }
  const beam = (finish: CityFinish, from: Point, to: Point, width: number, surface: CitySurface = 'sheet') => {
    kit.beam(finish, from, to, width, width, surface)
  }
  const glazingFloor = (bottom: number, top: number, lowWidth: number, highWidth: number, sillHeight = .16, headHeight = .13) => {
    // Closed glass volumes sit behind projecting slabs and solid mullions.
    solid('glass', bottom, top, lowWidth, highWidth)
    solid('concrete', bottom, bottom + sillHeight, lowWidth + .09, lowWidth + .09, 'plaster')
    solid('trim', top - headHeight, top, highWidth + .09, highWidth + .09, 'sheet')
    for (let face = 0; face < sides; face++) {
      const a = vertex(lowWidth + .035, bottom + .08, face)
      const b = vertex(lowWidth + .035, bottom + .08, face + 1)
      const c = vertex(highWidth + .035, top - .07, face)
      const d = vertex(highWidth + .035, top - .07, face + 1)
      beam('trim', a, c, .085)
      for (const fraction of [1 / 3, 2 / 3]) {
        const interpolate = (p: Point, q: Point): Point => [
          p[0] + (q[0] - p[0]) * fraction,
          p[1] + (q[1] - p[1]) * fraction,
          p[2] + (q[2] - p[2]) * fraction,
        ]
        beam('edge', interpolate(a, b), interpolate(c, d), .042)
      }
    }
  }

  // The service wing meets the tower podium; the entire footprint is 7.8 x 4.8.
  kit.box('edge', [7.8, .22, 4.8], [1.6, .11, 0], undefined, 'masonry')
  kit.box('concrete', [4.4, 1.22, 3.5], [3.2, .83, .35], undefined, 'plaster')
  kit.box('edge', [4.55, .18, 3.7], [3.175, 1.53, .35], undefined, 'sheet')
  kit.box('concrete', [4.15, .1, 3.28], [3.18, 1.67, .35], undefined, 'plaster')
  for (const z of [-1.43, 2.13]) {
    kit.box('glass', [3.88, .54, .1], [3.2, .91, z])
    kit.box('edge', [4.04, .1, .18], [3.2, .59, z], undefined, 'sheet')
    for (const x of [1.3, 2.25, 3.2, 4.15, 5.1]) {
      kit.box('concrete', [.12, .83, .18], [x, .94, z], undefined, 'plaster')
    }
  }
  kit.box('glass', [.1, .94, 1.22], [5.42, .75, .35])
  for (const z of [-.31, .35, 1.01]) {
    kit.box('steel', [.16, 1.02, .075], [5.41, .79, z], undefined, 'sheet')
  }
  solid('concrete', .22, .52, 3.9, 3.9, 'masonry')
  glazingFloor(.52, 1.18, 3.48, 3.48)
  solid('edge', 1.18, 1.36, 3.8, 3.8, 'sheet')
  glazingFloor(1.36, 1.94, 3.28, 3.28)
  solid('concrete', 1.94, 2.12, 3.6, 3.45, 'plaster')

  solid('concrete', 1.94, 13.1, 1.24, 1.08, 'plaster')
  solid('edge', 13.01, 13.17, 1.19, 1.19, 'sheet')
  // Slender central core preserves open gaps between the load-bearing struts.
  solid('concrete', 13.1, 13.9, .76, .76, 'plaster')
  for (let i = 0; i < sides; i++) {
    beam('edge', vertex(1.06, 13.08, i), vertex(3.65, 13.98, i), .13)
    beam('edge', vertex(1.06, 13.08, i), vertex(3.65, 13.98, i + 1), .07)
  }
  solid('edge', 13.83, 14, 3.65, 3.74, 'sheet')
  glazingFloor(14, 14.84, 3.74, 3.97, .24, .2)
  glazingFloor(14.84, 15.72, 3.97, 4.1, .24, .2)
  glazingFloor(15.72, 16.56, 4.1, 3.94, .24, .2)
  solid('edge', 16.56, 16.75, 4.18, 3.92, 'sheet')
  solid('concrete', 16.75, 16.95, 3.92, 2.92, 'plaster')

  solid('steel', 16.85, 18.12, .36, .36, 'sheet')
  solid('edge', 16.9, 17.02, 2.98, 2.98, 'sheet')
  solid('edge', 17.39, 17.53, 1.3, 1.3, 'sheet')
  for (let i = 0; i < sides; i++) {
    const foot = vertex(2.86, 16.97, i)
    const waist = vertex(1.2, 17.46, i)
    const head = vertex(2.22, 18.09, i)
    beam('edge', foot, waist, .1)
    beam('edge', waist, head, .1)
    beam('edge', foot, vertex(1.2, 17.46, i + 1), .065)
    beam('edge', waist, vertex(2.22, 18.09, i + 1), .065)
  }
  solid('edge', 18.02, 18.18, 2.54, 2.54, 'sheet')
  glazingFloor(18.18, 18.96, 2.42, 2.32)
  solid('concrete', 18.96, 19.13, 2.64, 2.28, 'plaster')
  solid('steel', 19.13, 19.42, 1.56, 1.56, 'sheet')
  solid('trim', 19.42, 19.55, 2.03, 2.03, 'sheet')
  solid('edge', 19.55, 19.87, 2.03, .78, 'sheet')
  solid('trim', 19.87, 20.02, .86, .62, 'sheet')

  solid('steel', 20, 21.7, .18, .14, 'sheet')
  solid('trim', 21.7, 22.8, .14, .1, 'sheet')
  solid('steel', 22.8, 24, .1, .045, 'sheet')
  for (const y of [20.7, 21.68, 22.45]) {
    solid('edge', y, y + .07, .29, .29, 'sheet')
  }
  for (const y of [22.06, 22.39]) {
    kit.box('trim', [.14, .2, .16], [.15, y, 0], undefined, 'sheet')
    kit.box('edge', [.14, .2, .16], [-.15, y, 0], undefined, 'sheet')
  }
}
