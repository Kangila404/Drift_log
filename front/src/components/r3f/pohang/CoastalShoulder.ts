import * as THREE from 'three'
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'
import type { CityBuilder, CityGeometryBatch } from '../city/CityGeometry'
import { harborPoint } from './Placement'

const noise = new ImprovedNoise()
export function coastHeight(x: number, z: number, portrait = false) {
  const coast = -35 + 5 * Math.sin(x * .04) - .08 * x
  const inland = THREE.MathUtils.smoothstep(coast - z, -8, 28)
  const shore = (4.1 + 6.6 * inland) * Math.exp(-Math.pow((z + 57) / 48, 4))
    * Math.exp(-Math.pow(x / 91, 6)) - 1.1
  const relief = noise.noise(x * .06, z * .09, 3.4) * 1.6 + noise.noise(x * .19, z * .17, 6.1) * .2
  const promontory = 2.8 * Math.exp(-Math.pow((x + 28) / 22, 4))
    * THREE.MathUtils.smoothstep(-z, 20, 33) * Math.exp(-Math.pow((z + 35) / 20, 4))
  const raw = shore + relief * inland + promontory
  // The landmark keeps a wider footprint than the compressed mobile district.
  const distance = Math.hypot((x + 22) / (6.5 * (portrait ? .83 / .45 : 1)),
    (z + 33) / (6 * (portrait ? .83 / .68 : 1)))
  return THREE.MathUtils.lerp(4.8, raw, THREE.MathUtils.smoothstep(distance, 1.15, 2))
}

export function buildCoastalShoulder(kit: CityBuilder, portrait = false) {
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const nx = 108, nz = 52
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = -112 + i * 224 / nx, z = -15 - j * 99 / nz, y = coastHeight(x, z, portrait)
    positions.push(...harborPoint(x, y, z, portrait))
    const color = new THREE.Color('#55717b').lerp(new THREE.Color('#344d65'), Math.min(1, Math.max(0, (-z - 42) / 55)))
    color.multiplyScalar(.78 + noise.noise(x * .16, z * .13, 2.7) * .16)
    colors.push(color.r, color.g, color.b)
  }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  kit.add('faded', geometry)
}

export function prepareCoastalShoulder(batches: CityGeometryBatch[]) {
  for (const { material } of batches) {
    material.color.set('#ffffff')
    material.vertexColors = true
  }
}
