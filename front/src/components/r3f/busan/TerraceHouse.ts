import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { windowWall } from '../city/CityDetails'

type Point = [number, number, number]
function mass(kit: CityBuilder, finish: CityFinish, size: Point, at: Point) {
  kit.add(finish, new THREE.BoxGeometry(...size, Math.max(1, Math.ceil(size[0])),
    Math.max(1, Math.ceil(size[1])), Math.max(1, Math.ceil(size[2]))).translate(...at), 'plaster')
}

export function buildTerraceHouse(kit: CityBuilder) {
  windowWall(kit, 'faded', [0, 0, 4], 13, 9.8, [
    { x: -3.8, y: 3.1, width: 2.7, height: 2.1 },
    { x: .1, y: 3.1, width: 2.4, height: 2.1, broken: true },
    { x: 4, y: 3.1, width: 1.5, height: 2.1 },
    { x: -3.8, y: 7.3, width: 2.5, height: 2.7 },
    { x: .2, y: 7.3, width: 2.8, height: 2.7 },
    { x: 4.1, y: 7.3, width: 1.4, height: 2.7 },
  ], { depth: .48, seed: 13 })
  windowWall(kit, 'faded', [6.5, 0, -.3], 8.6, 9.8, [
    { x: -.4, y: 7.2, width: 2.2, height: 2.4 },
    { x: -2.7, y: 3.2, width: 1.3, height: 2.1 },
  ], { yaw: Math.PI / 2, depth: .44, seed: 9 })
  mass(kit, 'faded', [.4, 9.8, 8.6], [-6.5, 4.9, -.3])
  mass(kit, 'faded', [13, 9.8, .4], [0, 4.9, -4.6])
  for (const y of [5.05, 9.93]) mass(kit, 'edge', [13.7, .25, 9.3], [0, y, -.2])
  // Set-back roof rooms create a sheltered terrace instead of another repeated floor.
  windowWall(kit, 'concrete', [-1.6, 10.06, -.4], 8.8, 3.55, [
    { x: -2.4, y: 1.85, width: 1.6, height: 2.4 },
    { x: .8, y: 1.85, width: 2.5, height: 2.4 },
  ], { depth: .38, seed: 2 })
  mass(kit, 'concrete', [.4, 3.6, 4.3], [-6, 11.85, -2.4])
  mass(kit, 'concrete', [.4, 3.6, 4.3], [2.8, 11.85, -2.4])
  mass(kit, 'concrete', [9.2, 3.6, .4], [-1.6, 11.85, -4.55])
  mass(kit, 'steel', [10.1, .21, 8.7], [-1.4, 13.75, -.2])
  mass(kit, 'edge', [10.35, .16, .32], [-1.4, 13.7, 4.05])
  for (const x of [-6.25, 3.4]) mass(kit, 'concrete', [.27, 3.5, .27], [x, 11.8, 3.8])
  mass(kit, 'faded', [9.9, .65, .3], [-1.4, 10.48, 4.1])
  for (const x of [-6.25, 3.4]) mass(kit, 'faded', [.25, .65, 3.8], [x, 10.48, 2.1])
  // A solid street stair climbs alongside the house and returns onto its terrace.
  for (let i = 0; i < 16; i++) {
    const top = 4.65 + i * .34
    mass(kit, 'concrete', [2.1, top - 1.5, .51], [7.78, (top + 1.5) / 2, 5 - i * .5])
  }
  mass(kit, 'concrete', [3, .27, 2.4], [7.2, 9.88, -3.2])
  kit.beam('steel', [8.86, 5.5, 5.1], [8.86, 10.6, -2.4], .075)
  for (const i of [0, 5, 10, 15]) kit.box('steel', [.06, .85, .06], [8.86, 5.08 + i * .34, 5 - i * .5])
  mass(kit, 'concrete', [1.9, 1.2, 2.1], [-3.2, 14.38, -2.8])
  kit.box('steel', [1.35, .65, .045], [-3.2, 14.45, -1.73])
  for (let i = 0; i < 4; i++) kit.box('edge', [1.4, .045, .1], [-3.2, 14.2 + i * .16, -1.7])
  kit.box('steel', [.14, 8.3, .14], [-6.2, 8.6, 4.15])
}
