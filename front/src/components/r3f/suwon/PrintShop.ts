import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { windowWall } from '../city/CityDetails'
import { placeSuwon } from './SuwonPlacement'

type Point = [number, number, number]
function mass(kit: CityBuilder, finish: CityFinish, size: Point, at: Point) {
  kit.add(finish, new THREE.BoxGeometry(...size, Math.max(1, Math.ceil(size[0] / 1.1)),
    Math.max(1, Math.ceil(size[1] / 1.1)), Math.max(1, Math.ceil(size[2] / 1.1))).translate(...at), 'masonry')
}

export function buildPrintShop(kit: CityBuilder) {
  mass(kit, 'faded', [8.4, 12.3, .5], [0, 6.15, -4.4])
  windowWall(kit, 'faded', [4.2, 0, -.1], 8.6, 12.3, [
    { x: -2.4, y: 9.55, width: 1.45, height: 2.6 },
    { x: 1, y: 9.55, width: 2.5, height: 2.6 },
    { x: -1.5, y: 5.1, width: 1.5, height: 2.05 },
  ], { depth: .5, yaw: Math.PI / 2, seed: 18, surface: 'masonry' })
  mass(kit, 'faded', [.5, 12.3, 8.6], [-4.2, 6.15, -.1])
  // The shopfront is open to a deep room; the upper terrace steps back from it.
  for (const x of [-3.75, 3.75]) mass(kit, 'concrete', [.9, 7.1, .75], [x, 3.55, 3.95])
  mass(kit, 'concrete', [8.4, .68, .8], [0, 6.9, 3.95])
  mass(kit, 'edge', [8.6, .3, 8.9], [0, 3.75, -.1])
  mass(kit, 'edge', [8.6, .3, 8.9], [0, 7.36, -.1])
  mass(kit, 'dark', [7.3, 2.9, .25], [0, 5.25, -3.45])
  mass(kit, 'edge', [.3, 3, 5.2], [1.6, 5.25, -1.6])
  mass(kit, 'paint', [3.2, .23, 1.7], [-1.4, 4.65, -1.45])
  for (const x of [-2.65, -.15]) kit.box('steel', [.14, 1.04, 1.45], [x, 4.06, -1.45])
  for (const x of [-3.25, .5, 3.2]) kit.box('steel', [.1, 2.85, .12], [x, 5.25, 3.63])
  kit.box('steel', [6.6, .12, .2], [0, 6.7, 3.65])
  // One surviving folded shutter has depth and leaves the loading opening clear.
  placeSuwon(kit, [2.53, 5.23, 3.37], -.33, 1, shutter => {
    shutter.box('paint', [1.2, 2.75, .12], [0, 0, 0], undefined, 'timber')
    for (let i = 0; i < 6; i++) shutter.box('edge', [.035, 2.62, .06], [-.5 + i * .18, 0, .065])
  })
  windowWall(kit, 'concrete', [0, 7.53, 1], 8.4, 4.77, [
    { x: -2.2, y: 2.35, width: 1.55, height: 3.25 },
    { x: .6, y: 2.35, width: 2.8, height: 3.25 },
  ], { depth: .45, seed: 11 })
  mass(kit, 'concrete', [8.8, .32, 9.1], [0, 12.48, -.05])
  mass(kit, 'edge', [8.7, .09, 9], [0, 12.69, -.05])
  for (const x of [-4.24, 4.24]) mass(kit, 'faded', [.26, .88, 8.7], [x, 13.17, -.05])
  for (const z of [-4.36, 4.27]) mass(kit, 'faded', [8.7, .88, .26], [0, 13.17, z])
  for (const z of [-4.36, 4.27]) mass(kit, 'edge', [8.85, .13, .36], [0, 13.67, z])
  mass(kit, 'concrete', [.36, 4.6, 2.8], [-4.02, 9.82, 2.35])
  mass(kit, 'concrete', [.36, 4.6, 2.8], [4.02, 9.82, 2.35])
  mass(kit, 'faded', [8.1, .68, .32], [0, 8.02, 4.07])
  kit.box('steel', [.16, 9.4, .16], [3.44, 8.62, 4.4])
  for (const y of [5.3, 9.3, 12.6]) kit.box('edge', [.34, .08, .21], [3.44, y, 4.43])
}
