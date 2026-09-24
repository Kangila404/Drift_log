import * as THREE from 'three'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import type { CityBuilder, CityGeometryBatch } from '../city/CityGeometry'

const noise = new ImprovedNoise()

// Background-only inland relief for the restored Expo composition. It stays
// behind the original buildings and does not introduce local foreground terrain.
export function buildDaejeonDistantRidges(kit: CityBuilder, portrait = false) {
  const columns = 108, rows = 26, scale = portrait ? .64 : 1
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  for (let row = 0; row <= rows; row++) {
    const z = -166 + row * 4.25
    for (let column = 0; column <= columns; column++) {
      const sourceX = -170 + column * (340 / columns)
      const x = sourceX * scale
      const rear = Math.exp(-(((z + 120) / 28) ** 2))
      const west = 11 * Math.exp(-(((sourceX + 74) / 65) ** 2))
      const middle = 16 * Math.exp(-(((sourceX + 9) / 74) ** 2))
      const east = 12 * Math.exp(-(((sourceX - 100) / 56) ** 2))
      const folds = noise.noise(sourceX * .04, z * .06, 5.4) * 2.1 + noise.noise(sourceX * .12, z * .14, 15.2) * .55
      const y = -1.8 + rear * (west + middle + east + folds)
      positions.push(x, y, z)
      const shade = THREE.MathUtils.clamp(.63 + noise.noise(sourceX * .09, z * .12, 8.6) * .12 - Math.max(0, y - 12) * .008, .42, .8)
      colors.push(shade, shade + .035, shade + .065)
    }
  }
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1
    if (Math.max(positions[a * 3 + 1], positions[b * 3 + 1], positions[c * 3 + 1], positions[d * 3 + 1]) < 3.4) continue
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  kit.add('faded', geometry, 'foliage')
}

export function prepareDaejeonDistantRidges(batches: CityGeometryBatch[]) {
  for (const { material } of batches) material.vertexColors = true
}
