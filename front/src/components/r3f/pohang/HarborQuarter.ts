import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'
import { roofShell } from '../city/CityDetails'
import { buildHomigotLighthouse } from './HomigotLighthouse'
import { buildAuctionHall, buildColdStore, buildRepairShed, buildCoastalLodging, buildCoastalRow } from './HarborBuildings'
import { harborPoint, placeHarbor } from './Placement'
import { coastHeight } from './CoastalShoulder'

export const HARBOR_PARCELS = [
  { build: buildAuctionHall, x: -24, z: 29, base: .8, yaw: 1, scale: [1.25, 1.1, 1.15] },
  { build: buildCoastalRow, x: -31, z: 3, base: 1, yaw: -.65, scale: [1.1, 1, 1.1] },
  { build: buildColdStore, x: -5, z: -4, base: .6, yaw: -.26, scale: [1.1, 1.1, 1] },
  { build: buildRepairShed, x: 9, z: -17, base: .7, yaw: -.32, scale: [1.1, 1.05, 1] },
  { build: buildCoastalLodging, x: 27, z: -27, base: .8, yaw: .12, scale: [1.15, 1.05, 1.1] },
  { build: buildCoastalRow, x: 41, z: -35, base: 1.4, yaw: .25, scale: [1.1, .95, 1] },
  { build: buildCoastalLodging, x: -43, z: -15, base: 1.9, yaw: -.35, scale: [.9, .85, 1] },
  { build: buildCoastalRow, x: -43, z: -37, base: 3.1, yaw: -.25, scale: [.85, .85, .9] },
  { build: buildColdStore, x: 13, z: -51, base: 3.2, yaw: .12, scale: [.75, .8, .85] },
  { build: buildCoastalRow, x: -2, z: -30, base: 2.8, yaw: .08, scale: [1, .9, .9] },
  { build: buildAuctionHall, x: 37, z: -55, base: 3, yaw: .22, scale: [.8, .8, .8] },
  { build: buildCoastalLodging, x: 2, z: -55, base: 4, yaw: -.18, scale: [.8, .85, .9] },
  { build: buildRepairShed, x: -32, z: -57, base: 3.8, yaw: -.15, scale: [.65, .65, .7] },
  { build: buildCoastalRow, x: 23, z: -75, base: 3.4, yaw: .18, scale: [.85, .85, .9] },
  { build: buildAuctionHall, x: -47, z: -60, base: 3.4, yaw: -.12, scale: [.8, .85, .8] },
  { build: buildCoastalLodging, x: -31, z: -81, base: 3.4, yaw: .14, scale: [.75, .8, .8] },
  { build: buildCoastalRow, x: 5, z: -77, base: 3.4, yaw: -.14, scale: [.85, .95, .9] },
  { build: buildCoastalRow, x: -33, z: -36, base: -1, yaw: -.14, scale: [.65, .65, .75] },
  { build: buildCoastalLodging, x: -12, z: -39, base: -1, yaw: -.12, scale: [.6, .7, .7] },
  { build: buildCoastalRow, x: -18, z: -71, base: -1, yaw: .12, scale: [.7, .75, .8] },
  { build: buildAuctionHall, x: 16, z: -39, base: -1, yaw: .35, scale: [.65, .8, .7] },
] as const

function quay(kit: CityBuilder, portrait: boolean) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-17, 5.15, 53), new THREE.Vector3(-12, 5.1, 30),
    new THREE.Vector3(-8, 5.05, 17), new THREE.Vector3(5, 4.85, -1), new THREE.Vector3(32, 4.6, -17),
  ])
  const count = 78
  for (let i = 0; i < count; i++) {
    // Two flooded breaks keep the quay from closing the district into a display basin.
    if ((i >= 35 && i < 44) || (i >= 65 && i < 71)) continue
    const rawA = curve.getPoint(i / count), rawB = curve.getPoint((i + 1) / count)
    const a = new THREE.Vector3(...harborPoint(rawA.x, rawA.y, rawA.z, portrait))
    const b = new THREE.Vector3(...harborPoint(rawB.x, rawB.y, rawB.z, portrait))
    const mid = a.clone().add(b).multiplyScalar(.5), tangent = b.clone().sub(a)
    placeHarbor(kit, local => {
      local.box('edge', [1.3, 3.4, tangent.length() + .035], [0, mid.y - 1.7, 0], undefined, 'masonry')
      local.box('concrete', [1.48, .16, tangent.length() + .04], [0, mid.y + .03, 0], undefined, 'masonry')
      // The shore-side apron meets the working frontage; the seaward edge stays narrow.
      const apron = i < 35 ? 3.8 : 4.5
      local.box('faded', [apron, .25, tangent.length() + .05], [.65 + apron / 2, mid.y - .1, 0], undefined, 'masonry')
      if (i % 6 === 2) {
        local.box('edge', [.5, 3.8, .5], [apron, mid.y - 1.9, 0], undefined, 'masonry')
        local.box('steel', [.3, .5, .3], [0, mid.y + .34, 0], undefined, 'sheet')
        local.box('edge', [.47, .13, .4], [0, mid.y + .61, 0], undefined, 'sheet')
      }
    }, [mid.x, 0, mid.z], Math.atan2(tangent.x, tangent.z), [portrait ? .75 : 1, 1, 1])
  }
}

function coastalFootway(kit: CityBuilder, portrait: boolean) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-18, 0, -35), new THREE.Vector3(-15, 0, -43),
    new THREE.Vector3(-7, 0, -48), new THREE.Vector3(2, 0, -50),
  ])
  const positions: number[] = [], indices: number[] = []
  for (let i = 0; i <= 48; i++) {
    const p = curve.getPoint(i / 48), tangent = curve.getTangent(i / 48)
    for (const side of [-1, 1]) {
      const x = p.x + tangent.z * side * .8, z = p.z - tangent.x * side * .8
      positions.push(...harborPoint(x, coastHeight(x, z, portrait) + .09, z, portrait))
    }
    if (i < 48) {
      const a = i * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  roofShell(kit, geometry, .18, 'edge', 'masonry')
}

export function buildHarborQuarter(kit: CityBuilder, portrait = false) {
  for (const p of HARBOR_PARCELS) {
    const base = p.z < -45 || p.base === -1 ? coastHeight(p.x, p.z, portrait) - .2 : p.base
    placeHarbor(kit, p.build, harborPoint(p.x, base, p.z, portrait), p.yaw,
      [p.scale[0] * (portrait ? .57 : 1), p.scale[1] * (portrait ? .85 : 1), p.scale[2] * (portrait ? .68 : 1)])
  }
  quay(kit, portrait)
  coastalFootway(kit, portrait)
}

export function buildHarborLandmark(kit: CityBuilder, portrait = false) {
  placeHarbor(kit, buildHomigotLighthouse, harborPoint(-22, 4.8, -33, portrait), .06,
    portrait ? [.83, .85, .83] : [1, 1, 1])
  // A low paved approach belongs to the coastal shoulder, not a tower display plinth.
  placeHarbor(kit, local => {
    local.box('edge', [8, .18, 9], [0, -.03, 0], undefined, 'masonry')
  }, harborPoint(-22, 4.8, -33, portrait), .06, portrait ? [.83, .85, .83] : [1, 1, 1])
}
