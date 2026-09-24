import * as THREE from 'three'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import type { CityBuilder, CityGeometryBatch } from '../city/CityGeometry'
import { jejuPoint } from './Placement'

const columns = 128
const rows = 106
const stride = columns + 1
const minX = -90
const maxX = 90
const minZ = -114
const maxZ = 64
const bell = (value: number) => Math.exp(-value * value)
const smooth = THREE.MathUtils.smoothstep
const mix = THREE.MathUtils.lerp
const noise = new ImprovedNoise()

type Profile = readonly (readonly [number, number])[]

// Independent x/z sections: west oblique buttress, interrupted central recess,
// then a shorter eastern wall whose foot stays close to its upper face.
const frontSections: readonly { level: number; edge: Profile }[] = [
  { level: 1, edge: [[-18, -75], [-12, -68], [-5, -63], [2, -64], [8, -59], [13, -60], [18, -66], [24, -64], [30, -58], [35, -57], [39, -64], [45, -65], [51, -64], [57, -72]] },
  { level: .78, edge: [[-18, -72], [-12, -64], [-7, -60], [0, -58], [6, -55], [12, -55.5], [17, -62], [22, -61], [28, -53], [34, -53], [39, -61], [45, -62], [52, -61], [57, -69]] },
  { level: .5, edge: [[-18, -70], [-11, -60], [-4, -56], [3, -53], [9, -52], [13, -53], [17, -60], [22, -59.5], [27, -50], [32, -50.5], [38, -58], [44, -61], [52, -60], [57, -68]] },
  { level: .2, edge: [[-18, -68], [-11, -56], [-4, -52], [3, -48], [9, -48.5], [14, -50], [19, -54], [24, -54], [29, -48], [34, -49], [39, -56], [45, -59.6], [52, -59.6], [57, -67]] },
  { level: 0, edge: [[-18, -65], [-11, -52], [-4, -47], [3, -44], [9, -44.5], [14, -47], [20, -48], [25, -49], [30, -46], [35, -48], [40, -54], [45, -59.2], [52, -59.2], [57, -66]] },
]
const crestHeights: Profile = [[-18, 18], [-12, 22], [-6, 23.7], [0, 23.2], [6, 24], [12, 21], [20, 22.1], [25, 20.6], [31, 21.4], [38, 19.8], [45, 20.5], [51, 19], [57, 16]]
const rearEdge: Profile = [[-18, -76], [-12, -86], [0, -95], [18, -99], [34, -95], [46, -87], [54, -76], [58, -72]]

function profileAt(profile: Profile, x: number) {
  if (x <= profile[0][0]) return profile[0][1]
  for (let i = 1; i < profile.length; i++) {
    const [right, end] = profile[i], [left, start] = profile[i - 1]
    if (x <= right) return mix(start, end, (x - left) / (right - left))
  }
  return profile[profile.length - 1][1]
}

function landHeight(x: number, z: number) {
  const lowland = bell((x + 5) / 67) * bell((z + 9) / 62)
  const rise = smooth(-z, 30, 53)
  const base = -1.8 + lowland * (4 + 3.7 * rise)
  const approachAxis = -58 - (x + 25) * .08
  const shoulder = 9.3 * smooth(x, -86, -68) * (1 - smooth(x, -7, 7))
    * bell((z - approachAxis) / 17)
  const shoulderGully = .75 * bell((x + 31) / 17)
    * bell((z + 48 - (x + 31) * .19) / 4.5)
  const shoulderRelief = (noise.noise(x * .085, z * .12, 3.2) * .65
    + noise.noise(x * .24, z * .19, 8.1) * .18) * smooth(shoulder, 1, 7)
  const ground = base + shoulder - shoulderGully + shoulderRelief

  const side = smooth(x, -21, -13) * (1 - smooth(x, 51, 56))
  if (side === 0) return ground
  const back = profileAt(rearEdge, x)
  const rear = smooth(z, back - 4, back)
  if (rear === 0) return ground
  const crestZ = profileAt(frontSections[0].edge, x)
  let innerZ = crestZ, innerLevel = 1, cliff = z <= crestZ ? 1 : 0
  for (let i = 1; i < frontSections.length; i++) {
    const section = frontSections[i]
    const outerZ = Math.max(innerZ + .3, profileAt(section.edge, x))
    if (z > innerZ && z <= outerZ) {
      cliff = mix(innerLevel, section.level, (z - innerZ) / (outerZ - innerZ))
      break
    }
    innerZ = outerZ
    innerLevel = section.level
  }
  if (cliff === 0) return ground

  const crest = profileAt(crestHeights, x) + noise.noise(x * .38, z * .31, 13.2) * .45
  const basinRise = Math.max(smooth(z, crestZ - 12, crestZ),
    1 - smooth(z, back, back + 9), 1 - smooth(Math.min(x + 15, 54 - x), 0, 12))
  const basinFloor = 17.6 + .35 * Math.tanh((x - 24) / 12)
    + .2 * noise.noise(x * .08, z * .10, 7.1)
  const summit = mix(basinFloor, crest, basinRise)
  const faceRelief = (noise.noise(x * .23, z * .19, 6.4) * .55
    + noise.noise(x * .61, z * .47, 2.8) * .15) * 4 * cliff * (1 - cliff)
  return mix(ground, summit, cliff * side * rear) + faceRelief * side * rear
}

