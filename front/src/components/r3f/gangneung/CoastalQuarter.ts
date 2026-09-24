import * as THREE from 'three'
import type { CityBuilder, CityFinish } from '../city/CityGeometry'
import { windowWall } from '../city/CityDetails'
import { placeGangneung as place } from './GangneungPlacement'
import { buildCoastalPension } from './CoastalPension'
import { buildCoastalCafe } from './CoastalCafe'

type Point = [number, number, number]

function mass(kit: CityBuilder, finish: CityFinish, size: Point, at: Point) {
  kit.add(finish, new THREE.BoxGeometry(...size,
    Math.max(1, Math.ceil(size[0] / 1.4)), Math.max(1, Math.ceil(size[1] / 1.2)), Math.max(1, Math.ceil(size[2] / 1.4)))
    .translate(...at), 'plaster')
}

export function buildCoastalResidence(kit: CityBuilder) {
  // The bent plan joins an occupied upper house to a lower roof terrace.
  mass(kit, 'concrete', [10, 10.7, .45], [-2, 6.35, -3.8])
  mass(kit, 'concrete', [.45, 10.7, 8], [-7, 6.35, .1])
  windowWall(kit, 'concrete', [-2, 1, 4], 10, 10.7, [
    { x: -2.7, y: 2.1, width: 1.6, height: 2.35, broken: true },
    { x: 1.4, y: 2.1, width: 2.5, height: 2.35 },
    { x: -2.7, y: 5.1, width: 1.6, height: 2.1 },
    { x: 1.4, y: 5.1, width: 2.5, height: 2.1 },
    { x: -2.5, y: 9.15, width: 2.1, height: 2.2 },
    { x: 1.6, y: 9.15, width: 2.5, height: 2.2 },
  ], { depth: .48, seed: 5 })
  windowWall(kit, 'concrete', [3, 1, .1], 8, 10.7, [
    { x: 0, y: 8.15, width: 1.5, height: 2.5 },
    { x: 1.8, y: 4.9, width: 1.7, height: 1.9 },
  ], { depth: .42, yaw: Math.PI / 2, seed: 3 })
  for (const y of [4.6, 7.8, 11.85]) mass(kit, 'edge', [10.6, .27, 8.7], [-2, y, .1])
  mass(kit, 'faded', [10.3, .09, 8.4], [-2, 12.04, .1])
  // One deep upper loggia gives this wing a distinct, sheltered end to the lane.
  mass(kit, 'concrete', [8.4, .28, 2.3], [-2.2, 7.85, 4.7])
  mass(kit, 'concrete', [8.4, .22, 2.6], [-2.2, 11.83, 4.9])
  for (const x of [-6.15, 1.75]) mass(kit, 'concrete', [.36, 3.75, 1.9], [x, 9.85, 4.8])
  mass(kit, 'faded', [8.25, .66, .3], [-2.2, 8.31, 5.75])

  mass(kit, 'faded', [6.1, 6.6, .4], [6, 4.4, -1.2])
  mass(kit, 'faded', [.45, 6.6, 6.4], [8.85, 4.4, 1.8])
  windowWall(kit, 'faded', [6, 1.1, 5], 5.6, 6.6, [
    { x: -1.3, y: 2.8, width: 1.6, height: 2.1 },
    { x: 1.3, y: 4.9, width: 1.5, height: 1.7 },
  ], { depth: .4, seed: 8 })
  mass(kit, 'concrete', [6.6, .28, 6.9], [6, 7.78, 1.9])
  mass(kit, 'edge', [6.45, .07, 6.75], [6, 7.98, 1.9])
  mass(kit, 'faded', [6.2, .65, .28], [6, 8.3, 5.25])
  mass(kit, 'faded', [6.2, .65, .28], [6, 8.3, -1.43])
  // An external stair reaches the lower roof; the upper house opens onto that roof.
  for (let i = 0; i < 12; i++) {
    const y = 4.55 + i * .3
    mass(kit, 'concrete', [2.5, y - 1.5, .46], [10.35, (y + 1.5) / 2, 5.4 - i * .45])
  }
  mass(kit, 'concrete', [3, .22, 1.4], [10.1, 7.85, -.3])
  kit.beam('steel', [11.63, 5.43, 5.5], [11.63, 8.76, .3], .065)
  for (const i of [0, 4, 8, 11]) {
    kit.box('steel', [.06, .88, .06], [11.63, 4.99 + i * .3, 5.4 - i * .45])
  }
  mass(kit, 'concrete', [3, 1.1, 2.4], [-4, 12.65, -1.8])
  kit.box('steel', [1.9, .7, .06], [-4, 12.65, -.55])
  for (let i = 0; i < 4; i++) kit.box('edge', [1.95, .045, .12], [-4, 12.38 + i * .18, -.5])
  kit.box('steel', [.13, 7.3, .15], [-6.63, 7.45, 4.23])
}

function laneRemnants(kit: CityBuilder, portrait: boolean) {
  // The last landing of the hill lane remains above the drowned lower approach.
  for (let i = 0; i < 5; i++) {
    const top = 3.82 + i * .25
    mass(kit, 'concrete', [3.2, top - 2.4, .7], [portrait ? 3.4 : 13.3, (top + 2.4) / 2, (portrait ? -2 : -7) - i * .65])
  }
  mass(kit, 'edge', [3.7, 2.42, 1.8], [portrait ? 3.4 : 13.3, 3.61, portrait ? -5.7 : -10.7])
}

export function buildGangneungQuarter(kit: CityBuilder, portrait = false) {
  if (portrait) {
    place(kit, [-8.6, 1.2, -.5], -.2, .6, buildCoastalPension)
    place(kit, [1.8, 1.25, 16], .15, .65, buildCoastalCafe)
    place(kit, [8.4, 1.4, -1], -.32, .5, buildCoastalResidence)
  } else {
    place(kit, [-27, 0, 0], -.22, 1, buildCoastalPension)
    place(kit, [11, 0, 16], .13, 1, buildCoastalCafe)
    place(kit, [28.5, 0, -2], -.4, .85, buildCoastalResidence)
  }
  laneRemnants(kit, portrait)
}
