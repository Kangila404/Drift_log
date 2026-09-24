import * as THREE from 'three'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import type { CityBuilder, CityGeometryBatch } from '../city/CityGeometry'
import { SUWON_PARCELS, parcelHalfSize, type Parcel } from './ParcelPlan'
import { addSuwonTerrainSurface } from './SuwonSurfaces'

const noise = new ImprovedNoise()
const bell = (v: number) => Math.exp(-v * v)
export const terrainWidth = (portrait: boolean) => portrait ? .5 : 1

// A compressed fictional Paldalsan foothill: branching shoulders and an eastern
// lowland, not a measured elevation map or a set of detached decorative hills.
function naturalHeight(x: number, z: number) {
  const bend = noise.noise(x * .025, z * .018, 9) * 17
  const spine = 24 * bell((x + 72) / 71) * bell((z + 99 + bend) / 28)
  const shoulder = 12 * bell((x + 49 + (z + 40) * .36) / 31) * bell((z + 44) / 35)
  const west = 9 * bell((x + 125) / 45) * bell((z + 63) / 26)
  const lowland = 6 * bell((x + 2) / 68) * bell((z + 77) / 39)
  const valley = 4 * bell((x + 10 - (z + 70) * .24) / 11) * bell((z + 62) / 29)
  const broad = spine + shoulder + west + lowland - valley
  const ribs = noise.noise(x * .066, z * .083, 6.1) * 5.2
    + noise.noise(x * .14, z * .17, 2.3) * 1.8 + noise.noise(x * .31, z * .28, 11) * .65
  return -2.2 + broad * .82 + ribs * Math.min(1, Math.max(0, broad) / 8)
}

export const parcelGround = (parcel: Parcel) => Math.max(naturalHeight(parcel.x, parcel.z) - .3, .2)

export function terrainHeight(x: number, z: number, portrait = false) {
  const sx = terrainWidth(portrait), size = portrait ? .67 : 1
  let y = naturalHeight(x / sx, z)
  // Local level courtyards join the slope; the surrounding ridge is never terraced globally.
  for (const parcel of SUWON_PARCELS) {
    if (!parcel.uphill) continue
    const dx = x - parcel.x * sx, dz = z - parcel.z
    const c = Math.cos(parcel.yaw), s = Math.sin(parcel.yaw)
    const [hx, hz] = parcelHalfSize(parcel.kind).map(v => v * parcel.scale * size)
    const edge = Math.max(Math.abs(c * dx - s * dz) - hx, Math.abs(s * dx + c * dz) - hz)
    const blend = 1 - THREE.MathUtils.smoothstep(edge, 0, 8 * size)
    y = THREE.MathUtils.lerp(y, parcelGround(parcel) - .18, blend)
  }
  return y
}

