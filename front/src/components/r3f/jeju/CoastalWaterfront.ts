import * as THREE from 'three'
import type { CityBuilder } from '../city/CityGeometry'

type XZ = [number, number]
const WATER = 4.25
const variation = (a: number, b: number) => {
  const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return n - Math.floor(n)
}

function terrace(kit: CityBuilder, outline: XZ[], bottom: number, top: number) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)))
  const slab = new THREE.ExtrudeGeometry(shape, { depth: top - bottom, bevelEnabled: false, steps: 1 })
  slab.rotateX(-Math.PI / 2).translate(0, bottom, 0)
  kit.add('edge', slab, 'masonry')
}

function masonryFace(kit: CityBuilder, from: XZ, to: XZ, bottom: number, top: number, seed: number) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1])
  const angle = -Math.atan2(to[1] - from[1], to[0] - from[0])
  const rows = Math.ceil((top - bottom) / .48)
  const course = (top - bottom) / rows
  for (let row = 0; row < rows; row++) {
    let offset = 0, column = 0
    while (offset < length - .08) {
      const noise = variation(row + seed, column + seed * 2)
      const width = Math.min(length - offset, .46 + noise * .65)
      const h = course * (.72 + variation(column, row + seed) * .43)
      // Shallow rounded faces sit in the continuous wall, not freestanding boulder props.
      const vertices: number[] = [], indices: number[] = [], segments = 10
      for (const ring of [1, .67]) {
        for (let i = 0; i < segments; i++) {
          const theta = Math.PI * 2 * i / segments
          const radius = .91 + variation(seed + column * 7 + i, row) * .12
          const cos = Math.cos(theta), sin = Math.sin(theta)
          vertices.push(width / 2 + Math.sign(cos) * Math.abs(cos) ** .65 * width * .5 * radius * ring,
            h / 2 + Math.sign(sin) * Math.abs(sin) ** .65 * h * .5 * radius * ring, ring === 1 ? -.13 : .025 + noise * .035)
        }
      }
      vertices.push(width / 2, h / 2, .045 + noise * .035)
      for (let i = 0; i < segments; i++) {
        const j = (i + 1) % segments
        indices.push(i, j, j + segments, i, j + segments, i + segments, i + segments, j + segments, segments * 2)
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
      geometry.setIndex(indices)
      geometry.computeVertexNormals()
      geometry.translate(offset, bottom + row * course + variation(column + seed, row) * .06, 0)
      geometry.rotateY(angle).translate(from[0], 0, from[1])
      kit.add('faded', geometry, 'masonry')
      offset += width + .018
      column++
    }
  }
}

function boundary(kit: CityBuilder, points: XZ[], top: number, seed: number, thickness = .75) {
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index]
    const length = Math.hypot(b[0] - a[0], b[1] - a[1])
    const nx = -(b[1] - a[1]) / length * thickness, nz = (b[0] - a[0]) / length * thickness
    terrace(kit, [a, b, [b[0] - nx, b[1] - nz], [a[0] - nx, a[1] - nz]], 1.4, top)
    masonryFace(kit, a, b, WATER - .4, top + .04, seed + index)
  }
}

function bollard(kit: CityBuilder, x: number, z: number, y: number) {
  const profile = [[0, 0], [.47, 0], [.47, .13], [.28, .2], [.26, .76], [.48, .9], [.46, 1.02], [.3, 1.1], [0, 1.1]]
  const geometry = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(r, h)), 12)
  geometry.scale(.65, .65, .65).translate(x, y, z)
  kit.add('steel', geometry, 'sheet')
  for (const h of [.27, .38]) {
    const rope = new THREE.TorusGeometry(.29, .045, 5, 12).rotateX(Math.PI / 2)
      .translate(0, h, 0).scale(.65, .65, .65).translate(x, y, z)
    kit.add('edge', rope, 'timber')
  }
}

export const JEJU_BERTH = { position: [0, WATER, 15] as const, facing: [0, 0, -1] as const, clearance: 4 }

export function buildCoastalWaterfront(kit: CityBuilder) {
  // Floodwater overtops both courts; only the small raised arrival remains dry.
  terrace(kit, [[-32, 20], [-4.8, 20], [-4.8, 11], [-4, 0], [-6.5, -15], [-8, -24], [-9, -39], [-30, -48]], .3, 1.5)
  terrace(kit, [[2.2, -3.5], [23, -2], [35, -22], [30, -59], [2, -58], [-.5, -43], [.8, -27]], .3, 1.45)
  terrace(kit, [[-7.2, 20], [-4.8, 20], [-4.8, 11.5], [-7.2, 11.5]], 1.5, 4.65)
  masonryFace(kit, [-7.2, 20], [-4.8, 20], 3.45, 4.72, 21)
  masonryFace(kit, [-4.8, 20], [-4.8, 11.5], 3.45, 4.72, 31)
  terrace(kit, [[-6.2, 1.4], [-3.8, 1.4], [-3.8, -1.5], [-6.2, -1.5]], 1.5, 3.45)
  // Broad treads descend laterally into a protected arrival pocket.
  for (let step = 0; step < 6; step++) {
    const top = 4.72 - step * .25
    kit.box('faded', [.76, top - 1.4, 5.2], [-4.5 + step * .68, (top + 1.4) / 2, 14.6], undefined, 'masonry')
  }
  bollard(kit, -3.82, 13.2, 4.47)
  boundary(kit, [[-26, 11], [-14, 11]], 4.95, 50)
  boundary(kit, [[-10.5, 11], [-6.3, 8.5], [-5.3, 3.2]], 4.8, 57)
  boundary(kit, [[-5.8, -7], [-7.5, -14], [-8, -20]], 4.48, 63)
  boundary(kit, [[2.2, -3.5], [3.7, -3.4]], 4.85, 74)
  boundary(kit, [[6.4, -3.2], [16, -2.5]], 4.85, 80)
  boundary(kit, [[20, -2.3], [25, -2], [30, -10]], 4.7, 86)
  boundary(kit, [[1.7, -19], [.8, -25], [1.2, -31]], 4.45, 95)
  boundary(kit, [[-8.2, -28], [-8, -37], [-4.5, -41]], 4.4, 103)
  boundary(kit, [[1,-38], [7, -39]], 4.55, 112)
  for (const [x, z, width] of [[-12.2, 10.5, 3], [5.1, -2.9, 2.6]] as const) {
    for (let i = 0; i < 3; i++) {
      const top = 1.65 + i * .22
      kit.box('faded', [width, top - 1.4, .7], [x, (top + 1.4) / 2, z - i * .62], undefined, 'masonry')
    }
  }
}
