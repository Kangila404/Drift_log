import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'
import { buildChogaHome, buildRoofHouse, buildCooperativeHall, buildCoastalWorkshop, buildVillageLodging } from './VillageBuildings'
import { jejuGroundHeight } from './SeongsanTerrain'
import { jejuPoint, placeJeju } from './Placement'

export const JEJU_PARCELS = [
  { build: buildChogaHome, x: -24, z: 29, base: 1.7, yaw: .45, scale: [1.35, 1.1, 1.2] },
  { build: buildChogaHome, x: -29, z: 12, base: 1.9, yaw: 1.4, scale: [.7, .95, .9] },
  { build: buildRoofHouse, x: -44, z: 19, base: 1.8, yaw: .08, scale: [1.05, 1, 1] },
  { build: buildRoofHouse, x: 24, z: 17, base: 1.1, yaw: -.4, scale: [1.3, 1.1, 1.2] },
  { build: buildChogaHome, x: 31, z: 1, base: 1.7, yaw: -1.3, scale: [.8, 1, .9] },
  { build: buildCoastalWorkshop, x: 43, z: 17, base: 1, yaw: -.28, scale: [1.15, 1, 1] },
  { build: buildChogaHome, x: -4, z: 16, base: 2.2, yaw: -.22, scale: [1, 1, 1] },
  { build: buildCoastalWorkshop, x: -21, z: -12, base: 2.1, yaw: .55, scale: [.7, .85, .9] },
  { build: buildCooperativeHall, x: -4, z: -27, base: 2.4, yaw: .12, scale: [1, .94, 1] },
  { build: buildVillageLodging, x: 18, z: -17, base: 1.4, yaw: -.1, scale: [1, 1, 1] },
  { build: buildRoofHouse, x: -37, z: -8, base: 2, yaw: .26, scale: [.95, .95, .95] },
  { build: buildChogaHome, x: -49, z: -19, base: 2.8, yaw: -.12, scale: [.9, .95, .9] },
  { build: buildVillageLodging, x: -26, z: -31, base: 2.7, yaw: .12, scale: [.9, .9, .95] },
  { build: buildRoofHouse, x: -10, z: -39, base: 'terrain', yaw: .15, scale: [.95, 1, 1] },
  { build: buildChogaHome, x: -40, z: -41, base: 'terrain', yaw: -.15, scale: [.95, .9, .9] },
  { build: buildCoastalWorkshop, x: 37, z: -17, base: 2.5, yaw: -.12, scale: [.9, .9, .9] },
  { build: buildChogaHome, x: 23, z: -34, base: 'terrain', yaw: -.2, scale: [.85, .9, .9] },
  { build: buildRoofHouse, x: 43, z: -36, base: 'terrain', yaw: -.25, scale: [.85, .85, .9] },
  { build: buildCoastalWorkshop, x: -55, z: -40, base: 'terrain', yaw: .18, scale: [.7, .75, .85] },
  { build: buildChogaHome, x: 53, z: -9, base: 2.4, yaw: -.24, scale: [.85, .95, .9] },
] as const

// Disconnected runs are intentional gates into flooded private courts and olle lanes.
export const COURT_WALLS: readonly (readonly [number, number, number, number, number])[] = [
  [-35, 38, -18, 38, 5.65], [-14, 38, -13, 18, 5.55], [-35, 38, -36, 7, 5.45],
  [-34, 5, -19, 5, 5.35], [-19, 5, -17, 16, 5.4],
  [13, 27, 35, 27, 5.5], [12, 27, 11, 15, 5.35], [11, 10, 12, -5, 5.2], [35, 27, 39, 0, 5.35],
  [-12, 25, -2, 25, 5.35], [3, 25, 6, 8, 5.3], [-12, 25, -13, 7, 5.3],
  [-12, 6, -3, 7, 5.35], [-1, 6, 0, -8, 5.3], [-20, -6, -14, -10, 5.2],
  [-2, -14, 10, -14, 5.25], [14, -13, 28, -11, 5.2], [29, -10, 31, -21, 5.3],
  [-48, -1, -33, 0, 5.2], [-33, 0, -31, -15, 5.35], [-27, -17, -13, -20, 5.55],
  [42, 6, 55, 2, 5.3], [42, -24, 52, -26, 5.45],
]

function courtWall(kit: CityBuilder, line: typeof COURT_WALLS[number], portrait: boolean, seed: number) {
  const [x1, z1, x2, z2, top] = line, length = Math.hypot(x2 - x1, z2 - z1)
  const segments = Math.ceil(length / 1.3), positions: number[] = [], indices: number[] = []
  const nx = (z2 - z1) / length, nz = -(x2 - x1) / length
  for (let i = 0; i <= segments; i++) {
    const t = i / segments, x = THREE.MathUtils.lerp(x1, x2, t), z = THREE.MathUtils.lerp(z1, z2, t)
    const crest = top + .065 * Math.sin(i * 1.7 + seed) + .04 * Math.cos(i * .8 + seed * 2)
    const width = .38 + .025 * Math.sin(i + seed)
    for (const [side, y] of [[-1, .6], [-1, crest], [1, crest], [1, .6]]) {
      positions.push(...jejuPoint(x + nx * side * width, y, z + nz * side * width, portrait))
    }
    if (i < segments) for (let face = 0; face < 4; face++) {
      const a = i * 4 + face, b = i * 4 + (face + 1) % 4
      indices.push(a, b, a + 4, b, b + 4, a + 4)
    }
  }
  indices.push(0, 3, 1, 1, 3, 2)
  const end = segments * 4
  indices.push(end, end + 1, end + 3, end + 1, end + 2, end + 3)
  for (let i = 0; i < indices.length; i += 3) [indices[i + 1], indices[i + 2]] = [indices[i + 2], indices[i + 1]]
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  kit.add('edge', geometry, 'masonry')
}

export function buildJejuCourts(kit: CityBuilder, portrait = false) {
  COURT_WALLS.forEach((wall, i) => courtWall(kit, wall, portrait, i))
}

export function buildJejuVillage(kit: CityBuilder, portrait = false) {
  for (const parcel of JEJU_PARCELS) {
    const ground = jejuGroundHeight(parcel.x, parcel.z)
    const base = parcel.base === 'terrain' ? Math.max(2.5, ground - .25) : parcel.base
    placeJeju(kit, parcel.build, jejuPoint(parcel.x, base, parcel.z, portrait), parcel.yaw,
      [parcel.scale[0] * (portrait ? .62 : 1), parcel.scale[1] * (portrait ? .85 : 1), parcel.scale[2] * (portrait ? .74 : 1)])
  }
  buildJejuCourts(kit, portrait)
}