function surface(kit: CityBuilder, portrait: boolean, distant: boolean) {
  const width = distant ? 420 : 300, depth = distant ? 145 : 170
  const columns = distant ? 100 : 120, rows = distant ? 36 : 68
  const back = distant ? -275 : -145, scaleX = terrainWidth(portrait)
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  for (let j = 0; j <= rows; j++) {
    const z = back + j / rows * depth
    for (let i = 0; i <= columns; i++) {
      const x = (i / columns - .5) * width
      let y: number
      if (distant) {
        const ridge = z + 190 + noise.noise(x * .018, 2, 8) * 24
        y = -3 + (18 + noise.noise(x * .031, 4, 19) * 13) * bell(ridge / 27)
          + noise.noise(x * .08, z * .072, 22) * 4 + noise.noise(x * .18, z * .15, 3) * 1.2
      } else y = terrainHeight(x * scaleX, z, portrait)
      positions.push(x * scaleX, y, z)
      const grain = noise.noise(x * .36, z * .29, 4) * .13
      const fold = noise.noise(x * .065, z * .083, 12) * .23
      const drainage = noise.noise(x * .11, z * .023, 7) * .12
      const shade = THREE.MathUtils.clamp(.8 + grain + fold + drainage, .48, .98)
      const mineral = THREE.MathUtils.smoothstep(y, 14, 26) * .06
      colors.push(shade - mineral, shade, shade + .035)
    }
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const a = j * (columns + 1) + i, b = a + 1, c = a + columns + 1, d = c + 1
    if (Math.max(...[a, b, c, d].map(v => positions[v * 3 + 1])) < 3.3) continue
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  kit.add(distant ? 'faded' : 'concrete', geometry, 'foliage')
}

export function buildSuwonTerrain(kit: CityBuilder, portrait = false) {
  surface(kit, portrait, true)
  surface(kit, portrait, false)
}

export function prepareSuwonTerrain(batches: CityGeometryBatch[]) {
  for (const { material } of batches) material.vertexColors = true
  addSuwonTerrainSurface(batches)
}

function wallSpan(kit: CityBuilder, a: THREE.Vector3, b: THREE.Vector3, bottomA: number, bottomB: number, thickness: number) {
  const axis = b.clone().sub(a); axis.y = 0
  const side = new THREE.Vector3(axis.z, 0, -axis.x).normalize().multiplyScalar(thickness / 2)
  const points = [a.clone().add(side), a.clone().sub(side), b.clone().add(side), b.clone().sub(side)]
  const p = points.flatMap(v => v.toArray())
  points.forEach((v, i) => p.push(v.x, i < 2 ? bottomA : bottomB, v.z))
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  g.setIndex([0, 1, 2, 2, 1, 3, 0, 2, 4, 4, 2, 6, 1, 5, 3, 3, 5, 7, 0, 4, 1, 1, 4, 5, 2, 3, 6, 6, 3, 7])
  g.computeVertexNormals()
  kit.add('faded', g, 'masonry')
}

export function buildSuwonConnections(kit: CityBuilder, portrait = false) {
  const sx = terrainWidth(portrait)
  // A low wall contours the foothill rather than drawing a ramp across its skyline.
  const path = [[2, -43], [-7, -45], [-16, -42], [-24, -40]]
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, az] = path[i], [bx, bz] = path[i + 1]
    const length = Math.hypot(bx - ax, bz - az), steps = Math.ceil(length / 2.2)
    for (let j = 0; j < steps; j++) {
      const u = j / steps, v = (j + 1) / steps
      const x1 = THREE.MathUtils.lerp(ax, bx, u) * sx, z1 = THREE.MathUtils.lerp(az, bz, u)
      const x2 = THREE.MathUtils.lerp(ax, bx, v) * sx, z2 = THREE.MathUtils.lerp(az, bz, v)
      const y1 = Math.max(terrainHeight(x1, z1, portrait), 2), y2 = Math.max(terrainHeight(x2, z2, portrait), 2)
      wallSpan(kit, new THREE.Vector3(x1, y1 + 1.8, z1), new THREE.Vector3(x2, y2 + 1.8, z2), y1 - .5, y2 - .5, .85)
      kit.beam('edge', [x1, y1 + 1.87, z1], [x2, y2 + 1.87, z2], .15, 1, 'masonry')
      if (j % 2 === 0) kit.box('faded', [1 * sx, .48, .7], [(x1 + x2) / 2, (y1 + y2) / 2 + 2.05, (z1 + z2) / 2], undefined, 'masonry')
    }
  }
  // Short shared parcel walls articulate the side lanes without making islands.
  for (const [x, z, length, yaw] of [[-26, -16, 10, -.12], [-13, -34, 8, .18], [28, -24, 9, -.12]]) {
    const ground = Math.max(terrainHeight(x * sx, z, portrait), .2)
    const top = Math.max(4.8, ground + 1.5)
    kit.box('faded', [length * sx, top - ground + .3, .38], [x * sx, (ground + top) / 2 - .15, z], [0, yaw, 0], 'masonry')
    kit.box('edge', [length * sx + .1, .16, .5], [x * sx, top + .05, z], [0, yaw, 0], 'masonry')
  }
  const lane = [[-29, -35], [-32, -39], [-27, -40], [-25, -41]]
  for (let i = 0; i < lane.length - 1; i++) {
    const [ax, az] = lane[i], [bx, bz] = lane[i + 1]
    const count = Math.ceil(Math.hypot(bx - ax, bz - az) / .5)
    const yaw = Math.atan2((bx - ax) * sx, bz - az)
    for (let j = 0; j <= count; j++) {
      const t = j / count, x = THREE.MathUtils.lerp(ax, bx, t) * sx, z = THREE.MathUtils.lerp(az, bz, t)
      const y = terrainHeight(x, z, portrait)
      kit.box('faded', [1.5 * (portrait ? .67 : 1), .25, .68], [x, y + .04, z], [0, yaw, 0], 'masonry')
    }
  }
}