function xAt(column: number) {
  if (column <= 6) return minX + column * (26 / 6)
  if (column <= 26) return -64 + (column - 6) * (46 / 20)
  if (column <= 122) return -18 + (column - 26) * (80 / 96)
  return 62 + (column - 122) * (28 / 6)
}

function zAt(row: number) {
  if (row <= 5) return minZ + row * (13 / 5)
  if (row <= 85) return -101 + (row - 5) * .75
  return -41 + (row - 85) * 5
}

const xs = Float32Array.from({ length: stride }, (_, i) => xAt(i))
const zs = Float32Array.from({ length: rows + 1 }, (_, j) => zAt(j))
let heights: Float32Array | undefined

function heightGrid() {
  if (!heights) {
    heights = new Float32Array(stride * (rows + 1))
    for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
      heights[j * stride + i] = landHeight(xs[i], zs[j])
    }
  }
  return heights
}

function interval(axis: Float32Array, value: number) {
  let low = 0, high = axis.length - 1
  while (high - low > 1) {
    const mid = (low + high) >>> 1
    if (axis[mid] <= value) low = mid
    else high = mid
  }
  return low
}

/** Canonical ground height, interpolated on the same diagonal as the terrain mesh. */
export function jejuGroundHeight(x: number, z: number) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) throw new RangeError('Jeju ground coordinates must be finite')
  if (x < minX || x > maxX || z < minZ || z > maxZ) {
    throw new RangeError('Jeju ground coordinates are outside the terrain')
  }
  const i = interval(xs, x), j = interval(zs, z)
  const tx = (x - xs[i]) / (xs[i + 1] - xs[i])
  const tz = (z - zs[j]) / (zs[j + 1] - zs[j])
  const grid = heightGrid(), a = j * stride + i, b = a + 1, c = a + stride, d = c + 1
  return tx + tz <= 1
    ? grid[a] + tx * (grid[b] - grid[a]) + tz * (grid[c] - grid[a])
    : grid[d] + (1 - tx) * (grid[c] - grid[d]) + (1 - tz) * (grid[b] - grid[d])
}

export function buildSeongsanTerrain(kit: CityBuilder, portrait = false) {
  const grid = heightGrid()
  const positions = new Float32Array(grid.length * 3)
  const colors = new Float32Array(grid.length * 3)
  const indices: number[] = []
  const grass = new THREE.Color('#485e59')
  const cliff = new THREE.Color('#64747e')
  const damp = new THREE.Color('#3a5059')
  const color = new THREE.Color()
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= columns; i++) {
    const k = j * stride + i, x = xs[i], z = zs[j], y = grid[k]
    positions.set(jejuPoint(x, y, z, portrait), k * 3)
    const left = Math.max(i - 1, 0), right = Math.min(i + 1, columns)
    const back = Math.max(j - 1, 0), ahead = Math.min(j + 1, rows)
    const dx = (grid[j * stride + right] - grid[j * stride + left]) / (xs[right] - xs[left])
    const dz = (grid[ahead * stride + i] - grid[back * stride + i]) / (zs[ahead] - zs[back])
    const rock = smooth(Math.hypot(dx, dz), .48, 1.8)
    color.copy(grass).lerp(cliff, rock)
    color.lerp(damp, (1 - smooth(y, 3.2, 7)) * .55)
    const mineral = .96 + noise.noise(x * .16, z * .12, 5.9) * .19
      + noise.noise(x * .48, z * .41, 11.6) * .07
    color.multiplyScalar(mineral)
    colors.set([color.r, color.g, color.b], k * 3)
  }
  for (let j = 0; j < rows; j++) for (let i = 0; i < columns; i++) {
    const a = j * stride + i, b = a + 1, c = a + stride, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  kit.add('faded', geometry, 'generic')
}

export function prepareSeongsanTerrain(batches: CityGeometryBatch[]) {
  for (const { material } of batches) {
    material.vertexColors = true
    material.color.set('#ffffff')
    material.roughness = 1
    material.metalness = 0
    material.needsUpdate = true
  }
}
