import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { CityBuilder } from '../city/CityGeometry'

export const COASTAL_RIDGES_BOUNDS = {
  minX: -160, maxX: 160, minY: -4, maxY: 29,
  minZ: -220, maxZ: -115,
} as const

export const COASTAL_RIDGES_TRIANGLES = 4248

type CrestPoint = readonly [x: number, height: number, depth: number]
type Gully = readonly [x: number, width: number, bend: number, depth: number]
type Ridge = {
  name: string
  back: number
  front: number
  rows: number
  crest: readonly CrestPoint[]
  gullies: readonly Gully[]
}

const COLUMNS = 60
const FOOT_Y = -1
const BASE_Y = COASTAL_RIDGES_BOUNDS.minY

const RIDGES: readonly Ridge[] = [
  {
    name: 'jeju-distant-rear-ridge', back: -220, front: -151, rows: 16,
    crest: [
      [-160, -1, .42], [-124, 8, .40], [-88, 15, .43],
      [-59, 18.8, .46], [-35, 18.2, .43], [-23, 22.6, .40],
      [-8, 25.4, .38], [8, 27.6, .36], [23, 25.4, .35],
      [45, 21.5, .37], [82, 17.8, .40], [124, 10.5, .42],
      [160, -1, .44],
    ],
    gullies: [[-65, 17, -16, 1.1], [-3, 13, 19, 1.65], [65, 18, -12, 1.35]],
  },
  {
    name: 'jeju-distant-front-ridge', back: -174, front: -115, rows: 12,
    crest: [
      [-156, -1, .47], [-122, 8.5, .53], [-83, 13.7, .59],
      [-47, 16.3, .52], [-17, 14.2, .46], [12, 11.3, .44],
      [43, 12.1, .49], [75, 10.4, .56], [117, 5.5, .51],
      [150, -1, .43],
    ],
    gullies: [[-92, 14, 14, .95], [-22, 18, -20, 1.15], [76, 16, 13, .8]],
  },
]

// Tangents follow the long crest, avoiding flat shelves at control points.
function crestSample(points: readonly CrestPoint[], x: number, axis: 1 | 2) {
  let index = 0
  while (index < points.length - 2 && x > points[index + 1][0]) index++
  const a = points[index], b = points[index + 1]
  const previous = points[Math.max(0, index - 1)]
  const next = points[Math.min(points.length - 1, index + 2)]
  const span = b[0] - a[0]
  const t = (x - a[0]) / span
  const slopeA = .8 * (b[axis] - previous[axis]) / (b[0] - previous[0])
  const slopeB = .8 * (next[axis] - a[axis]) / (next[0] - a[0])
  return (2 * t ** 3 - 3 * t ** 2 + 1) * a[axis]
    + (t ** 3 - 2 * t ** 2 + t) * span * slopeA
    + (-2 * t ** 3 + 3 * t ** 2) * b[axis]
    + (t ** 3 - t ** 2) * span * slopeB
}

function ridgeHeight(ridge: Ridge, x: number, t: number) {
  const crestDepth = crestSample(ridge.crest, x, 2)
  const height = crestSample(ridge.crest, x, 1)
  const frontSlope = t >= crestDepth
  const distance = frontSlope
    ? (t - crestDepth) / (1 - crestDepth)
    : (crestDepth - t) / crestDepth
  const section = Math.cos(distance * Math.PI / 2) ** 2
  let relief = 0
  if (frontSlope) {
    // Drainage bends downslope; both crest and submerged foot remain smooth.
    const envelope = Math.sin(Math.PI * distance) ** 2
    for (const [origin, width, bend, depth] of ridge.gullies) {
      const center = origin + bend * distance * (.6 + .4 * distance)
      relief += depth * Math.exp(-(((x - center) / width) ** 2)) * envelope
    }
  }
  const exposure = Math.min(1, Math.max(0, (height - FOOT_Y) / 8))
  return FOOT_Y + (height - FOOT_Y) * section - relief * exposure
}

function buildRidge(ridge: Ridge) {
  const positions: number[] = []
  const indices: number[] = []
  const stride = COLUMNS + 1
  const minX = ridge.crest[0][0], maxX = ridge.crest[ridge.crest.length - 1][0]
  for (let row = 0; row <= ridge.rows; row++) {
    const t = row / ridge.rows
    for (let column = 0; column <= COLUMNS; column++) {
      const x = minX + (maxX - minX) * column / COLUMNS
      const boundary = row === 0 || row === ridge.rows || column === 0 || column === COLUMNS
      positions.push(x, boundary ? FOOT_Y : ridgeHeight(ridge, x, t), ridge.back + (ridge.front - ridge.back) * t)
    }
  }
  for (let row = 0; row < ridge.rows; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const a = row * stride + column, b = a + 1, c = a + stride, d = c + 1
      // +Y-facing surface, including its camera-facing (+Z) slopes.
      if ((row + column) % 2 === 0) indices.push(a, c, b, b, c, d)
      else indices.push(a, c, d, a, d, b)
    }
  }

  // Close only below the shared waterline, with matching perimeter vertices.
  const perimeter: number[] = []
  for (let row = 0; row <= ridge.rows; row++) perimeter.push(row * stride)
  for (let column = 1; column <= COLUMNS; column++) perimeter.push(ridge.rows * stride + column)
  for (let row = ridge.rows - 1; row >= 0; row--) perimeter.push(row * stride + COLUMNS)
  for (let column = COLUMNS - 1; column > 0; column--) perimeter.push(column)
  const bottomStart = positions.length / 3
  for (const vertex of perimeter) positions.push(positions[vertex * 3], BASE_Y, positions[vertex * 3 + 2])
  const bottomCenter = positions.length / 3
  positions.push((minX + maxX) / 2, BASE_Y, (ridge.back + ridge.front) / 2)
  for (let edge = 0; edge < perimeter.length; edge++) {
    const next = (edge + 1) % perimeter.length
    const a = perimeter[edge], b = perimeter[next]
    const c = bottomStart + edge, d = bottomStart + next
    indices.push(b, a, c, b, c, d, d, c, bottomCenter)
  }

  const geometry = new BufferGeometry()
  geometry.name = ridge.name
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  geometry.computeBoundingBox()
  geometry.computeBoundingSphere()
  return geometry
}

export function buildCoastalRidges(kit: CityBuilder) {
  for (const ridge of RIDGES) kit.add('cable', buildRidge(ridge), 'foliage')
}
