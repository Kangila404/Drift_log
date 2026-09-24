import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'
import { roofShell, windowWall } from '../city/CityDetails'

export function buildWaterfrontWorkshop(kit: CityBuilder) {
  const width = 13.2, half = width / 2
  kit.box('edge', [width, .3, 12], [0, 3.1, 0], undefined, 'masonry')
  kit.box('faded', [width, 6.9, .4], [0, 3.45, -5.8], undefined, 'plaster')
  for (const side of [-1, 1]) {
    windowWall(kit, 'faded', [side * half, 0, 0], 12, 6.9, [
      { x: -3, y: 5.05, width: 2.3, height: 1.75 },
      { x: 1.7, y: 5.05, width: 2.6, height: 1.75 },
    ], { yaw: side * Math.PI / 2, depth: .36, seed: 21 })
  }
  kit.box('concrete', [3.2, 6.9, .5], [-5, 3.45, 5.75], undefined, 'plaster')
  windowWall(kit, 'concrete', [4.3, 0, 6], 4.6, 6.9, [
    { x: .45, y: 5, width: 2, height: 1.8 },
  ], { depth: .5, seed: 3 })
  kit.box('edge', [5.7, .4, .65], [-.75, 6.7, 5.7], undefined, 'masonry')
  for (const x of [-3.4, 2]) kit.box('steel', [.16, 3.35, .4], [x, 4.88, 5.7])
  kit.box('dark', [8.7, 3.8, .25], [-1, 5.1, -5.42])
  kit.box('edge', [.25, 3.6, 7.2], [3.4, 5, -.7], undefined, 'plaster')
  kit.box('concrete', [5.2, .24, 1.7], [-1, 4.5, -2.4], undefined, 'masonry')
  for (const x of [-3.1, 1.1]) kit.box('steel', [.2, 1.25, 1.35], [x, 3.76, -2.4])
  // Two unequal north-light bays break the roof mass without a row of tiny gables.
  for (const [back, front, high] of [[-6.35, -.2, 9.1], [-.2, 6.45, 8.4]]) {
    const roof = new THREE.PlaneGeometry(width + .9, front - back, 26, 14)
    const p = roof.getAttribute('position')
    for (let i = 0; i < p.count; i++) {
      const t = .5 - p.getY(i) / (front - back)
      p.setXYZ(i, p.getX(i), high + (6.95 - high) * t, back + (front - back) * t)
    }
    roofShell(kit, roof, .2, 'steel', 'sheet')
    for (const side of [-1, 1]) {
      const triangle = new THREE.Shape([
        new THREE.Vector2(back, 6.9), new THREE.Vector2(front, 6.9), new THREE.Vector2(back, high - .2),
      ])
      kit.add('faded', new THREE.ExtrudeGeometry(triangle, { depth: .28, bevelEnabled: false })
        .rotateY(-Math.PI / 2).translate(side * half, 0, 0), 'plaster')
    }
    windowWall(kit, 'edge', [0, 6.93, back + .15], width, high - 6.9, [
      { x: -4.2, y: (high - 6.9) / 2, width: 3.4, height: (high - 6.9) * .55 },
      { x: 0, y: (high - 6.9) / 2, width: 3.4, height: (high - 6.9) * .55 },
      { x: 4.2, y: (high - 6.9) / 2, width: 3.4, height: (high - 6.9) * .55 },
    ], { depth: .14, yaw: Math.PI, surface: 'sheet', seed: 7 })
    for (const x of [-6.82, 6.82]) kit.beam('edge', [x, high, back], [x, 6.94, front], .14, .16, 'sheet')
    for (let x = -5.5; x < 6; x += 1.38) kit.beam('steel', [x, high + .015, back + .08], [x, 6.98, front - .08], .045, .06, 'sheet')
    kit.box('edge', [width + .9, .14, .2], [0, high, back], undefined, 'sheet')
    kit.box('edge', [width + .9, .14, .2], [0, 6.92, front], undefined, 'sheet')
    kit.beam('steel', [-6.1, 6.45, front - .3], [6.1, 6.45, front - .3], .17)
  }
  kit.box('steel', [.17, 4.3, .17], [-6.38, 4.8, 6.15])
  kit.box('edge', [5.9, .2, 1.45], [-.75, 3.36, 6.25], undefined, 'masonry')
}
